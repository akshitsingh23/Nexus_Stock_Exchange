// app/components/ExchangeClient.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Order, Trade } from "../../types";
import { useSocket } from "../hooks/useSocket";
import { useOrders } from "../hooks/useOrders";
import Header from "./Header";
import OrderEntry from "./OrderEntry";
import OrderBookPanel from "./OrderBookPanel";
import TradesPanel from "./TradesPanel";
import MyOrders from "./MyOrders";
import ActivityFeed, { FeedEvent } from "./ActivityFeed";
import PriceChart from "./PriceChart";
import DepthChart from "./DepthChart";

// Stable user ID for this session
const SESSION_USER_ID = `USR-${uuidv4().slice(0, 6).toUpperCase()}`;

export default function ExchangeClient() {
  const { orderBook, trades, latestOrder, cancelledOrderId, connected } =
    useSocket();

  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([100]);

  const addFeedEvent = useCallback(
    (msg: string, type: FeedEvent["type"]) => {
      setFeedEvents((prev) =>
        [
          { id: uuidv4(), message: msg, type, timestamp: Date.now() },
          ...prev,
        ].slice(0, 60)
      );
    },
    []
  );

  const { myOrders, placeOrder, cancelOrder, isPlacing, error } = useOrders(
    (order: Order) => {
      addFeedEvent(
        `Order ${order.orderId} placed — ${order.side.toUpperCase()} ${order.quantity} @ ${
          order.price ?? "MKT"
        }`,
        "order"
      );
    }
  );

  // Track price history from incoming trades
  useEffect(() => {
    if (trades.length > 0) {
      const latest = trades[0].price;
      setPriceHistory((prev) => [...prev, latest].slice(-120));
    }
  }, [trades]);

  // Announce new trades via feed
  const lastTradeId = trades[0]?.tradeId;
  useEffect(() => {
    if (!lastTradeId) return;
    const t = trades[0];
    addFeedEvent(
      `Trade executed — ${t.quantity} @ ${t.price.toFixed(2)} [${t.tradeId}]`,
      "trade"
    );
  }, [lastTradeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Announce cancellations
  useEffect(() => {
    if (cancelledOrderId) {
      addFeedEvent(`Order ${cancelledOrderId} cancelled`, "cancel");
    }
  }, [cancelledOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // System connected event
  useEffect(() => {
    if (connected) {
      addFeedEvent("WebSocket connected — order book live", "system");
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastPrice = trades[0]?.price ?? priceHistory[priceHistory.length - 1] ?? 100;
  const prevPrice = trades[1]?.price ?? lastPrice;
  const priceChange = lastPrice - prevPrice;

  const bestBid = orderBook.bids[0]?.price ?? null;
  const bestAsk = orderBook.asks[0]?.price ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header
        trades={trades}
        orderBook={orderBook}
        connected={connected}
        priceHistory={priceHistory}
      />

      {/* Main layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 260px 1fr 220px",
          gridTemplateRows: "auto auto auto",
          gap: 1,
          flex: 1,
          background: "#080a12",
          padding: 1,
        }}
      >
        {/* Col 1: Order Entry */}
        <div style={{ gridRow: "1 / 3" }}>
          <OrderEntry
            onSubmit={placeOrder}
            isLoading={isPlacing}
            error={error}
            bestBid={bestBid}
            bestAsk={bestAsk}
            userId={SESSION_USER_ID}
          />
        </div>

        {/* Col 2: Order Book */}
        <div style={{ gridRow: "1 / 3" }}>
          <OrderBookPanel
            orderBook={orderBook}
            lastPrice={lastPrice}
            priceChange={priceChange}
          />
        </div>

        {/* Col 3: Charts */}
        <div
          style={{
            gridRow: "1 / 2",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <PriceChart trades={trades} />
          <DepthChart orderBook={orderBook} />
        </div>

        {/* Col 4: Trades */}
        <div style={{ gridRow: "1 / 3" }}>
          <TradesPanel trades={trades} />
        </div>

        {/* Row 2 Col 3: Activity feed */}
        <div style={{ gridRow: "2 / 3", gridColumn: "3 / 4" }}>
          <ActivityFeed events={feedEvents} />
        </div>

        {/* Row 3: My Orders (full width) */}
        <div style={{ gridColumn: "1 / -1" }}>
          <MyOrders orders={myOrders} onCancel={cancelOrder} />
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: "8px 20px",
          borderTop: "1px solid #1a1d2e",
          background: "#0a0d18",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#3a4060",
          letterSpacing: 1,
        }}
      >
        <span>NEXUS ELECTRONIC TRADING EXCHANGE · ACME/USD</span>
        <span>SESSION: {SESSION_USER_ID}</span>
        <span>
          {connected ? (
            <span style={{ color: "#00e5a0" }}>● CONNECTED</span>
          ) : (
            <span style={{ color: "#ff4d6d" }}>● DISCONNECTED</span>
          )}
        </span>
      </footer>
    </div>
  );
}
