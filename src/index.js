require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const sequelize    = require('../config/database');
const logger       = require('../config/logger');
require('./models');                               // Register all models + associations
const routes       = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { initCronJobs } = require('./services/cronService');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
}));

// ── Parsing & logging ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/v1', routes);
app.get('/health', (req, res) => res.json({
  status: 'OK', version: '2.0.0', db: 'MySQL',
  timestamp: new Date().toISOString(), env: process.env.NODE_ENV,
}));
app.all('*', (req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: `${req.method} ${req.path} not found` }));

// ── Error handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── DB + Server startup ───────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ MySQL connected: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database schema synced');
    }

    const PORT = parseInt(process.env.PORT || '5000');
    app.listen(PORT, () => {
      logger.info(`\n🚀 MLM Platform API v2.0 — http://localhost:${PORT}`);
      logger.info(`   Environment : ${process.env.NODE_ENV}`);
      logger.info(`   API Base    : /api/v1\n`);
    });

    initCronJobs();
  } catch (err) {
    logger.error(`❌ Startup failed: ${err.message}`);
    process.exit(1);
  }
};

start();
module.exports = app;
