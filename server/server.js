const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(compression());
app.use(express.json());
app.use(cors());

// DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ DB Error:', err.message));

// API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payouts', require('./routes/payouts'));

// SERVE FRONTEND
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Final Production Build Ready on ${PORT}`);
});
