// lib/models/Trade.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { Trade } from "../../types";

export type TradeDocument = Trade & Document;

const TradeSchema = new Schema<TradeDocument>(
  {
    tradeId: { type: String, required: true, unique: true, index: true },
    buyOrderId: { type: String, required: true, index: true },
    sellOrderId: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    timestamp: { type: Number, required: true, index: true },
  },
  { versionKey: false }
);

const TradeModel: Model<TradeDocument> =
  mongoose.models.Trade ||
  mongoose.model<TradeDocument>("Trade", TradeSchema);

export default TradeModel;
