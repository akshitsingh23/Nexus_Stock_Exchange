// app/api/orderbook/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const nexus = (global as any).__nexus;
  if (!nexus) {
    return NextResponse.json(
      { bids: [], asks: [] },
      { status: 200 }
    );
  }

  const book = nexus.getOrderBook();

  // Return top 20 levels for each side
  return NextResponse.json({
    bids: book.bids.slice(0, 20),
    asks: book.asks.slice(0, 20),
    timestamp: Date.now(),
  });
}
