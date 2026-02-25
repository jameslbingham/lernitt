const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const dotenv = require('dotenv');

// 1. LOAD ENVIRONMENT VARIABLES AT THE VERY TOP
dotenv.config();

// 2. INITIALIZE APP
const app = express();

// 3. MIDDLEWARE
app.use(compression());
app.use(express.json());
app.use(cors());

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 4. DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in the .env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ DB Error:', err.message);
    // Print the URI (masked) to help debug connection issues
    const maskedUri = MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@');
    console.log(`Attempted connection to: ${maskedUri}`);
  });

// 5. ROUTES (Matching your Version 1 folder structure)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payouts', require('./routes/payouts'));

// 6. SERVE STATIC ASSETS (For Production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Lernitt API is running...');
  });
}

// 7. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Final Production Build Ready on ${PORT}`);
  if (!process.env.SENDGRID_API_KEY) {
    console.log('[SENDGRID] API Key is missing. Check environment variables.');
  }
});
