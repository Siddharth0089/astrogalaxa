import { describe, expect, it, vi } from "vitest";

describe("redis helpers (unconfigured fail-open mode)", () => {
  it("returns null/undefined gracefully when REDIS_URL is not configured", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    vi.stubEnv("JWT_SECRET", "test-jwt-secret-32-characters-long");
    vi.stubEnv("OTP_HMAC_SECRET", "test-otp-secret-32-characters-long");
    vi.stubEnv("REDIS_URL", "");

    const {
      getRedisClient,
      createRedisStore,
      cacheGetJson,
      cacheSetJson,
      cacheDelete,
      closeRedisConnections,
    } = await import("./redis.js");

    expect(getRedisClient()).toBeNull();
    expect(createRedisStore("rl:test:")).toBeUndefined();
    expect(await cacheGetJson("places:v1:mumbai")).toBeNull();
    await expect(
      cacheSetJson("places:v1:mumbai", [{ name: "Mumbai" }], 60),
    ).resolves.toBeUndefined();
    await expect(cacheDelete("places:v1:mumbai")).resolves.toBeUndefined();
    await expect(closeRedisConnections()).resolves.toBeUndefined();
  });
});
