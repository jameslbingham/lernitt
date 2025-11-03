// /server/scripts/createAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('../models/User');

// Load env from /server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Hash a default password
    const password = await bcrypt.hash('admin123', 10);

    // Create new admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password,
      isAdmin: true
    });

    console.log('✅ Admin created:', admin.email);
    process.exit();
  } catch (e) {
    console.error('Error creating admin:', e);
    process.exit(1);
  }
})();
