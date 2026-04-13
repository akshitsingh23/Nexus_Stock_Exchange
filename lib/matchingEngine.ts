// lib/matchingEngine.ts
/**
 * NEXUS Matching Engine
 * Implements price-time priority (FIFO within same price level).
 * Supports limit orders, market orders, and partial fills.
 * Operates entirely in-memory; callers are responsible for DB persistence.
 */

import { v4 as uuidv4 } from "uuid";
import { Order, Trade, OrderBook, MatchResult, PlaceOrderPayload } from "@/types";

// ─── Order Factory ────────────────────────────────────────────────────────────

export function createOrder(payload: PlaceOrderPayload): Order {
  const { userId, orderType, side, price, quantity } = payload;
  return {
    orderId: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
    userId,
    orderType,
    side,
    price: orderType === "market" ? null : Number(price),
    quantity: Number(quantity),
    remainingQuantity: Number(quantity),
    status: "open",
    timestamp: Date.now(),
  };
}

// ─── Matching Logic ───────────────────────────────────────────────────────────

export function matchOrder(newOrder: Order, book: OrderBook): MatchResult {
  const trades: Trade[] = [];
  const updatedCounterparties = new Map<string, Order>();

  let order: Order = { ...newOrder };

  const isBuy = order.side === "buy";

  // Work on a copy of the opposite side
  const oppositeSide: Order[] = isBuy
    ? [...book.asks]
    : [...book.bids];

  // Sort by price-time priority
  // Asks: ascending price (cheapest first), then FIFO
  // Bids: descending price (highest first), then FIFO
  const sorted = oppositeSide
    .filter((o) => o.status === "open" || o.status === "partiallyFilled")
    .sort((a, b) =>
      isBuy
        ? a.price! - b.price! || a.timestamp - b.timestamp
        : b.price! - a.price! || a.timestamp - b.timestamp
    );

  for (const contra of sorted) {
    if (order.remainingQuantity <= 0) break;

    // Check if prices cross
    const canMatch =
      order.orderType === "market" ||
      (isBuy
        ? order.price! >= contra.price!
        : order.price! <= contra.price!);

    if (!canMatch) break;

    const execQty = Math.min(order.remainingQuantity, contra.remainingQuantity);
    const execPrice = contra.price!; // Price improvement: trade at resting order price

    const trade: Trade = {
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
      status:
        order.remainingQuantity - execQty <= 0 ? "filled" : "partiallyFilled",
    };

    const updatedContra: Order = {
      ...contra,
      remainingQuantity: contra.remainingQuantity - execQty,
      status:
        contra.remainingQuantity - execQty <= 0 ? "filled" : "partiallyFilled",
    };

    updatedCounterparties.set(contra.orderId, updatedContra);
  }

  // Rebuild order book applying updates and removing fully filled orders
  const applyUpdates = (list: Order[]): Order[] =>
    list
      .map((o) => updatedCounterparties.get(o.orderId) ?? o)
      .filter((o) => o.status !== "filled" && o.status !== "cancelled");

  let newBids = isBuy ? [...book.bids] : applyUpdates(book.bids);
  let newAsks = isBuy ? applyUpdates(book.asks) : [...book.asks];

  // Add the remaining order to the book if it still has quantity (limit only)
  if (order.remainingQuantity > 0 && order.orderType !== "market") {
    if (isBuy) {
      newBids = [...newBids, order];
    } else {
      newAsks = [...newAsks, order];
    }
  }

  // Re-sort the book
  newBids.sort((a, b) => b.price! - a.price! || a.timestamp - b.timestamp);
  newAsks.sort((a, b) => a.price! - b.price! || a.timestamp - b.timestamp);

  const finalOrder: Order = {
    ...order,
    // If market order executed everything, mark filled; if nothing, mark cancelled
    status:
      order.remainingQuantity <= 0
        ? "filled"
        : order.orderType === "market" && trades.length === 0
        ? "cancelled"
        : order.status,
  };

  return {
    orderBook: { bids: newBids, asks: newAsks },
    trades,
    finalOrder,
  };
}

// ─── In-Memory Order Book State ───────────────────────────────────────────────
// This is used by the custom server which holds authoritative state.
// Next.js API routes read from / write to this via the server module.

let _orderBook: OrderBook = { bids: [], asks: [] };

export function getOrderBook(): OrderBook {
  return _orderBook;
}

export function setOrderBook(book: OrderBook): void {
  _orderBook = book;
}

export function cancelOrderFromBook(orderId: string): boolean {
  const bidIdx = _orderBook.bids.findIndex((o) => o.orderId === orderId);
  const askIdx = _orderBook.asks.findIndex((o) => o.orderId === orderId);

  if (bidIdx !== -1) {
    _orderBook.bids[bidIdx] = { ..._orderBook.bids[bidIdx], status: "cancelled" };
    _orderBook.bids.splice(bidIdx, 1);
    return true;
  }
  if (askIdx !== -1) {
    _orderBook.asks[askIdx] = { ..._orderBook.asks[askIdx], status: "cancelled" };
    _orderBook.asks.splice(askIdx, 1);
    return true;
  }
  return false;
}

// Seed the book with some initial liquidity for a realistic demo
export function seedOrderBook(): void {
  const mid = 100;
  const seededBids: Order[] = [];
  const seededAsks: Order[] = [];

  for (let i = 0; i < 10; i++) {
    const bidPrice = parseFloat((mid - 0.5 - i * 0.25 + Math.random() * 0.1).toFixed(2));
    const askPrice = parseFloat((mid + 0.5 + i * 0.25 + Math.random() * 0.1).toFixed(2));

    seededBids.push(
      createOrder({
        userId: "SEED",
        orderType: "limit",
        side: "buy",
        price: bidPrice,
        quantity: parseFloat((5 + Math.random() * 30).toFixed(0)),
      })
    );
    seededAsks.push(
      createOrder({
        userId: "SEED",
        orderType: "limit",
        side: "sell",
        price: askPrice,
        quantity: parseFloat((5 + Math.random() * 30).toFixed(0)),
      })
    );
  }

  seededBids.sort((a, b) => b.price! - a.price!);
  seededAsks.sort((a, b) => a.price! - b.price!);

  _orderBook = { bids: seededBids, asks: seededAsks };
}
