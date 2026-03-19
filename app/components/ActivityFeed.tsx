// app/components/ActivityFeed.tsx
"use client";

import { useEffect, useRef } from "react";

export interface FeedEvent {
  id: string;
  message: string;
  type: "trade" | "order" | "cancel" | "system";
  timestamp: number;
}

interface ActivityFeedProps {
  events: FeedEvent[];
}

const typeColors: Record<string, string> = {
  trade: "#00e5a0",
  order: "#7eb8ff",
  cancel: "#ff4d6d",
  system: "#3a4060",
};

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        display: "flex",
        flexDirection: "column",
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
          alignItems: "center",
          gap: 8,
        }}
      >
        ACTIVITY FEED
        <span className="live-dot" />
      </div>

      <div
        ref={listRef}
        style={{
          maxHeight: 110,
          overflowY: "auto",
          padding: "6px 0",
        }}
      >
        {events.slice(0, 40).map((e) => (
          <div
            key={e.id}
            className="slide-in"
            style={{
              display: "flex",
              gap: 10,
              padding: "3px 14px",
              fontSize: 11,
              borderBottom: "1px solid #0a0c14",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#2a2d3a", fontSize: 10, minWidth: 64 }}>
              {fmtTime(e.timestamp)}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: typeColors[e.type],
                flexShrink: 0,
              }}
            />
            <span style={{ color: typeColors[e.type] }}>{e.message}</span>
          </div>
        ))}

        {events.length === 0 && (
          <div
            style={{
              padding: "12px 14px",
              color: "#2a2d3a",
              fontSize: 11,
            }}
          >
            Awaiting activity…
          </div>
        )}
      </div>
    </div>
  );
}
