// /server/scripts/seedTestData.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const seedTag = `seed-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
const argv = process.argv.slice(2);
const RESET = argv.includes('--reset');

async function connect() {
  await mongoose.connect(MONGODB_URI, { autoIndex: true });
  console.log('Connected to MongoDB');
}

async function upsertUser({ name, email, password, role, isTutor, tutorFields = {} }) {
  let user = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);

  if (!user) {
    user = new User({
      name,
      email,
      password: passwordHash,
      role: role || (isTutor ? 'tutor' : 'student'),
      isTutor: !!isTutor,
      ...tutorFields,
      meta: { seedTag },
    });
  } else {
    user.name = name;
    user.password = passwordHash;
    user.role = role || user.role;
    user.isTutor = isTutor ?? user.isTutor;
    Object.assign(user, tutorFields);
    user.meta = { ...(user.meta || {}), seedTag };
  }
  await user.save();
  console.log(`Upserted user: ${email}`);
  return user;
}

async function createLesson({
  tutor, student, start, mins, price, currency, status, paid, extras = {}
}) {
  const startTime = new Date(start);
  const endTime = new Date(startTime.getTime() + mins * 60000);

  const lesson = await Lesson.create({
    tutor: tutor._id,
    student: student._id,
    subject: 'English — Conversation',
    startTime,
    endTime,
    price,             // integer cents
    currency,
    status,
    notes: 'Seeded lesson',
    isPaid: !!paid,
    ...extras,
    meta: { seedTag },
  });

  if (paid) {
    const payment = await Payment.create({
      user: student._id,
      tutor: tutor._id,
      lesson: lesson._id,
      amount: price,             // integer cents
      currency,
      provider: 'stripe',        // safe enum
      providerPaymentId: `seed_${Math.random().toString(36).slice(2)}`,
      status: (status === 'completed' || status === 'confirmed') ? 'succeeded' : 'created',
      refundAmount: 0,
      meta: { seedTag },
    });
    lesson.payment = payment._id;
    await lesson.save();
  }

  if (status === 'completed') {
    await Payout.create({
      tutor: tutor._id,
      lesson: lesson._id,
      amountCents: Math.round(price * 0.85), // 15% commission
      currency,
      provider: 'stripe',
      status: 'queued',
      meta: { seedTag },
    });
  }

  console.log(`Created lesson ${lesson._id} (${status})`);
  return lesson;
}

async function createNotification(user, type, title, message, data = {}) {
  await Notification.create({
    user: user._id,
    type,
    title,
    message,
    data,
    isRead: false,
    meta: { seedTag },
  });
}

async function wipePreviousSeeds() {
  const q = { 'meta.seedTag': { $exists: true } };
  const del = async (Model, name) => {
    const r = await Model.deleteMany(q);
    console.log(`Deleted ${r.deletedCount} ${name} from previous seeds`);
  };
  await del(Notification, 'notifications');
  await del(Payout, 'payouts');
  await del(Payment, 'payments');
  await del(Lesson, 'lessons');
  const ur = await User.deleteMany(q);
  console.log(`Deleted ${ur.deletedCount} users from previous seeds`);
}

async function main() {
  await connect();

  if (RESET) {
    await wipePreviousSeeds();
  }

  // USERS
  const alice = await upsertUser({
    name: 'Alice Student',
    email: 'alice@example.com',
    password: '123456',
    role: 'student',
    isTutor: false,
  });

  const bob = await upsertUser({
    name: 'Bob Tutor',
    email: 'bob@example.com',
    password: '123456',
    role: 'tutor',
    isTutor: true,
    tutorFields: {
      bio: 'Experienced ESL tutor',
      subjects: ['English', 'Business English'],
      price: 3000,
      currency: 'eur',
      avatar: 'https://example.com/avatar-bob.png',
      payoutsEnabled: true,
      stripeAccountId: 'acct_simulated_123',
    },
  });

  const charlie = await upsertUser({
    name: 'Charlie Student',
    email: 'charlie@example.com',
    password: '123456',
    role: 'student',
    isTutor: false,
  });

  // LESSONS
  const now = new Date();

  await createLesson({
    tutor: bob,
    student: alice,
    start: new Date(now.getTime() + 72 * 3600 * 1000),
    mins: 60,
    price: 3000,
    currency: 'eur',
    status: 'pending',
    paid: false,
  });

  await createLesson({
    tutor: bob,
    student: alice,
    start: new Date(now.getTime() + 48 * 3600 * 1000),
    mins: 60,
    price: 3000,
    currency: 'eur',
    status: 'confirmed',
    paid: true,
  });

  await createLesson({
    tutor: bob,
    student: alice,
    start: new Date(now.getTime() - 72 * 3600 * 1000),
    mins: 60,
    price: 3000,
    currency: 'eur',
    status: 'completed',
    paid: true,
  });

  await createLesson({
    tutor: bob,
    student: charlie,
    start: new Date(now.getTime() + 20 * 3600 * 1000),
    mins: 45,
    price: 2500,
    currency: 'eur',
    status: 'cancelled',
    paid: false,
    extras: {
      cancelledAt: new Date(),
      cancelledBy: 'student',
      cancelReason: 'Change of plans',
      reschedulable: false,
    },
  });

  await createLesson({
    tutor: bob,
    student: alice,
    start: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
    mins: 30,
    price: 1800,
    currency: 'eur',
    status: 'pending',
    paid: false,
    extras: {
      rescheduledAt: new Date(),
      notes: 'Rescheduled by student',
    },
  });

  // NOTIFICATIONS
  await createNotification(bob, 'booking', 'New booking', 'Alice booked a lesson.', { seedTag });
  await createNotification(alice, 'confirm', 'Lesson confirmed', 'Your lesson is confirmed.', { seedTag });

  console.log('\n✅ Seed complete.');
  console.log(`Tag: ${seedTag}`);
  console.log('\nUseful checks:');
  console.log('- GET /api/notifications');
  console.log('- GET /api/students/lessons');
  console.log('- GET /api/tutors/lessons');
  console.log('- GET /api/payments/mine');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
