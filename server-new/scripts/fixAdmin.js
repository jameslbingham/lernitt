// /server/scripts/fixAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const res = await User.updateOne(
      { email: 'admin@example.com' },
      { $set: { isAdmin: true } }
    );

    console.log('✅ Admin updated:', res);
    process.exit();
  } catch (e) {
    console.error('Error fixing admin:', e);
    process.exit(1);
  }
})();
