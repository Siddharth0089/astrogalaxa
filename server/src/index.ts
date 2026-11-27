import http from 'node:http';
import crypto from 'node:crypto';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { env } from './common/config.js';
import { errorHandler, ok } from './common/http.js';
import { authRouter } from './modules/auth.js';
import { astrologersRouter, chatRouter, kundliRouter, publicRouter, tarotRouter, usersRouter } from './modules/core.js';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug', redact: ['req.headers.authorization', 'req.body.email', 'req.body.code', 'req.body.refreshToken'] });
const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY) {
  const tp = env.TRUST_PROXY.trim();
  app.set('trust proxy', tp === 'true' ? true : tp === 'false' ? false : !isNaN(Number(tp)) ? Number(tp) : tp);
}
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID(), serializers: { req: (req: { id?: string; method?: string }) => ({ id: req.id, method: req.method }) } }));
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin))) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60_000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.get('/health', (_req, res) => ok(res, { status: 'ok' })); app.get('/ready', (_req, res) => ok(res, { status: mongoose.connection.readyState === 1 ? 'ready' : 'not_ready' }, mongoose.connection.readyState === 1 ? 200 : 503));
const api = express.Router(); api.use('/auth', authRouter); api.use('/users', usersRouter); api.use('/kundli', kundliRouter); api.use('/', publicRouter); api.use('/tarot', tarotRouter); api.use('/chat', chatRouter); api.use('/astrologers', astrologersRouter); app.use('/api/v1', api);
app.use('/docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.3', info: { title: 'Astro Galaxa API', version: '1.0.0' }, paths: { '/api/v1/auth/otp/request': { post: { summary: 'Request email OTP' } }, '/api/v1/kundli': { get: { summary: 'Get Kundli' } } } })); app.use(errorHandler);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.ALLOWED_ORIGINS.split(',') } });
// Live chat is disabled until socket authentication and thread membership checks exist.
io.use((_socket, next) => next(new Error('Live chat is not yet available')));
async function start() { if (env.MONGODB_DNS_SERVERS) dns.setServers(env.MONGODB_DNS_SERVERS.split(',').map(server => server.trim())); await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME }); server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Astro Galaxa API started')); } start().catch(err => { logger.fatal({ name: err instanceof Error ? err.name : 'Error' }, 'Startup failed; check database connectivity and configuration'); process.exit(1); });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => mongoose.disconnect().finally(() => process.exit(0))));
