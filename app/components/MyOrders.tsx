// app/components/MyOrders.tsx
"use client";

import { Order } from "@/types";

interface MyOrdersProps {
  orders: Order[];
  onCancel: (orderId: string) => void;
}

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "MKT" : Number(n).toFixed(d);

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const statusColors: Record<string, { bg: string; color: string }> = {
  open: { bg: "#0d2a1f", color: "#00e5a0" },
  partiallyFilled: { bg: "#151a30", color: "#7eb8ff" },
  filled: { bg: "#1a1a1a", color: "#555" },
  cancelled: { bg: "#2a1215", color: "#ff4d6d" },
};

export default function MyOrders({ orders, onCancel }: MyOrdersProps) {
  const cols = [
    "ORDER ID",
    "SIDE",
    "TYPE",
    "PRICE",
    "QTY",
    "REMAINING",
    "STATUS",
    "TIME",
    "",
  ];

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
        }}
      >
        MY ORDERS{" "}
        <span style={{ color: "#555" }}>
          ({orders.length})
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            whiteSpace: "nowrap",
          }}
        >
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  style={{
                    padding: "6px 12px",
                    textAlign: "left",
                    fontSize: 9,
                    letterSpacing: 1,
                    color: "#3a4060",
                    borderBottom: "1px solid #1a1d2e",
                    fontWeight: 400,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#3a4060",
                    fontSize: 11,
                  }}
                >
                  No orders placed yet
                </td>
              </tr>
            ) : (
              orders.slice(0, 20).map((o) => {
                const sc = statusColors[o.status] ?? { bg: "#111", color: "#aaa" };
                const canCancel =
                  o.status === "open" || o.status === "partiallyFilled";

                return (
                  <tr
                    key={o.orderId}
                    style={{
                      borderBottom: "1px solid #0f1220",
                    }}
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        color: "#3a4060",
                        fontSize: 10,
                      }}
                    >
                      {o.orderId}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        color: o.side === "buy" ? "#00e5a0" : "#ff4d6d",
                        fontWeight: 700,
                      }}
                    >
                      {o.side.toUpperCase()}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#aaa" }}>
                      {o.orderType.toUpperCase()}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#c8ccd8" }}>
                      {fmt(o.price)}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#aaa" }}>
                      {fmt(o.quantity, 0)}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#aaa" }}>
                      {fmt(o.remainingQuantity, 0)}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <span
                        style={{
                          padding: "2px 7px",
                          fontSize: 9,
                          letterSpacing: 1,
                          background: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        color: "#555",
                        fontSize: 10,
                      }}
                    >
                      {fmtTime(o.timestamp)}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      {canCancel && (
                        <button
                          onClick={() => onCancel(o.orderId)}
                          style={{
                            padding: "3px 9px",
                            background: "#2a0d15",
                            border: "1px solid #ff4d6d55",
                            color: "#ff4d6d",
                            fontSize: 9,
                            letterSpacing: 1,
                            cursor: "pointer",
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          CANCEL
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
