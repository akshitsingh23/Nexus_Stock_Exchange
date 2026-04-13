// app/api/trades/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TradeModel from "@/lib/models/Trade";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  // Try in-memory first (fast path via custom server)
  const nexus = (global as any).__nexus;
  if (nexus) {
    const trades = nexus.getTrades().slice(0, limit);
    return NextResponse.json({ trades, count: trades.length });
  }

  // Fallback to MongoDB
  try {
    await connectDB();
    const trades = await TradeModel.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return NextResponse.json({ trades, count: trades.length });
  } catch (err) {
    console.error("[DB] Trades query error:", err);
    return NextResponse.json({ trades: [], count: 0 });
  }
}
