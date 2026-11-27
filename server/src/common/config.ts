import 'dotenv/config';
import { z } from 'zod';
import { isIP } from 'node:net';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().url(),
  MONGODB_DB_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,63}$/).default('astro_galexa'),
  MONGODB_DNS_SERVERS: z.string().default('').refine(value => !value || value.split(',').every(server => isIP(server.trim()) !== 0), 'Use comma-separated DNS server IP addresses'),
  JWT_SECRET: z.string().min(32),
  OTP_HMAC_SECRET: z.string().min(32),
  OTP_LOG_CODES: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  RESEND_API_KEY: z.string().optional(), EMAIL_FROM: z.string().default('Astro Galexa <auth@example.com>'),
  GOOGLE_CLIENT_IDS: z.string().default(''), ALLOWED_ORIGINS: z.string().default('http://localhost:8081'),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  AI_MODEL: z.string().default('llama-3.1-8b-instant'),
  TRUST_PROXY: z.string().default('1')
});
export const env = schema.parse(process.env);
