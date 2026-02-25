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
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payouts', require('./routes/payouts'));

// 5. THE "HOMEPAGE" FIX
// This tells the server exactly where the website's 'dist' folder is
const distPath = path.join(__dirname, '../client/dist');

// Serve the 'assets' folder specifically (CSS, JS, Images)
app.use('/assets', express.static(path.join(distPath, 'assets')));

// Serve everything else in the dist folder
app.use(express.static(distPath));

// For any other address, just show the homepage (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 6. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server fully linked and running on ${PORT}`);
});
