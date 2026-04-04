// app/components/TradesPanel.tsx
"use client";

import { Trade } from "../../types";
import { useEffect, useRef } from "react";

interface TradesPanelProps {
  trades: Trade[];
}

const fmt = (n: number, d = 2) => Number(n).toFixed(d);
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function TradesPanel({ trades }: TradesPanelProps) {
  const prevFirstId = useRef<string | undefined>(undefined);

  useEffect(() => {
    prevFirstId.current = trades[0]?.tradeId;
  }, [trades]);

  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        display: "flex",
        flexDirection: "column",
        minWidth: 240,
      }}
    >
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid #1a1d2e",
          fontSize: 9,
          letterSpacing: 2,
          color: "#3a4060",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        RECENT TRADES
        <span className="live-dot" />
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          padding: "4px 10px",
          fontSize: 9,
          letterSpacing: 1,
          color: "#3a4060",
          borderBottom: "1px solid #12151f",
        }}
      >
        <span>PRICE</span>
        <span style={{ textAlign: "right" }}>QTY</span>
        <span style={{ textAlign: "right" }}>TIME</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
        {trades.slice(0, 60).map((t, i) => {
          const isNew = i === 0 && t.tradeId !== prevFirstId.current;
          return (
            <div
              key={t.tradeId}
              className={isNew ? "flash-trade" : ""}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "4px 10px",
                borderBottom: "1px solid #0a0c14",
                fontSize: 11,
              }}
            >
              <span style={{ color: "#ffffff", fontWeight: 600 }}>
                {fmt(t.price)}
              </span>
              <span style={{ color: "#aaa", textAlign: "right" }}>
                {fmt(t.quantity, 0)}
              </span>
              <span style={{ color: "#555", textAlign: "right", fontSize: 10 }}>
                {fmtTime(t.timestamp)}
              </span>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#333",
              fontSize: 11,
            }}
          >
            Waiting for trades…
          </div>
        )}
      </div>
    </div>
  );
}
