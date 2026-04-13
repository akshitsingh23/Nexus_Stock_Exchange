// lib/models/Order.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { Order } from "../../types";

export type OrderDocument = Order & Document;

const OrderSchema = new Schema<OrderDocument>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    orderType: { type: String, enum: ["limit", "market"], required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    price: { type: Number, default: null },
    quantity: { type: Number, required: true },
    remainingQuantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ["open", "partiallyFilled", "filled", "cancelled"],
      default: "open",
      index: true,
    },
    timestamp: { type: Number, required: true },
  },
  { versionKey: false }
);

// Compound index for orderbook queries
OrderSchema.index({ status: 1, side: 1, price: 1, timestamp: 1 });

const OrderModel: Model<OrderDocument> =
  mongoose.models.Order ||
  mongoose.model<OrderDocument>("Order", OrderSchema);

export default OrderModel;
