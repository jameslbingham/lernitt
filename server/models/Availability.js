const mongoose = require("mongoose");

const RangeSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true },   // "HH:mm"
  },
  { _id: false }
);

const WeeklyRuleSchema = new mongoose.Schema(
  {
    dow: { type: Number, min: 0, max: 6, required: true }, // 0=Sun
    ranges: { type: [RangeSchema], default: [] },
  },
  { _id: false }
);

const ExceptionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },   // "YYYY-MM-DD" in tutor timezone
    open: { type: Boolean, required: true },  // false = closed all day
    ranges: { type: [RangeSchema], default: [] }, // used when open=true
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  timezone: { type: String, required: true },
  slotInterval: { type: Number, enum: [15, 30, 45, 60], default: 30 },
  slotStartPolicy: { type: String, enum: ["hourHalf", "any"], default: "hourHalf" },
  weekly: { type: [WeeklyRuleSchema], default: [] },
  exceptions: { type: [ExceptionSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

AvailabilitySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Availability", AvailabilitySchema);
