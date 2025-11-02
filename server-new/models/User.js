// /server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

/**
 * MERGED User schema
 * - Preserves ALL of your existing fields (name, email, password, bio, subjects, price, avatar,
 *   stripeAccountId, payoutsEnabled, paypalEmail, isAdmin).
 * - Adds optional fields used by dashboards & payouts (role, isTutor, hourlyRate, languages,
 *   country, timezone, totals, lastLogin, verified).
 * - Adds password hashing + compare helper (safe: only hashes when password is modified).
 */

const UserSchema = new Schema(
  {
    // ---- Existing required fields (kept) ----
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // ---- Existing tutor fields (kept) ----
    bio:      { type: String },
    subjects: [{ type: String }],
    price:    { type: Number },           // you already had "price" for tutors
    avatar:   { type: String },

    // ---- Existing payout fields (kept) ----
    stripeAccountId: { type: String },
    payoutsEnabled:  { type: Boolean, default: false },
    paypalEmail:     { type: String },

    // ---- Existing admin field (kept) ----
    isAdmin: { type: Boolean, default: false },

    // ---- New optional fields (added; do not break existing code) ----
    role:       { type: String, enum: ["student", "tutor", "admin"], default: "student", index: true },
    isTutor:    { type: Boolean, default: false },
    hourlyRate: { type: Number, min: 0 },        // complements your existing "price"
    languages:  [{ type: String, trim: true }],
    country:    { type: String, trim: true },
    timezone:   { type: String, trim: true },

    // Aggregates for dashboards (optional, can be maintained by jobs/hooks)
    totalEarnings: { type: Number, default: 0 },
    totalLessons:  { type: Number, default: 0 },

    // Account meta
    lastLogin: { type: Date },
    verified:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ----------------------------- Indexes ----------------------------- */
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isTutor: 1 });

/* ------------------------- Password helpers ------------------------ */
// Only hash if the password field has been modified (safe for existing users)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/* -------------------------- Public summary -------------------------- */
UserSchema.methods.summary = function () {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    isTutor: this.isTutor,
    isAdmin: this.isAdmin,
    country: this.country,
    timezone: this.timezone,
    totalLessons: this.totalLessons,
    totalEarnings: this.totalEarnings,
  };
};

/* -------------------------- Export -------------------------- */
module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
