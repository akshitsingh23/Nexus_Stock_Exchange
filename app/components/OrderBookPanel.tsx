"use client";

import { Order, OrderBook } from "@/types";
import { useState, useEffect } from "react";

interface OrderBookPanelProps {
  orderBook: OrderBook;
  lastPrice: number;
  priceChange: number;
}

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toFixed(d);

function BookRow({
  order,
  side,
  maxQty,
}: {
  order: Order;
  side: "bid" | "ask";
  maxQty: number;
}) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [order.remainingQuantity]);

  const depthPct = Math.min(100, (order.remainingQuantity / maxQty) * 100);
  const color = side === "bid" ? "#00e5a0" : "#ff4d6d";
  const bgColor =
    side === "bid" ? "rgba(0,229,160,0.07)" : "rgba(255,77,109,0.07)";
  const flashBg =
    side === "bid" ? "rgba(0,229,160,0.2)" : "rgba(255,77,109,0.2)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: "3px 8px",
        position: "relative",
        overflow: "hidden",
        fontSize: 11,
        transition: "background 0.4s",
        background: flash ? flashBg : "transparent",
        cursor: "default",
      }}
    >
      {/* Depth bar */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: `${depthPct}%`,
          background: bgColor,
          transition: "width 0.4s ease",
          pointerEvents: "none",
        }}
      />
      <span style={{ color, fontWeight: 600, position: "relative" }}>
        {fmt(order.price)}
      </span>
      <span
        style={{ color: "#aaa", textAlign: "right", position: "relative" }}
      >
        {fmt(order.remainingQuantity, 0)}
      </span>
      <span
        style={{ color: "#555", textAlign: "right", position: "relative" }}
      >
        {fmt((order.price ?? 0) * order.remainingQuantity, 0)}
      </span>
    </div>
  );
}

export default function OrderBookPanel({
  orderBook,
  lastPrice,
  priceChange,
}: OrderBookPanelProps) {
  const visibleAsks = orderBook.asks.slice(0, 10);
  const visibleBids = orderBook.bids.slice(0, 10);

  const maxQty = Math.max(
    ...visibleBids.map((o) => o.remainingQuantity),
    ...visibleAsks.map((o) => o.remainingQuantity),
    1
  );

  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        display: "flex",
        flexDirection: "column",
        minWidth: 260,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 8px 8px",
          borderBottom: "1px solid #1a1d2e",
          fontSize: 9,
          letterSpacing: 2,
          color: "#3a4060",
        }}
      >
        ORDER BOOK
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          padding: "4px 8px",
          fontSize: 9,
          letterSpacing: 1,
          color: "#3a4060",
          borderBottom: "1px solid #12151f",
        }}
      >
        <span>PRICE</span>
        <span style={{ textAlign: "right" }}>QTY</span>
        <span style={{ textAlign: "right" }}>TOTAL</span>
      </div>

      {/* Asks (reversed: worst to best) */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 220 }}>
        {[...visibleAsks].reverse().map((o) => (
          <BookRow key={o.orderId} order={o} side="ask" maxQty={maxQty} />
        ))}
      </div>

      {/* Mid price */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          borderTop: "1px solid #1a1d2e",
          borderBottom: "1px solid #1a1d2e",
          background: "#080a12",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          {fmt(lastPrice)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: priceChange >= 0 ? "#00e5a0" : "#ff4d6d",
            fontWeight: 700,
          }}
        >
          {priceChange >= 0 ? "▲" : "▼"} {fmt(Math.abs(priceChange))}
        </span>
        <span style={{ fontSize: 9, color: "#3a4060", letterSpacing: 1 }}>
          LAST
        </span>
      </div>

      {/* Bids */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 220 }}>
        {visibleBids.map((o) => (
          <BookRow key={o.orderId} order={o} side="bid" maxQty={maxQty} />
        ))}
      </div>
    </div>
  );
}
