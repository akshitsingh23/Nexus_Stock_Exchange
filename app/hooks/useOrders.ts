"use client";

import { useState, useEffect, useCallback } from "react";
import { Order, PlaceOrderPayload } from "../../types";

interface UseOrdersReturn {
  myOrders: Order[];
  placeOrder: (payload: PlaceOrderPayload) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  isPlacing: boolean;
  error: string | null;
}

export function useOrders(
  onOrderPlaced?: (order: Order) => void
): UseOrdersReturn {
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = useCallback(
    async (payload: PlaceOrderPayload) => {
      setIsPlacing(true);
      setError(null);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to place order");

        const { finalOrder } = data;
        setMyOrders((prev) => {
          const idx = prev.findIndex((o) => o.orderId === finalOrder.orderId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = finalOrder;
            return updated;
          }
          return [finalOrder, ...prev].slice(0, 50);
        });
        onOrderPlaced?.(finalOrder);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsPlacing(false);
      }
    },
    [onOrderPlaced]
  );

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel order");
      }
      setMyOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId ? { ...o, status: "cancelled" } : o
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  return { myOrders, placeOrder, cancelOrder, isPlacing, error };
}
