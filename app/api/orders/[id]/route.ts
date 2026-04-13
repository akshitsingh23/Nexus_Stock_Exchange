// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OrderModel from "@/lib/models/Order";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const nexus = (global as any).__nexus;
  if (!nexus) {
    return NextResponse.json(
      { error: "Exchange engine not available" },
      { status: 503 }
    );
  }

  const cancelled = nexus.cancelOrder(orderId);

  if (!cancelled) {
    return NextResponse.json(
      { error: "Order not found or already filled/cancelled" },
      { status: 404 }
    );
  }

  // Persist status change
  connectDB()
    .then(() =>
      OrderModel.findOneAndUpdate(
        { orderId },
        { status: "cancelled" },
        { new: true }
      )
    )
    .catch((err) => console.error("[DB] Cancel persist error:", err));

  return NextResponse.json({ success: true, orderId });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  try {
    await connectDB();
    const order = await OrderModel.findOne({ orderId }).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
