require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

db.init();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Restrict CORS to same origin in production
const allowedOrigin = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;
app.use(cors({ origin: allowedOrigin }));

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limit AI endpoints — they call an external paid API
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' }
});

app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/progress', require('./routes/progress'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Learning Companion running at http://localhost:${PORT}`);
});
