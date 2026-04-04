// app/hooks/useSocket.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Order, OrderBook, Trade } from "../../types";

interface UseSocketReturn {
  orderBook: OrderBook;
  trades: Trade[];
  latestOrder: Order | null;
  cancelledOrderId: string | null;
  connected: boolean;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [cancelledOrderId, setCancelledOrderId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    socket.on("orderbook_update", (book: OrderBook) => {
      setOrderBook(book);
    });

    socket.on("trade_executed", (newTrades: Trade[]) => {
      setTrades((prev) => [...newTrades, ...prev].slice(0, 200));
    });

    socket.on("order_placed", (order: Order) => {
      setLatestOrder(order);
    });

    socket.on("order_cancelled", ({ orderId }: { orderId: string }) => {
      setCancelledOrderId(orderId);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { orderBook, trades, latestOrder, cancelledOrderId, connected };
}
