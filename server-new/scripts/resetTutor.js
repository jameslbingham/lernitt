require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const userId = new mongoose.Types.ObjectId('68b5d016667c58b08ab7203f'); // Bob
    const newEmail = 'bob@example.com';
    const newPassword = '123456';
    const hash = await bcrypt.hash(newPassword, 10);

    const res = await User.updateOne(
      { _id: userId },
      { $set: { email: newEmail, password: hash } }
    );

    console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
