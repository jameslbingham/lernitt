// server/models/Refund.js
import mongoose from "mongoose";

const refundSchema =
  mongoose.schemas?.Refund ||
  new mongoose.Schema(
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      amount: { type: Number, required: true }, // cents
      currency: { type: String, default: "USD" },
      status: {
        type: String,
        enum: ["open", "approved", "denied", "refunded", "cancelled"],
        default: "open",
      },
      note: String,
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
  );

export default mongoose.models.Refund || mongoose.model("Refund", refundSchema);
