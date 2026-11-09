// Express app. Exported as a module so tests can require it without opening
// a port; server.js is the only place that calls listen().
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const adminJobRoutes = require('./routes/adminJobRoutes');
const adminApplicationRoutes = require('./routes/adminApplicationRoutes');

const app = express();

// Behind Render/Vercel proxies: correct IPs for rate limiting, secure cookies.
app.set('trust proxy', 1);

// Security headers + CORS whitelist (never wildcard: cookies need credentials).
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));

// Rate limiting for the whole API.
app.use('/api', generalLimiter);

// Parsers. JSON bodies capped at 100kb; multipart is handled by multer on the
// apply route only. mongoSanitize strips $/. prefixed keys (NoSQL injection).
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// Uploads are NEVER served statically - résumé files live outside express.static
// and are streamed only through the protected admin route.
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminJobRoutes);
app.use('/api/admin', adminApplicationRoutes);

// 404 for unknown routes, then the single error mapper.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
