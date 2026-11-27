import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017/nakshatra_test");
  vi.stubEnv("JWT_SECRET", "test-jwt-secret-32-characters-long");
  vi.stubEnv("OTP_HMAC_SECRET", "test-otp-secret-32-characters-long");
});

describe("sidereal calculation", () => {
  it("calculates nine planets and whole-sign houses", async () => {
    const { computeKundli } = await import("./kundli-engine.js");
    const result=computeKundli("test",{dob:new Date("1998-08-20T00:00:00Z"),time:"06:40",lat:28.61,lng:77.21,timezone:"Asia/Kolkata"},new Date("2026-01-01T00:00:00Z"));
    expect(result.planets).toHaveLength(9);
    expect(result.planets[0].sign).toBe("Leo");
    expect(result.ascendant?.sign).toBe("Leo");
    expect(result.planets.every(p => p.house !== null && p.house >= 1 && p.house <= 12)).toBe(true);
    expect(result.dasha.current?.percentElapsed).toBeGreaterThanOrEqual(0);
    expect(result.dasha.current?.percentElapsed).toBeLessThanOrEqual(100);
  });
  it("omits ascendant and houses when birth time is unknown", async () => {
    const { computeKundli } = await import("./kundli-engine.js");
    const result=computeKundli("test",{dob:new Date("1950-01-10T00:00:00Z"),lat:51.5,lng:-0.12,timezone:"Europe/London"});
    expect(result.accuracy).toBe("approximate");
    expect(result.ascendant).toBeNull();
    expect(result.planets.every(p=>p.house===null)).toBe(true);
    expect(result.dasha.approximate).toBe(true);
  });
  it("resolves local dates that cross the UTC day boundary", async () => {
    const { computeKundli } = await import("./kundli-engine.js");
    const a=computeKundli("a",{dob:new Date("2000-01-02T00:00:00Z"),time:"01:00",lat:0,lng:0,timezone:"Asia/Tokyo"});
    const b=computeKundli("b",{dob:new Date("2000-01-01T00:00:00Z"),time:"16:00",lat:0,lng:0,timezone:"UTC"});
    expect(a.planets[1].degree).toBeCloseTo(b.planets[1].degree, 8);
    expect(a.planets[1].sign).toBe(b.planets[1].sign);
  });
  it("rejects nonexistent or ambiguous local clock times", async () => {
    const { computeKundli } = await import("./kundli-engine.js");
    const location={lat:40.7,lng:-74,timezone:"America/New_York"};
    expect(()=>computeKundli("x",{...location,dob:new Date("2024-03-10T00:00:00Z"),time:"02:30"})).toThrow();
    expect(()=>computeKundli("x",{...location,dob:new Date("2024-11-03T00:00:00Z"),time:"01:30"})).toThrow();
  });
});
