import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from './config.js';
import { isValidObjectId } from 'mongoose';
import { Session, User } from '../models.js';

export class AppError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); } }
export const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
export const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data, error: null });
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof AppError ? err.status : err instanceof ZodError ? 400 : 500;
  const code = err instanceof AppError ? err.code : err instanceof ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
  if (status >= 500) req.log?.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(status).json({ success: false, data: null, error: { code, message: status === 500 ? 'Something went wrong' : err.message, details: err instanceof ZodError ? err.flatten() : undefined } });
};
export type AuthRequest = Request & { userId?: string };
export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  let userId: string;
  let sessionId: string;
  try {
    const header = req.header('authorization');
    const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error();
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || !isValidObjectId(payload.sub) || typeof payload.sid !== 'string' || !isValidObjectId(payload.sid)) throw new Error();
    userId = payload.sub;
    sessionId = payload.sid;
  } catch { return next(new AppError(401, 'UNAUTHORIZED', 'Please sign in again')); }
  void Promise.all([User.exists({ _id: userId, deletedAt: null }), Session.exists({ _id: sessionId, userId, revokedAt: null, expiresAt: { $gt: new Date() } })]).then(([user, session]) => {
    if (!user || !session) return next(new AppError(401, 'UNAUTHORIZED', 'Please sign in again'));
    req.userId = userId;
    next();
  }).catch(next);
};
