// server/models/Payout.js
import mongoose from "mongoose";

const payoutSchema =
  mongoose.schemas?.Payout ||
  new mongoose.Schema(
    {
      tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      amount: { type: Number, required: true }, // cents
      currency: { type: String, default: "USD" },
      status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
  );

export default mongoose.models.Payout || mongoose.model("Payout", payoutSchema);
