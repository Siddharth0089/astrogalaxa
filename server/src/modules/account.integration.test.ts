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
  vi.stubEnv("CRON_SECRET", "test-cron-secret-value-123");
  await mongoose.connect(replica.getUri());
  models = await import("../models.js");
  const {
    usersRouter,
    tarotRouter,
    publicRouter,
    astrologersRouter,
    chatRouter,
  } = await import("./core.js");
  const { cronRouter } = await import("./notifications.js");
  const { errorHandler } = await import("../common/http.js");
  app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use("/tarot", tarotRouter);
  app.use("/astrologers", astrologersRouter);
  app.use("/chat", chatRouter);
  app.use("/cron", cronRouter);
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
    expect(quota.body.data.byMode.threeCard.usedToday).toBe(3);
    expect(quota.body.data.byMode.threeCard.remainingToday).toBe(0);
    expect(quota.body.data.byMode.daily.remainingToday).toBe(3);
    expect(quota.body.data.byMode.yesNo.remainingToday).toBe(3);
    expect(
      (
        await request(app)
          .post("/tarot/readings")
          .set("Authorization", `Bearer ${token}`)
          .send({
            topic: "General",
            mode: "threeCard",
            cardIds: selection,
          })
      ).status,
    ).toBe(429);
    // Still able to draw in Daily Draw and Yes / No modes independently
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
    ).toBe(201);
    expect(
      (
        await request(app)
          .post("/tarot/readings")
          .set("Authorization", `Bearer ${token}`)
          .send({
            topic: "General",
            mode: "yesNo",
            cardIds: [selection[1]],
          })
      ).status,
    ).toBe(201);
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

  it("supports device token registration, data export, and free live consultations", async () => {
    const user = await models.User.create({
      email: "live-user@example.test",
      name: "Aarav",
      role: "user",
      language: "English",
    });
    const session = await models.Session.create({
      userId: user._id,
      refreshTokenHash: "live-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString() },
      secret,
    );

    const reg = await request(app)
      .post("/users/me/device-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ token: "ExponentPushToken[test-token-123456]", platform: "android", appVersion: "1.0.0" });
    expect(reg.status).toBe(201);
    expect(reg.body.data.registered).toBe(true);

    const del = await request(app)
      .delete("/users/me/device-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ token: "ExponentPushToken[test-token-123456]" });
    expect(del.status).toBe(200);
    expect(del.body.data.removed).toBe(true);

    const exported = await request(app)
      .get("/users/me/export")
      .set("Authorization", `Bearer ${token}`);
    expect(exported.status).toBe(200);
    expect(exported.body.data.profile.email).toBe("live-user@example.test");

    const expert = await models.Astrologer.create({
      name: "Acharya Dev",
      specialties: ["Career"],
      languages: ["English"],
      pricePerMinute: 0,
      status: "online",
      verified: true,
      ratingAvg: 0,
      ratingCount: 0,
    });

    const connectRes = await request(app)
      .post(`/astrologers/${expert.id}/connect`)
      .set("Authorization", `Bearer ${token}`)
      .send({ shareKundli: true });
    expect(connectRes.status).toBe(201);
    const threadId = connectRes.body.data.thread._id;
    expect(connectRes.body.data.messages.length).toBeGreaterThanOrEqual(1);

    const msgRes = await request(app)
      .post(`/astrologers/threads/${threadId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "How is my career this quarter?", clientMsgId: "msg-1" });
    expect(msgRes.status).toBe(201);
    expect(msgRes.body.data.userMessage.text).toBe("How is my career this quarter?");
    expect(msgRes.body.data.replyMessage.sender).toBe("astrologer");

    const endRes = await request(app)
      .patch(`/astrologers/threads/${threadId}/end`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 5 });
    expect(endRes.status).toBe(200);
    expect(endRes.body.data.ended).toBe(true);
    const updatedExpert = await models.Astrologer.findById(expert._id);
    expect(updatedExpert?.ratingAvg).toBe(5);
    expect(updatedExpert?.ratingCount).toBe(1);

    const emptyPush = await request(app)
      .post("/users/me/test-notification")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(emptyPush.status).toBe(200);
    expect(emptyPush.body.data.sent).toBe(0);
    expect(emptyPush.body.data.reason).toBe("no_device_tokens");

    await models.DeviceToken.create({
      userId: user._id,
      token: "ExponentPushToken[live-test-token-999]",
      platform: "android",
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    } as unknown as Response);
    try {
      const sentPush = await request(app)
        .post("/users/me/test-notification")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(sentPush.status).toBe(200);
      expect(sentPush.body.data.sent).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("validates cron secret and sends deduplicated daily push sweep", async () => {
    const pushUser = await models.User.create({
      email: "cron-push@example.test",
      name: "Maya",
      language: "English",
      nameSign: { name: "Leo" },
      prefs: {
        dailyHoroscope: true,
        notifyTime: "00:00",
        timezone: "UTC",
      },
    });
    await models.DeviceToken.create({
      userId: pushUser._id,
      token: "ExponentPushToken[cron-sweep-token-123]",
      platform: "android",
    });

    const unauth = await request(app).post("/cron/daily-push").send({});
    expect(unauth.status).toBe(401);

    const wrong = await request(app)
      .post("/cron/daily-push")
      .set("x-cron-secret", "wrong-secret")
      .send({});
    expect(wrong.status).toBe(401);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    } as unknown as Response);
    try {
      const first = await request(app)
        .post("/cron/daily-push")
        .set("x-cron-secret", "test-cron-secret-value-123")
        .send({});
      expect(first.status).toBe(200);
      expect(first.body.data.swept).toBe(true);
      expect(first.body.data.sent).toBeGreaterThanOrEqual(1);

      const second = await request(app)
        .post("/cron/daily-push")
        .set("Authorization", "Bearer test-cron-secret-value-123")
        .send({});
      expect(second.status).toBe(200);
      expect(second.body.data.sent).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("auto-computes Kundli on AI chat and grounds prompt & fallback in user placements", async () => {
    const chatUser = await models.User.create({
      email: "aichat@example.test",
      name: "Kavya",
      language: "English",
      nameSign: { name: "Gemini", vedicName: "Mithun", element: "Air", ruler: "Mercury" },
      sunSign: "Leo",
      birth: {
        dob: new Date("1997-08-14T00:00:00.000Z"),
        time: "09:30",
        placeName: "Jaipur, India",
        lat: 26.9124,
        lng: 75.7873,
        timezone: "Asia/Kolkata",
      },
    });
    const session = await models.Session.create({
      userId: chatUser._id,
      refreshTokenHash: "ai-chat-session",
      expiresAt: new Date(Date.now() + 60000),
    });
    const token = jwt.sign(
      { sub: chatUser._id.toString(), sid: session._id.toString() },
      secret,
    );

    expect(await models.Kundli.findOne({ userId: chatUser._id })).toBeNull();

    vi.stubEnv("GROQ_API_KEY", "test-groq-key-value");
    const originalFetch = globalThis.fetch;
    let capturedBody = "";
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedBody = String((init as RequestInit | undefined)?.body || "");
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Chart-grounded reply for Kavya." } }],
        }),
      } as unknown as Response;
    });

    try {
      const okRes = await request(app)
        .post("/chat/ai")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "How does my career look this year?" });
      expect(okRes.status).toBe(200);
      expect(okRes.body.data.text).toBe("Chart-grounded reply for Kavya.");

      // Verify Kundli was computed automatically and injected into system prompt
      const computed = await models.Kundli.findOne({ userId: chatUser._id }).lean();
      expect(computed?.moonSign).toBeTruthy();
      expect(capturedBody).toContain(computed?.ascendant?.sign || "");
      expect(capturedBody).toContain(computed?.moonSign || "");
      expect(capturedBody).toContain("Life Area Houses:");

      // Verify chart-grounded fallback if upstream LLM fails temporarily
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("timeout"));
      const fallbackRes = await request(app)
        .post("/chat/ai")
        .set("Authorization", `Bearer ${token}`)
        .send({
          text: "What about my career in my 10th house?",
          threadId: okRes.body.data.threadId,
        });
      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.body.data.text).toContain("Kavya");
      expect(fallbackRes.body.data.text).toContain("natal Kundli");
    } finally {
      globalThis.fetch = originalFetch;
      vi.stubEnv("GROQ_API_KEY", "");
    }
  });
});
