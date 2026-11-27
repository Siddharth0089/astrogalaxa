import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/nakshatra_test');
  vi.stubEnv('JWT_SECRET', 'test-jwt-secret-32-characters-long');
  vi.stubEnv('OTP_HMAC_SECRET', 'test-otp-secret-32-characters-long');
  vi.stubEnv('NODE_ENV', 'test');
});

describe('OTP hashing', () => {
  it('binds the hash to both email and code without retaining the code', async () => {
    const { hashOtp, secureEquals } = await import('./crypto.js');
    const hash = hashOtp('person@example.test', '123456');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('123456');
    expect(secureEquals(hash, hashOtp('PERSON@example.test', '123456'))).toBe(true);
    expect(secureEquals(hash, hashOtp('other@example.test', '123456'))).toBe(false);
    expect(secureEquals(hash, hashOtp('person@example.test', '654321'))).toBe(false);
  });
});
