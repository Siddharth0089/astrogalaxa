import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replica: MongoMemoryReplSet;
let app: express.Express;
let models: typeof import("../models.js");
const secret = "test-jwt-secret-32-characters-long";

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("MONGODB_URI", replica.getUri());
  vi.stubEnv("JWT_SECRET", secret);
  vi.stubEnv("OTP_HMAC_SECRET", "test-otp-secret-32-characters-long");
  await mongoose.connect(replica.getUri());
  models = await import("../models.js");
  const {
    usersRouter,
    tarotRouter,
    publicRouter,
    astrologersRouter,
    chatRouter,
  } = await import("./core.js");
  const { errorHandler } = await import("../common/http.js");
  app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use("/tarot", tarotRouter);
  app.use("/astrologers", astrologersRouter);
  app.use("/chat", chatRouter);
  app.use("/", publicRouter);
  app.use(errorHandler);
  await Promise.all([
    models.User.init(),
    models.ChatMessage.init(),
    models.Session.init(),
    models.DailyHoroscope.init(),
  ]);
}, 120_000);
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

describe("account deletion", () => {
  it("removes the account and its related records without affecting another account", async () => {
    const user = await models.User.create({
      email: "delete@example.test",
      role: "user",
    });
    const other = await models.User.create({
      email: "other@example.test",
      role: "user",
    });
    const thread = await models.ChatThread.create({
      type: "ai",
      userId: user._id,
    });
    const otherThread = await models.ChatThread.create({
      type: "ai",
      userId: other._id,
    });
    await models.ChatMessage.create([
      { threadId: thread._id, sender: "user", text: "private" },
      { threadId: otherThread._id, sender: "user", text: "other" },
    ]);
    await models.Kundli.create({ userId: user._id });
    await models.TarotReading.create({ userId: user._id, topic: "General" });
    await models.DeviceToken.create({
      userId: user._id,
      token: "test-device-token",
    });
    await models.AstrologerSubscription.create({
      userId: user._id,
      astrologerId: new mongoose.Types.ObjectId(),
    });
    await models.OtpChallenge.create({
      email: user.email,
      codeHash: "hash",
      expiresAt: new Date(Date.now() + 60000),
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "hash",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
      { expiresIn: "15m" },
    );
    const reply = await request(app)
      .delete("/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(reply.status).toBe(200);
    expect(await models.User.findById(user._id)).toBeNull();
    expect(await models.User.findById(other._id)).not.toBeNull();
    expect(
      await models.ChatMessage.countDocuments({ threadId: thread._id }),
    ).toBe(0);
    expect(
      await models.ChatMessage.countDocuments({ threadId: otherThread._id }),
    ).toBe(1);
    expect(await models.Kundli.countDocuments({ userId: user._id })).toBe(0);
    expect(await models.TarotReading.countDocuments({ userId: user._id })).toBe(
      0,
    );
    expect(await models.DeviceToken.countDocuments({ userId: user._id })).toBe(
      0,
    );
    expect(
      await models.OtpChallenge.countDocuments({ email: user.email }),
    ).toBe(0);
    expect(await models.Session.countDocuments({ userId: user._id })).toBe(0);
    expect(
      await models.AstrologerSubscription.countDocuments({ userId: user._id }),
    ).toBe(0);
    expect(
      (
        await request(app)
          .get("/users/me")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(401);
  });
  it("does not delete astrologer or admin accounts using the user self-service path", async () => {
    const user = await models.User.create({
      email: "expert@example.test",
      role: "astrologer",
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "expert-hash",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    expect(
      (
        await request(app)
          .delete("/users/me")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(403);
    expect(await models.User.findById(user._id)).not.toBeNull();
  });
  it("rolls back related deletes when a later operation fails", async () => {
    const user = await models.User.create({
      email: "rollback@example.test",
      role: "user",
    });
    await models.Kundli.create({ userId: user._id });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "rollback-hash",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    const failure = vi
      .spyOn(models.User, "deleteOne")
      .mockImplementationOnce(() => {
        throw new Error("injected deletion failure");
      });
    try {
      expect(
        (
          await request(app)
            .delete("/users/me")
            .set("Authorization", `Bearer ${token}`)
        ).status,
      ).toBe(500);
      expect(await models.User.findById(user._id)).not.toBeNull();
      expect(await models.Kundli.countDocuments({ userId: user._id })).toBe(1);
    } finally {
      failure.mockRestore();
    }
  });
});

describe("profile updates", () => {
  it("updates the name sign and merges preferences without erasing unrelated settings", async () => {
    const user = await models.User.create({
      email: "profile@example.test",
      role: "user",
      name: "Asha",
      prefs: {
        dailyHoroscope: true,
        astrologerOnline: true,
        chat: true,
        notifyTime: "08:00",
        timezone: "Asia/Kolkata",
      },
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "profile-hash",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    const reply = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Maya  ", prefs: { chat: false, notifyTime: "18:30" } });
    expect(reply.status).toBe(200);
    expect(reply.body.data.name).toBe("Maya");
    expect(reply.body.data.nameSign.name).toBe("Leo");
    expect(reply.body.data.prefs).toMatchObject({
      dailyHoroscope: true,
      astrologerOnline: true,
      chat: false,
      notifyTime: "18:30",
      timezone: "Asia/Kolkata",
    });
    const rejected = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ prefs: { notifyTime: "99:99" } });
    expect(rejected.status).toBe(400);
    expect((await models.User.findById(user._id))?.prefs?.notifyTime).toBe(
      "18:30",
    );
  });
});

describe("chat message indexes", () => {
  it("allows multiple messages without a client ID while preventing duplicate client IDs in a thread", async () => {
    const user = await models.User.create({
      email: "messages@example.test",
      role: "user",
    });
    const thread = await models.ChatThread.create({
      type: "ai",
      userId: user._id,
    });
    await models.ChatMessage.create({
      threadId: thread._id,
      sender: "ai",
      text: "first",
    });
    await models.ChatMessage.create({
      threadId: thread._id,
      sender: "ai",
      text: "second",
    });
    await models.ChatMessage.create({
      threadId: thread._id,
      sender: "user",
      text: "hello",
      clientMsgId: "client-1",
    });
    await expect(
      models.ChatMessage.create({
        threadId: thread._id,
        sender: "user",
        text: "retry",
        clientMsgId: "client-1",
      }),
    ).rejects.toMatchObject({ code: 11000 });
    expect(
      await models.ChatMessage.countDocuments({ threadId: thread._id }),
    ).toBe(3);
  });
});

describe("tarot readings", () => {
  it("stores cards in selection order and prevents access by another user", async () => {
    const { tarotContent } = await import("../seeds/tarot-content.js");
    await models.TarotCard.insertMany(tarotContent);
    const cards = await models.TarotCard.find().sort({ number: 1 });
    const user = await models.User.create({
      email: "tarot@example.test",
      role: "user",
    });
    const other = await models.User.create({
      email: "tarot-other@example.test",
      role: "user",
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "tarot-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const otherSession = await models.Session.create({
      userId: other._id,
      refreshTokenHash: "tarot-other-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    const otherToken = jwt.sign(
      { sub: other._id.toString(), sid: otherSession._id.toString() },
      secret,
    );
    const deck = await request(app)
      .get("/tarot/cards")
      .set("Authorization", `Bearer ${token}`);
    expect(deck.status).toBe(200);
    expect(deck.body.data).toHaveLength(8);
    expect(
      deck.body.data.every(
        (card: Record<string, unknown>) => Object.keys(card).join() === "id",
      ),
    ).toBe(true);
    const selection = [cards[8].id, cards[2].id, cards[19].id];
    const response = await request(app)
      .post("/tarot/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({ topic: "General", cardIds: selection });
    expect(response.status).toBe(201);
    expect(
      response.body.data.cards.map((card: { cardId: string }) => card.cardId),
    ).toEqual(selection);
    expect(
      response.body.data.cards.map(
        (card: { position: string }) => card.position,
      ),
    ).toEqual(["Past", "Present", "Future"]);
    expect(
      (
        await request(app)
          .get(`/tarot/readings/${response.body.data._id}`)
          .set("Authorization", `Bearer ${otherToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post("/tarot/readings")
          .set("Authorization", `Bearer ${token}`)
          .send({
            topic: "General",
            cardIds: [selection[0], selection[0], selection[1]],
          })
      ).status,
    ).toBe(400);
    const fullDeck = await request(app)
      .get("/tarot/cards?all=true")
      .set("Authorization", `Bearer ${token}`);
    expect(fullDeck.status).toBe(200);
    expect(fullDeck.body.data).toHaveLength(78);
    const filteredDeck = await request(app)
      .get("/tarot/cards?all=true&topic=Love&q=marriage")
      .set("Authorization", `Bearer ${token}`);
    expect(filteredDeck.status).toBe(200);
    expect(filteredDeck.body.data.length).toBeGreaterThanOrEqual(8);
    expect(filteredDeck.body.data.length).toBeLessThanOrEqual(30);
    expect(
      filteredDeck.body.data.every(
        (card: Record<string, unknown>) => Object.keys(card).join() === "id",
      ),
    ).toBe(true);
    const quota = await request(app)
      .get("/tarot/quota")
      .set("Authorization", `Bearer ${token}`);
    expect(quota.status).toBe(200);
    expect(quota.body.data.maxDailyCards).toBe(3);
    expect(quota.body.data.usedToday).toBe(3);
    expect(quota.body.data.remainingToday).toBe(0);
    expect(
      (
        await request(app)
          .post("/tarot/readings")
          .set("Authorization", `Bearer ${token}`)
          .send({
            topic: "General",
            mode: "daily",
            cardIds: [selection[0]],
          })
      ).status,
    ).toBe(429);
    const moneyReading = await request(app)
      .post("/tarot/readings")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        topic: "Money",
        mode: "daily",
        question: "Should I invest in savings?",
        cardIds: [selection[0]],
      });
    expect(moneyReading.status).toBe(201);
    expect(moneyReading.body.data.interpretation).toContain(
      "Should I invest in savings?",
    );
    expect(moneyReading.body.data.cards[0].topicInsight).toBeTruthy();
  });
});

describe("daily horoscope", () => {
  it("uses the authenticated user's sign and persists one record for the day", async () => {
    const user = await models.User.create({
      email: "horoscope@example.test",
      role: "user",
      nameSign: { name: "Leo" },
      prefs: { timezone: "Asia/Kolkata" },
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "horoscope-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    const replies = await Promise.all([
      request(app)
        .get("/horoscope/today")
        .set("Authorization", `Bearer ${token}`),
      request(app)
        .get("/horoscope/today")
        .set("Authorization", `Bearer ${token}`),
    ]);
    expect(replies.map((reply) => reply.status)).toEqual([200, 200]);
    expect(replies[0].body.data.sign).toBe("Leo");
    expect(replies[0].body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      await models.DailyHoroscope.countDocuments({
        sign: "Leo",
        date: replies[0].body.data.date,
      }),
    ).toBe(1);
  });
});

describe("astrologers and unavailable AI", () => {
  it("shows only verified experts matching the selected specialty", async () => {
    const user = await models.User.create({
      email: "experts@example.test",
      role: "user",
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "experts-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );
    await models.Astrologer.create([
      { name: "Verified love", specialties: ["Love"], verified: true },
      { name: "Unverified", specialties: ["Love"], verified: false },
      { name: "Verified career", specialties: ["Career"], verified: true },
    ]);
    const response = await request(app)
      .get("/astrologers?specialty=Love")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(
      response.body.data.map((item: { name: string }) => item.name),
    ).toEqual(["Verified love"]);
    expect((await request(app).get("/astrologers")).status).toBe(401);
    const ai = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Hello" });
    expect(ai.status).toBe(503);
    expect(ai.body.error.code).toBe("AI_UNAVAILABLE");
  });
});
