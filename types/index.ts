// types/index.ts

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market";
export type OrderStatus =
  | "open"
  | "partiallyFilled"
  | "filled"
  | "cancelled";

export interface Order {
  orderId: string;
  userId: string;
  orderType: OrderType;
  side: OrderSide;
  price: number | null; // null for market orders
  quantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  timestamp: number;
}

export interface Trade {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface OrderBook {
  bids: Order[]; // sorted descending price
  asks: Order[]; // sorted ascending price
}

export interface MatchResult {
  orderBook: OrderBook;
  trades: Trade[];
  finalOrder: Order;
}

export interface PlaceOrderPayload {
  userId: string;
  orderType: OrderType;
  side: OrderSide;
  price?: number;
  quantity: number;
}

export interface SocketEvents {
  // server → client
  orderbook_update: OrderBook;
  trade_executed: Trade[];
  order_cancelled: { orderId: string };
  order_placed: Order;
  // client → server
  subscribe_orderbook: void;
}
