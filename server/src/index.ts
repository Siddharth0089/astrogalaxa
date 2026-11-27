import http from 'node:http';
import crypto from 'node:crypto';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { env } from './common/config.js';
import { errorHandler, ok } from './common/http.js';
import { Astrologer, ChatMessage, ChatThread, Session } from './models.js';
import { starterAstrologers } from './seeds/astrologers.js';
import { authRouter } from './modules/auth.js';
import { cronRouter, startDailyNotificationScheduler } from './modules/notifications.js';
import {
  attachSocketIoRedisAdapter,
  closeRedisConnections,
  createRedisStore,
} from './common/redis.js';
import {
  astrologersRouter,
  chatRouter,
  kundliRouter,
  publicRouter,
  registerThreadMessageEmitter,
  tarotRouter,
  usersRouter,
} from './modules/core.js';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.body.email', 'req.body.code', 'req.body.refreshToken'],
});
const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY) {
  const tp = env.TRUST_PROXY.trim();
  app.set('trust proxy', tp === 'true' ? true : tp === 'false' ? false : !isNaN(Number(tp)) ? Number(tp) : tp);
}
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(
  pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID(),
    serializers: { req: (req: { id?: string; method?: string }) => ({ id: req.id, method: req.method }) },
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60_000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: createRedisStore('rl:global:'),
    skip: (req) => req.path === '/health' || req.path === '/ready',
  }),
);

const healthHandler = (_req: express.Request, res: express.Response) =>
  ok(res, { status: 'ok', env: env.NODE_ENV });
const readyHandler = (_req: express.Request, res: express.Response) =>
  ok(
    res,
    { status: mongoose.connection.readyState === 1 ? 'ready' : 'not_ready' },
    mongoose.connection.readyState === 1 ? 200 : 503,
  );
app.get('/health', healthHandler);
app.get('/ready', readyHandler);

const api = express.Router();
api.get('/health', healthHandler);
api.get('/ready', readyHandler);
api.use('/auth', authRouter);
api.use('/users', usersRouter);
api.use('/kundli', kundliRouter);
api.use('/', publicRouter);
api.use('/tarot', tarotRouter);
api.use('/chat', chatRouter);
api.use('/astrologers', astrologersRouter);
api.use('/cron', cronRouter);
app.use('/api/v1', api);

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup({
    openapi: '3.0.3',
    info: { title: 'Astro Galaxa API', version: '1.0.0' },
    paths: {
      '/api/v1/health': { get: { summary: 'Liveness probe' } },
      '/api/v1/ready': { get: { summary: 'Readiness probe' } },
      '/api/v1/auth/otp/request': { post: { summary: 'Request email OTP' } },
      '/api/v1/auth/otp/verify': { post: { summary: 'Verify email OTP' } },
      '/api/v1/users/me': { get: { summary: 'Get profile' }, patch: { summary: 'Update profile' }, delete: { summary: 'Delete account' } },
      '/api/v1/users/me/export': { get: { summary: 'Export user data' } },
      '/api/v1/users/me/device-token': { post: { summary: 'Register push device token' } },
      '/api/v1/kundli': { get: { summary: 'Get Sidereal Kundli' } },
      '/api/v1/kundli/match': { post: { summary: 'Calculate 36-point Gun Milan match' } },
      '/api/v1/panchang/today': { get: { summary: 'Get today Vedic Panchang' } },
      '/api/v1/tarot/cards': { get: { summary: 'Fetch shuffled/filtered Tarot deck IDs' } },
      '/api/v1/tarot/readings': { get: { summary: 'List readings' }, post: { summary: 'Draw & interpret reading' } },
      '/api/v1/astrologers': { get: { summary: 'List verified free astrologers' } },
      '/api/v1/astrologers/{id}/connect': { post: { summary: 'Start or resume free live consultation session' } },
      '/api/v1/cron/daily-push': { post: { summary: 'Trigger scheduled daily horoscope push sweep (requires x-cron-secret)' } },
    },
  }),
);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : true, credentials: true },
});

io.use(async (socket, next) => {
  try {
    const token =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers?.authorization === 'string' &&
            socket.handshake.headers.authorization.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : '';
    if (!token) return next(new Error('Unauthorized'));
    const claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as {
      sub?: string;
      sid?: string;
      role?: string;
    };
    if (!claims.sub || !claims.sid) return next(new Error('Unauthorized'));
    const activeSession = await Session.findOne({
      _id: claims.sid,
      userId: claims.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select('_id')
      .lean();
    if (!activeSession) return next(new Error('Session expired'));
    socket.data.userId = claims.sub;
    socket.data.role = claims.role || 'user';
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_thread', async (threadId: string) => {
    if (typeof threadId !== 'string' || !/^[a-f\d]{24}$/i.test(threadId)) return;
    const thread = await ChatThread.findOne({
      _id: threadId,
      userId: socket.data.userId,
    })
      .select('_id')
      .lean();
    if (thread) {
      await socket.join(`thread:${threadId}`);
    }
  });

  socket.on(
    'send_message',
    async (payload: { threadId?: string; text?: string; clientMsgId?: string }) => {
      if (
        !payload ||
        typeof payload.threadId !== 'string' ||
        !/^[a-f\d]{24}$/i.test(payload.threadId) ||
        typeof payload.text !== 'string' ||
        !payload.text.trim()
      ) {
        return;
      }
      const thread = await ChatThread.findOne({
        _id: payload.threadId,
        userId: socket.data.userId,
        status: 'active',
      });
      if (!thread) return;
      const msg = await ChatMessage.create({
        threadId: thread._id,
        sender: 'user',
        text: payload.text.trim().slice(0, 2000),
        clientMsgId: payload.clientMsgId?.slice(0, 120) || undefined,
      });
      io.to(`thread:${thread.id}`).emit('message', msg);
    },
  );
});

registerThreadMessageEmitter((threadId, payload) => {
  io.to(`thread:${threadId}`).emit('message', payload);
});

async function start() {
  if (env.MONGODB_DNS_SERVERS) {
    dns.setServers(env.MONGODB_DNS_SERVERS.split(',').map((s) => s.trim()));
  }
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize: 50,
    minPoolSize: 10,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
  });
  const count = await Astrologer.countDocuments();
  if (count === 0) {
    await Astrologer.insertMany(starterAstrologers);
    logger.info('Seeded default verified free astrologers');
  }
  await attachSocketIoRedisAdapter(io, logger);
  startDailyNotificationScheduler(logger);
  server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Astro Galaxa API started'));
}

start().catch((err) => {
  logger.fatal(
    { name: err instanceof Error ? err.name : 'Error' },
    'Startup failed; check database connectivity and configuration',
  );
  process.exit(1);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () =>
    server.close(() =>
      Promise.allSettled([mongoose.disconnect(), closeRedisConnections()]).finally(() =>
        process.exit(0),
      ),
    ),
  );
}
