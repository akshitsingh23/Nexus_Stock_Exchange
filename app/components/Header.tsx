// app/components/Header.tsx
"use client";

import { Trade, OrderBook } from "../../types";
import { useMemo } from "react";
import Sparkline from "./Sparkline";

interface HeaderProps {
  trades: Trade[];
  orderBook: OrderBook;
  connected: boolean;
  priceHistory: number[];
}

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toFixed(d);

export default function Header({
  trades,
  orderBook,
  connected,
  priceHistory,
}: HeaderProps) {
  const stats = useMemo(() => {
    const last = trades[0]?.price ?? 100;
    const prev = trades[1]?.price ?? last;
    const change = last - prev;
    const changePct = prev !== 0 ? (change / prev) * 100 : 0;
    const vol = trades.reduce((s, t) => s + t.quantity, 0);
    const high = trades.length ? Math.max(...trades.map((t) => t.price)) : last;
    const low = trades.length ? Math.min(...trades.map((t) => t.price)) : last;
    return { last, change, changePct, vol, high, low };
  }, [trades]);

  const bestBid = orderBook.bids[0]?.price;
  const bestAsk = orderBook.asks[0]?.price;
  const spread =
    bestBid != null && bestAsk != null
      ? (bestAsk - bestBid).toFixed(2)
      : "—";

  const isUp = stats.change >= 0;

  return (
    <header
      style={{
        background: "#0a0d18",
        borderBottom: "1px solid #1a1d2e",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 32,
        flexWrap: "wrap",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#7eb8ff",
              letterSpacing: 5,
            }}
          >
            ⬡ NEXUS
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "#3a4060",
              marginTop: 2,
            }}
          >
            ELECTRONIC TRADING EXCHANGE
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#fff", letterSpacing: 2 }}>
          ACME{" "}
          <span style={{ color: "#3a4060" }}>/</span>{" "}
          <span style={{ color: "#7eb8ff" }}>USD</span>
        </div>
      </div>

      {/* Price */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 1,
            lineHeight: 1,
          }}
        >
          {fmt(stats.last)}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isUp ? "#00e5a0" : "#ff4d6d",
          }}
        >
          {isUp ? "▲" : "▼"} {fmt(Math.abs(stats.change))}{" "}
          <span style={{ fontSize: 11, fontWeight: 400 }}>
            ({fmt(Math.abs(stats.changePct), 2)}%)
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={priceHistory} color={isUp ? "#00e5a0" : "#ff4d6d"} width={140} height={40} />

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, auto)",
          gap: "4px 24px",
          fontSize: 11,
        }}
      >
        {[
          { label: "BID", value: fmt(bestBid), color: "#00e5a0" },
          { label: "ASK", value: fmt(bestAsk), color: "#ff4d6d" },
          { label: "SPREAD", value: spread, color: "#aaa" },
          { label: "HIGH", value: fmt(stats.high), color: "#aaa" },
          { label: "LOW", value: fmt(stats.low), color: "#aaa" },
          { label: "VOLUME", value: fmt(stats.vol, 0), color: "#7eb8ff" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", gap: 6 }}>
            <span style={{ color: "#3a4060" }}>{label}</span>
            <span style={{ color, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Connection status */}
      <div
        style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: connected ? "#00e5a0" : "#ff4d6d",
            display: "inline-block",
            animation: connected ? "pulse-dot 1.5s infinite" : "none",
          }}
        />
        <span style={{ fontSize: 10, color: "#3a4060", letterSpacing: 1 }}>
          {connected ? "LIVE" : "CONNECTING…"}
        </span>
      </div>
    </header>
  );
}
