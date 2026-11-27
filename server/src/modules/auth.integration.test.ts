import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let database: MongoMemoryServer;
let app: express.Express;
let models: typeof import("../models.js");
let hashOtp: typeof import("../common/crypto.js").hashOtp;
const email = "person@example.test";
const device = { deviceId: "device-1234", platform: "android" };

beforeAll(async () => {
  database = await MongoMemoryServer.create();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("MONGODB_URI", database.getUri());
  vi.stubEnv("JWT_SECRET", "test-jwt-secret-32-characters-long");
  vi.stubEnv("OTP_HMAC_SECRET", "test-otp-secret-32-characters-long");
  vi.stubEnv("OTP_LOG_CODES", "true");
  await mongoose.connect(database.getUri());
  models = await import("../models.js");
  ({ hashOtp } = await import("../common/crypto.js"));
  const { authRouter } = await import("./auth.js");
  const { errorHandler, requireAuth } = await import("../common/http.js");
  app = express();
  app.set("trust proxy", "loopback");
  app.use(express.json());
  app.use("/auth", authRouter);
  app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  await Promise.all([models.User.init(), models.OtpChallenge.init(), models.Session.init()]);
}, 120_000);

beforeEach(async () => {
  await Promise.all([models.User.deleteMany({}), models.OtpChallenge.deleteMany({}), models.Session.deleteMany({})]);
});
afterAll(async () => { await mongoose.disconnect(); if (database) await database.stop(); });

describe("authentication concurrency", () => {
  it("accepts a correct OTP only once under concurrent requests", async () => {
    await models.OtpChallenge.create({ email, codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, lastSentAt: new Date() });
    const replies = await Promise.all(Array.from({ length: 3 }, () => request(app).post("/auth/otp/verify").send({ email, code: "123456", ...device })));
    expect(replies.filter(reply => reply.status === 200)).toHaveLength(1);
    expect(await models.Session.countDocuments()).toBe(1);
  });

  it("revokes the rotated token family when a refresh token is reused", async () => {
    await models.OtpChallenge.create({ email, codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, lastSentAt: new Date() });
    const login = await request(app).post("/auth/otp/verify").send({ email, code: "123456", ...device });
    expect(login.status).toBe(200);
    const initial = login.body.data.refreshToken;
    const rotated = await request(app).post("/auth/refresh").send({ refreshToken: initial, ...device });
    expect(rotated.status).toBe(200);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${rotated.body.data.accessToken}`)).status).toBe(200);
    const reused = await request(app).post("/auth/refresh").send({ refreshToken: initial, ...device });
    expect(reused.status).toBe(401);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${rotated.body.data.accessToken}`)).status).toBe(401);
    const afterReuse = await request(app).post("/auth/refresh").send({ refreshToken: rotated.body.data.refreshToken, ...device });
    expect(afterReuse.status).toBe(401);
  });

  it("rejects a rotated token when the same refresh token is submitted concurrently", async () => {
    await models.OtpChallenge.create({ email, codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, lastSentAt: new Date() });
    const login = await request(app).post("/auth/otp/verify").send({ email, code: "123456", ...device });
    const initial = login.body.data.refreshToken;
    const replies = await Promise.all([request(app).post("/auth/refresh").send({ refreshToken: initial, ...device }), request(app).post("/auth/refresh").send({ refreshToken: initial, ...device })]);
    expect(replies.map(reply => reply.status).sort()).toEqual([200, 401]);
    const successful = replies.find(reply => reply.status === 200)!;
    const revoked = await request(app).post("/auth/refresh").send({ refreshToken: successful.body.data.refreshToken, ...device });
    expect(revoked.status).toBe(401);
  });

  it("limits attempts even when incorrect codes arrive concurrently", async () => {
    await models.OtpChallenge.create({ email, codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, lastSentAt: new Date() });
    const attempts = await Promise.all(Array.from({ length: 7 }, () => request(app).post("/auth/otp/verify").set("X-Forwarded-For", "192.0.2.10").send({ email, code: "000000", ...device })));
    expect(attempts.filter(reply => reply.body.error?.code === "OTP_INVALID")).toHaveLength(5);
    expect((await models.OtpChallenge.findOne({ email }))?.attempts).toBe(5);
    const correct = await request(app).post("/auth/otp/verify").send({ email, code: "123456", ...device });
    expect(correct.status).not.toBe(200);
  });
  it("invalidates an access token immediately after logout", async () => {
    const testEmail = "logout@example.test";
    await models.OtpChallenge.create({ email: testEmail, codeHash: hashOtp(testEmail, "123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, lastSentAt: new Date() });
    const login = await request(app).post("/auth/otp/verify").set("X-Forwarded-For", "192.0.2.11").send({ email: testEmail, code: "123456", ...device });
    expect(login.status).toBe(200);
    const { accessToken, refreshToken } = login.body.data;
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${accessToken}`)).status).toBe(200);
    expect((await request(app).post("/auth/logout").send({ refreshToken })).status).toBe(200);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${accessToken}`)).status).toBe(401);
  });
  it("rejects an access token whose session belongs to a different user", async () => {
    const first = await models.User.create({ email: "first@example.test" });
    const second = await models.User.create({ email: "second@example.test" });
    const session = await models.Session.create({ userId: second._id, refreshTokenHash: "different-session", expiresAt: new Date(Date.now() + 60000) });
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign({ sub: first._id.toString(), sid: session._id.toString() }, process.env.JWT_SECRET!);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });
});
