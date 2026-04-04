// app/components/OrderEntry.tsx
"use client";

import { useState } from "react";
import { OrderSide, OrderType, PlaceOrderPayload } from "../../types";

interface OrderEntryProps {
  onSubmit: (payload: PlaceOrderPayload) => void;
  isLoading: boolean;
  error: string | null;
  bestBid: number | null;
  bestAsk: number | null;
  userId: string;
}

export default function OrderEntry({
  onSubmit,
  isLoading,
  error,
  bestBid,
  bestAsk,
  userId,
}: OrderEntryProps) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("100.50");
  const [quantity, setQuantity] = useState("10");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    if (isNaN(qty) || qty <= 0) return;
    if (orderType === "limit" && (isNaN(px) || px <= 0)) return;

    onSubmit({
      userId,
      orderType,
      side,
      price: orderType === "limit" ? px : undefined,
      quantity: qty,
    });

    setSuccessMsg(`${side.toUpperCase()} order submitted`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const fillBestPrice = () => {
    const p = side === "buy" ? bestAsk : bestBid;
    if (p) setPrice(p.toFixed(2));
  };

  const notional =
    orderType === "limit" && price && quantity
      ? (parseFloat(price) * parseFloat(quantity)).toFixed(2)
      : null;

  const inputStyle = {
    width: "100%",
    background: "#080a12",
    border: "1px solid #1a1d2e",
    color: "#c8ccd8",
    padding: "9px 10px",
    fontSize: 14,
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none",
  } as React.CSSProperties;

  const labelStyle = {
    fontSize: 9,
    letterSpacing: 2,
    color: "#3a4060",
    marginBottom: 4,
    display: "block",
  } as React.CSSProperties;

  return (
    <div
      style={{
        background: "#0c0f1a",
        border: "1px solid #1a1d2e",
        display: "flex",
        flexDirection: "column",
        minWidth: 220,
      }}
    >
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid #1a1d2e",
          fontSize: 9,
          letterSpacing: 2,
          color: "#3a4060",
        }}
      >
        ORDER ENTRY
      </div>

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["buy", "sell"] as OrderSide[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                padding: "8px 0",
                background:
                  side === s
                    ? s === "buy"
                      ? "#0d2a1f"
                      : "#2a0d15"
                    : "#12151f",
                border: `1px solid ${side === s
                    ? s === "buy"
                      ? "#00e5a0"
                      : "#ff4d6d"
                    : "#1a1d2e"
                  }`,
                color:
                  side === s
                    ? s === "buy"
                      ? "#00e5a0"
                      : "#ff4d6d"
                    : "#555",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Order type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["limit", "market"] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                padding: "6px 0",
                background: orderType === t ? "#151a30" : "#12151f",
                border: `1px solid ${orderType === t ? "#7eb8ff" : "#1a1d2e"}`,
                color: orderType === t ? "#7eb8ff" : "#555",
                cursor: "pointer",
                fontSize: 10,
                letterSpacing: 1,
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div>
          <label style={labelStyle}>QUANTITY</label>
          <input
            style={inputStyle}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.01"
            step="1"
            placeholder="0"
          />
        </div>

        {/* Price (limit only) */}
        {orderType === "limit" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ ...labelStyle, margin: 0 }}>PRICE</label>
              <button
                onClick={fillBestPrice}
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  color: "#3a4060",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: 0,
                }}
              >
                FILL BEST
              </button>
            </div>
            <input
              style={inputStyle}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Notional / info */}
        <div
          style={{
            fontSize: 10,
            color: "#3a4060",
            padding: "6px 8px",
            background: "#080a12",
            border: "1px solid #12151f",
            minHeight: 32,
          }}
        >
          {notional ? (
            <>
              <span style={{ color: "#555" }}>NOTIONAL </span>
              <span style={{ color: "#aaa" }}>${notional}</span>
            </>
          ) : orderType === "market" ? (
            <span>Executes at best available price</span>
          ) : (
            <span>Enter price and quantity</span>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "11px",
            background: side === "buy" ? "#00e5a0" : "#ff4d6d",
            color: "#080a12",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: "'IBM Plex Mono', monospace",
            opacity: isLoading ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {isLoading
            ? "PLACING…"
            : `${side === "buy" ? "▲ BUY" : "▼ SELL"} ${orderType.toUpperCase()}`}
        </button>

        {/* Messages */}
        {error && (
          <div
            style={{
              fontSize: 10,
              color: "#ff4d6d",
              padding: "6px 8px",
              background: "#2a0d15",
              border: "1px solid #ff4d6d22",
            }}
          >
            ⚠ {error}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              fontSize: 10,
              color: "#00e5a0",
              padding: "6px 8px",
              background: "#0d2a1f",
              border: "1px solid #00e5a022",
            }}
          >
            ✓ {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
