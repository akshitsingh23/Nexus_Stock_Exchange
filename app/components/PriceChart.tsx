// app/components/PriceChart.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Trade } from "../../types";
import { useMemo } from "react";

interface PriceChartProps {
  trades: Trade[];
}

const fmt = (n: number) => Number(n).toFixed(2);
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div style={{ color: "#7eb8ff" }}>{fmtTime(d.timestamp)}</div>
      <div style={{ color: "#fff", fontWeight: 700 }}>{fmt(d.price)}</div>
      <div style={{ color: "#555" }}>Vol: {d.quantity}</div>
    </div>
  );
}

export default function PriceChart({ trades }: PriceChartProps) {
  // Build OHLCV-like data from trades (1-second buckets)
  const data = useMemo(() => {
    if (!trades.length) return [];
    return [...trades].reverse().slice(-80).map((t) => ({
      timestamp: t.timestamp,
      price: t.price,
      quantity: t.quantity,
    }));
  }, [trades]);

  const prices = data.map((d) => d.price);
  const min = prices.length ? Math.min(...prices) - 0.5 : 99;
  const max = prices.length ? Math.max(...prices) + 0.5 : 101;
  const isUp = prices.length >= 2 ? prices[prices.length - 1] >= prices[0] : true;
  const lineColor = isUp ? "#00e5a0" : "#ff4d6d";

  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: "1px solid #1a1d2e",
          fontSize: 9,
          letterSpacing: 2,
          color: "#3a4060",
          display: "flex",
          gap: 16,
        }}
      >
        <span>PRICE CHART</span>
        <span style={{ color: "#555" }}>ACME/USD · LAST 80 TRADES</span>
      </div>

      <div style={{ flex: 1, padding: "8px 4px 4px 0", height: 200 }}>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => fmtTime(v).slice(0, 5)}
                tick={{ fontSize: 9, fill: "#3a4060", fontFamily: "'IBM Plex Mono'" }}
                tickLine={false}
                axisLine={{ stroke: "#1a1d2e" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[min, max]}
                tick={{ fontSize: 9, fill: "#3a4060", fontFamily: "'IBM Plex Mono'" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(2)}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={1.5}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 3, fill: lineColor, stroke: "none" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3a4060",
              fontSize: 11,
            }}
          >
            Waiting for trade data…
          </div>
        )}
      </div>
    </div>
  );
}
