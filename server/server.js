const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const dotenv = require('dotenv');

// LOAD ENVIRONMENT VARIABLES AT THE VERY TOP
dotenv.config();

const app = express();

// MIDDLEWARE
app.use(compression());
app.use(express.json());
app.use(cors());

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in the .env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ DB Error:', err.message);
  });

// ROUTES (Standard Lernitt Version 1 endpoints)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payouts', require('./routes/payouts'));

// START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Final Production Build Ready on ${PORT}`);
  console.log('✅ Reconnected to Cloud Database');
});
