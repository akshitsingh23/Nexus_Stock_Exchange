"use client";

import { OrderBook } from "../../types";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DepthChartProps {
  orderBook: OrderBook;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        padding: "7px 10px",
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div style={{ color: "#7eb8ff" }}>Price: {Number(d.price).toFixed(2)}</div>
      {d.bidDepth != null && (
        <div style={{ color: "#00e5a0" }}>Bid Depth: {d.bidDepth.toFixed(0)}</div>
      )}
      {d.askDepth != null && (
        <div style={{ color: "#ff4d6d" }}>Ask Depth: {d.askDepth.toFixed(0)}</div>
      )}
    </div>
  );
}

export default function DepthChart({ orderBook }: DepthChartProps) {
  const data = useMemo(() => {
    // Cumulative bid depth (descending prices → accumulate)
    const bids = [...orderBook.bids]
      .sort((a, b) => b.price! - a.price!)
      .slice(0, 15);
    const asks = [...orderBook.asks]
      .sort((a, b) => a.price! - b.price!)
      .slice(0, 15);

    const bidPoints: Array<{ price: number; bidDepth: number }> = [];
    let cumBid = 0;
    for (const o of [...bids].reverse()) {
      cumBid += o.remainingQuantity;
      bidPoints.push({ price: o.price!, bidDepth: cumBid });
    }

    const askPoints: Array<{ price: number; askDepth: number }> = [];
    let cumAsk = 0;
    for (const o of asks) {
      cumAsk += o.remainingQuantity;
      askPoints.push({ price: o.price!, askDepth: cumAsk });
    }

    // Merge into single sorted array
    const priceMap = new Map<number, { price: number; bidDepth?: number; askDepth?: number }>();
    for (const p of bidPoints) {
      priceMap.set(p.price, { price: p.price, bidDepth: p.bidDepth });
    }
    for (const p of askPoints) {
      const existing = priceMap.get(p.price) ?? { price: p.price };
      priceMap.set(p.price, { ...existing, askDepth: p.askDepth });
    }

    return Array.from(priceMap.values()).sort((a, b) => a.price - b.price);
  }, [orderBook]);

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
        }}
      >
        MARKET DEPTH
      </div>

      <div style={{ flex: 1, padding: "8px 4px 4px 0", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="price"
              tickFormatter={(v) => Number(v).toFixed(1)}
              tick={{ fontSize: 9, fill: "#3a4060", fontFamily: "'IBM Plex Mono'" }}
              tickLine={false}
              axisLine={{ stroke: "#1a1d2e" }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#3a4060", fontFamily: "'IBM Plex Mono'" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="bidDepth"
              stroke="#00e5a0"
              strokeWidth={1.5}
              fill="url(#bidGrad)"
              dot={false}
              connectNulls={false}
            />
            <Area
              type="stepBefore"
              dataKey="askDepth"
              stroke="#ff4d6d"
              strokeWidth={1.5}
              fill="url(#askGrad)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
