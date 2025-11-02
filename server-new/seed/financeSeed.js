// /server/seed/financeSeed.js
// Creates sample tutors, lessons, payouts, and refunds for Finance dashboard testing.

const path = require("path");

// Load env from /server/.env explicitly (works no matter where you run the script)
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  override: true,
});

// Safety check: fail fast if missing URI
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing. Expected in /server/.env");
  process.exit(1);
}

const mongoose = require("mongoose");

const User = require("../models/User");
const Lesson = require("../models/Lesson");
const Payout = require("../models/Payout");
const Refund = require("../models/Refund");

async function seedFinance() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Clear old finance data (optional for testing)
  await Promise.all([Payout.deleteMany({}), Refund.deleteMany({}), Lesson.deleteMany({})]);

  // Create sample users
  const tutor = await User.create({
    name: "Bob Tutor",
    email: "bob.tutor@example.com",
    password: "hashedpassword",
    isAdmin: false,
  });

  const student = await User.create({
    name: "Alice Student",
    email: "alice.student@example.com",
    password: "hashedpassword",
    isAdmin: false,
  });

  console.log("👩‍🏫 Created tutor and student");

  // Create lessons
  const lessons = await Lesson.insertMany(
    Array.from({ length: 5 }).map((_, i) => ({
      tutor: tutor._id,
      student: student._id,
      subject: "English",
      startTime: new Date(Date.now() - i * 86400000),
      endTime: new Date(Date.now() - i * 86400000 + 3600000),
      price: 20 + i * 5,
      currency: "EUR",
      status: "completed",
      isPaid: true,
    }))
  );

  console.log(`📘 Created ${lessons.length} lessons`);

  // Create payouts
  // Uses `amount` (major currency units) which is supported by the Payout model.
  const payouts = await Payout.insertMany(
    lessons.map((lesson, i) => ({
      lesson: lesson._id,
      tutor: tutor._id,
      amount: lesson.price,
      currency: lesson.currency,
      provider: "stripe",
      status: i % 4 === 0 ? "failed" : i % 3 === 0 ? "queued" : "succeeded",
    }))
  );

  console.log(`💰 Created ${payouts.length} payouts`);

  // Create refunds
  const refunds = await Refund.insertMany(
    lessons.slice(0, 3).map((lesson, i) => ({
      lesson: lesson._id,
      student: student._id,
      tutor: tutor._id,
      amount: lesson.price * 0.5,
      currency: lesson.currency,
      status: i === 0 ? "approved" : i === 1 ? "denied" : "pending",
      reason: i === 0 ? "Lesson cancelled by tutor" : "Student request",
    }))
  );

  console.log(`💸 Created ${refunds.length} refunds`);

  console.log("✅ Finance seed complete!");
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

seedFinance().catch((err) => {
  console.error("❌ Seed failed:", err);
  mongoose.disconnect().catch(() => {});
});
