// /server/seed/seed.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, default: "student" },
});
const payoutSchema = new mongoose.Schema({
  tutorId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  currency: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});
const refundSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  currency: String,
  status: { type: String, default: "open" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Payout = mongoose.model("Payout", payoutSchema);
const Refund = mongoose.model("Refund", refundSchema);

export async function runSeed() {
  await User.deleteMany({});
  const admin = await User.create({
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  });
  const tutor = await User.create({
    name: "Bob Tutor",
    email: "bob@example.com",
    role: "tutor",
  });
  const student = await User.create({
    name: "Alice Student",
    email: "alice@example.com",
    role: "student",
  });

  await Payout.deleteMany({});
  await Refund.deleteMany({});

  await Payout.insertMany([
    { tutorId: tutor._id, amount: 12000, currency: "USD", status: "pending" },
    { tutorId: tutor._id, amount: 8500, currency: "EUR", status: "failed" },
    { tutorId: tutor._id, amount: 5400, currency: "USD", status: "paid" },
  ]);

  await Refund.insertMany([
    { studentId: student._id, amount: 2500, currency: "USD", status: "open" },
    { studentId: student._id, amount: 1500, currency: "EUR", status: "approved" },
  ]);

  return {
    users: await User.countDocuments(),
    payouts: await Payout.countDocuments(),
    refunds: await Refund.countDocuments(),
    adminId: admin._id,
  };
}
