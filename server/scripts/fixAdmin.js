// /server/scripts/fixAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'admin@example.com';
    const password = 'password123';

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: 'Admin',
        email,
        password,           // will be hashed by pre-save hook
        role: 'admin',
        isAdmin: true,
        isTutor: false,
        verified: true,
      });
      await user.save();
      console.log('✅ Admin created with new password');
    } else {
      user.password = password; // will be hashed by pre-save hook
      user.role = 'admin';
      user.isAdmin = true;
      await user.save();
      console.log('✅ Admin password reset and role updated');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error fixing admin:', e);
    process.exit(1);
  }
})();
