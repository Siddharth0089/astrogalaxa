import crypto from 'node:crypto';
import { env } from './config.js';
export const hashOtp = (email: string, code: string) => crypto.createHmac('sha256', env.OTP_HMAC_SECRET).update(`${email.toLowerCase()}:${code}`).digest('hex');
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const secureEquals = (a: string, b: string) => crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
