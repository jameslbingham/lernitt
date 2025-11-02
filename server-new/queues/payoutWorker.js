const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Payout = require("../models/Payout");
const User = require("../models/User");
const { sendEmail } = require("../utils/email");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const items = await Payout.find({ status: "queued" }).limit(50);
  for (const p of items) {
    // simulate success
    p.status = "succeeded";
    p.provider = p.provider || "sim";
    p.providerId = `sim_${Date.now()}`;
    await p.save();

    const tutorId = p.tutor || p.user;
    const tutor = tutorId ? await User.findById(tutorId) : null;

    if (tutor?.email) {
      const amount = ((p.amountCents || 0) / 100).toFixed(2);
      await sendEmail({
        to: tutor.email,
        subject: "Your payout succeeded",
        text: `Hi ${tutor.name || "tutor"}, your payout of €${amount} succeeded.`,
        html: `<p>Hi ${tutor.name || "tutor"},</p><p>Your payout of <b>€${amount}</b> succeeded.</p><p>Payout ID: ${p._id}</p>`,
      });
    }
  }

  console.log(`Processed ${items.length} payout(s).`);
  await mongoose.disconnect();
})();
