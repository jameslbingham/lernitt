const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const dotenv = require('dotenv');

// 1. LOAD ENVIRONMENT VARIABLES
dotenv.config();

const app = express();

// 2. MIDDLEWARE
app.use(compression());
app.use(express.json());
app.use(cors());

// 3. DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ DB Error:', err.message));

// 4. API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tutors', require('./require/tutors'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payouts', require('./routes/payouts'));
// ✅ SURGICAL FIX: Plugging in the Availability Bridge
app.use('/api/availability', require('./routes/availability'));

// 5. THE "FRONT DOOR" FIX
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 6. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Final Production Build Ready on ${PORT}`);
  console.log('✅ Frontend and Backend Linked');
});
