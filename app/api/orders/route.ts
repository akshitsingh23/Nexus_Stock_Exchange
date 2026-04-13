// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import OrderModel from "../../../lib/models/Order";
import TradeModel from "../../../lib/models/Trade";
import { PlaceOrderPayload } from "../../../types";

// Rate limiting (simple in-memory, per IP)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 20; // orders per window
const RATE_WINDOW = 10_000; // 10 seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 20 orders per 10 seconds." },
      { status: 429 }
    );
  }

  let body: PlaceOrderPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, orderType, side, price, quantity } = body;

  // Validation
  if (!userId || !orderType || !side || !quantity) {
    return NextResponse.json(
      { error: "Missing required fields: userId, orderType, side, quantity" },
      { status: 400 }
    );
  }
  if (!["limit", "market"].includes(orderType)) {
    return NextResponse.json({ error: "Invalid orderType" }, { status: 400 });
  }
  if (!["buy", "sell"].includes(side)) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }
  if (orderType === "limit" && (!price || Number(price) <= 0)) {
    return NextResponse.json(
      { error: "Limit orders require a positive price" },
      { status: 400 }
    );
  }
  if (Number(quantity) <= 0) {
    return NextResponse.json(
      { error: "Quantity must be positive" },
      { status: 400 }
    );
  }

  // Use the global nexus engine (set up by custom server)
  const nexus = (global as any).__nexus;
  if (!nexus) {
    return NextResponse.json(
      { error: "Exchange engine not available" },
      { status: 503 }
    );
  }

  const result = nexus.placeOrder({ userId, orderType, side, price, quantity });

  // Persist to MongoDB (fire-and-forget, don't block the response)
  connectDB()
    .then(async () => {
      try {
        // Upsert the final order
        await OrderModel.findOneAndUpdate(
          { orderId: result.finalOrder.orderId },
          result.finalOrder,
          { upsert: true, new: true }
        );
        // Save trades
        if (result.trades.length > 0) {
          await TradeModel.insertMany(result.trades, { ordered: false }).catch(
            () => {}
          );
        }
      } catch (dbErr) {
        console.error("[DB] Persist error:", dbErr);
      }
    })
    .catch((err) => console.error("[DB] Connect error:", err));

  return NextResponse.json(result, { status: 201 });
}

export async function GET() {
  const nexus = (global as any).__nexus;
  if (!nexus) {
    return NextResponse.json({ orders: [] });
  }

  // Return last 50 orders from in-memory state
  // For a production system you'd query MongoDB with pagination
  try {
    await connectDB();
    const orders = await OrderModel.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
