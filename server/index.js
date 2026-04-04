// server/index.js
/**
 * Custom Next.js server with Express + Socket.IO
 * Run with: node server/index.js  (or npm run dev)
 *
 * Why a custom server?
 *   Next.js API routes don't support persistent WebSocket connections.
 *   We attach Socket.IO to the same HTTP server that serves Next.js pages.
 */

require("dotenv").config({ path: ".env.local" });

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── In-process shared state ──────────────────────────────────────────────────
// We keep the matching engine and recent trades in-process so that
// Socket.IO can broadcast immediately on every order event.

const { v4: uuidv4 } = require("uuid");

let orderBook = { bids: [], asks: [] };
let recentTrades = [];
let io = null; // set after server starts

// ─── Matching Engine (duplicated in JS for the custom server) ─────────────────

function createOrder({ userId, orderType, side, price, quantity }) {
  return {
    orderId: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
    userId,
    orderType,
    side,
    price: orderType === "market" ? null : parseFloat(price),
    quantity: parseFloat(quantity),
    remainingQuantity: parseFloat(quantity),
    status: "open",
    timestamp: Date.now(),
  };
}

function matchOrder(newOrder, book) {
  const trades = [];
  const updatedCounterparties = new Map();
  let order = { ...newOrder };
  const isBuy = order.side === "buy";

  const oppositeSide = isBuy ? [...book.asks] : [...book.bids];

  const sorted = oppositeSide
    .filter((o) => o.status === "open" || o.status === "partiallyFilled")
    .sort((a, b) =>
      isBuy
        ? a.price - b.price || a.timestamp - b.timestamp
        : b.price - a.price || a.timestamp - b.timestamp
    );

  for (const contra of sorted) {
    if (order.remainingQuantity <= 0) break;

    const canMatch =
      order.orderType === "market" ||
      (isBuy ? order.price >= contra.price : order.price <= contra.price);

    if (!canMatch) break;

    const execQty = Math.min(order.remainingQuantity, contra.remainingQuantity);
    const execPrice = contra.price;

    const trade = {
      tradeId: `TRD-${uuidv4().slice(0, 8).toUpperCase()}`,
      buyOrderId: isBuy ? order.orderId : contra.orderId,
      sellOrderId: isBuy ? contra.orderId : order.orderId,
      price: execPrice,
      quantity: execQty,
      timestamp: Date.now(),
    };

    trades.push(trade);

    order = {
      ...order,
      remainingQuantity: order.remainingQuantity - execQty,
      status: order.remainingQuantity - execQty <= 0 ? "filled" : "partiallyFilled",
    };

    updatedCounterparties.set(contra.orderId, {
      ...contra,
      remainingQuantity: contra.remainingQuantity - execQty,
      status: contra.remainingQuantity - execQty <= 0 ? "filled" : "partiallyFilled",
    });
  }

  const applyUpdates = (list) =>
    list
      .map((o) => updatedCounterparties.get(o.orderId) ?? o)
      .filter((o) => o.status !== "filled" && o.status !== "cancelled");

  let newBids = isBuy ? [...book.bids] : applyUpdates(book.bids);
  let newAsks = isBuy ? applyUpdates(book.asks) : [...book.asks];

  if (order.remainingQuantity > 0 && order.orderType !== "market") {
    if (isBuy) newBids = [...newBids, order];
    else newAsks = [...newAsks, order];
  }

  newBids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
  newAsks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);

  const finalOrder = {
    ...order,
    status:
      order.remainingQuantity <= 0
        ? "filled"
        : order.orderType === "market" && trades.length === 0
        ? "cancelled"
        : order.status,
  };

  return { orderBook: { bids: newBids, asks: newAsks }, trades, finalOrder };
}

// ─── Seed ────────────────────────────────────────────────────────────────────

function seedOrderBook() {
  const mid = 100;
  const bids = [];
  const asks = [];
  for (let i = 0; i < 10; i++) {
    const bidPrice = parseFloat((mid - 0.5 - i * 0.25 + Math.random() * 0.1).toFixed(2));
    const askPrice = parseFloat((mid + 0.5 + i * 0.25 + Math.random() * 0.1).toFixed(2));
    bids.push(createOrder({ userId: "SEED", orderType: "limit", side: "buy", price: bidPrice, quantity: Math.floor(5 + Math.random() * 30) }));
    asks.push(createOrder({ userId: "SEED", orderType: "limit", side: "sell", price: askPrice, quantity: Math.floor(5 + Math.random() * 30) }));
  }
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
  orderBook = { bids, asks };
}

seedOrderBook();

// ─── Public API used by Next.js API routes ────────────────────────────────────

global.__nexus = {
  getOrderBook: () => orderBook,
  getTrades: () => recentTrades,
  placeOrder: (payload) => {
    const order = createOrder(payload);
    const result = matchOrder(order, orderBook);
    orderBook = result.orderBook;
    if (result.trades.length > 0) {
      recentTrades = [...result.trades, ...recentTrades].slice(0, 200);
    }
    // Broadcast to all WS clients
    if (io) {
      io.emit("orderbook_update", orderBook);
      if (result.trades.length > 0) {
        io.emit("trade_executed", result.trades);
      }
      io.emit("order_placed", result.finalOrder);
    }
    return result;
  },
  cancelOrder: (orderId) => {
    const bidIdx = orderBook.bids.findIndex((o) => o.orderId === orderId);
    const askIdx = orderBook.asks.findIndex((o) => o.orderId === orderId);

    if (bidIdx === -1 && askIdx === -1) return false;

    if (bidIdx !== -1) orderBook.bids.splice(bidIdx, 1);
    if (askIdx !== -1) orderBook.asks.splice(askIdx, 1);

    if (io) {
      io.emit("orderbook_update", orderBook);
      io.emit("order_cancelled", { orderId });
    }
    return true;
  },
};

// ─── Market Simulator Bot ─────────────────────────────────────────────────────

function runBot() {
  setInterval(() => {
    const lastTrade = recentTrades[0];
    const mid = lastTrade?.price ?? (orderBook.bids[0]?.price ?? 100 + (orderBook.asks[0]?.price ?? 100)) / 2;
    const side = Math.random() > 0.5 ? "buy" : "sell";
    const drift = (Math.random() - 0.5) * 0.4;
    const price =
      side === "buy"
        ? parseFloat((mid - 0.3 + drift).toFixed(2))
        : parseFloat((mid + 0.3 + drift).toFixed(2));

    global.__nexus.placeOrder({
      userId: "BOT",
      orderType: "limit",
      side,
      price,
      quantity: Math.floor(1 + Math.random() * 10),
    });
  }, 2000);
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────

app.prepare().then(() => {
  const expressApp = require("express")();
  const server = createServer(expressApp);

  // Attach Socket.IO
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Send current state on connect
    socket.emit("orderbook_update", orderBook);
    socket.emit("trade_executed", recentTrades.slice(0, 50));

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // Delegate everything to Next.js
  expressApp.all("*", (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`\n🚀 NEXUS Exchange running on http://localhost:${port}`);
    console.log(`   WebSocket: ws://localhost:${port}`);
    console.log(`   MongoDB:   ${process.env.MONGODB_URI || "mongodb://localhost:27017/nexus-exchange"}\n`);
    runBot();
  });
});
