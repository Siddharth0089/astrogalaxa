import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { createHash, randomInt } from "node:crypto";
import { env } from "../common/config.js";
import {
  Astrologer,
  AstrologerSubscription,
  ChatMessage,
  ChatThread,
  DailyHoroscope,
  Kundli,
  TarotCard,
  TarotReading,
  User,
  Session,
  OtpChallenge,
  DeviceToken,
} from "../models.js";
import {
  AppError,
  asyncRoute,
  AuthRequest,
  ok,
  requireAuth,
} from "../common/http.js";
import { nameSign, sunSign } from "../common/signs.js";
import { computeKundli } from "./kundli-engine.js";
import { seedHoroscope } from "./horoscope-content.js";

const validTimezone = (zone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
};
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");
const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine(validTimezone, "Use a valid timezone");
const birthSchema = z
  .object({
    dob: z.coerce
      .date()
      .refine((x) => x <= new Date(), "Date cannot be in the future"),
    time: timeSchema.nullable().optional(),
    placeName: z.string().trim().min(2).max(200),
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    timezone: timezoneSchema,
  })
  .strict();
export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get(
  "/me",
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId);
    if (!u) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    ok(res, {
      id: u.id,
      email: u.email,
      name: u.name,
      onboardingComplete: u.onboardingComplete,
      birth: u.birth,
      nameSign: u.nameSign,
      sunSign: u.sunSign,
      prefs: u.prefs,
    });
  }),
);
usersRouter.patch(
  "/me",
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        birth: birthSchema.optional(),
        prefs: z
          .object({
            dailyHoroscope: z.boolean().optional(),
            astrologerOnline: z.boolean().optional(),
            chat: z.boolean().optional(),
            notifyTime: timeSchema.optional(),
            timezone: timezoneSchema.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .parse(req.body);
    const u = await User.findById(req.userId);
    if (!u) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    if (body.birth && !body.name && !u.name)
      throw new AppError(
        400,
        "NAME_REQUIRED",
        "A name is required with birth details",
      );
    if (body.name) {
      u.name = body.name;
      u.nameSign = nameSign(body.name);
    }
    if (body.birth) {
      u.birth = body.birth as any;
      u.nameSign = nameSign(u.name || "");
      u.sunSign = sunSign(body.birth.dob);
      u.onboardingComplete = true;
    }
    if (body.prefs)
      for (const [key, value] of Object.entries(body.prefs))
        u.set(`prefs.${key}`, value);
    await u.save();
    ok(res, {
      id: u.id,
      email: u.email,
      name: u.name,
      onboardingComplete: u.onboardingComplete,
      birth: u.birth,
      nameSign: u.nameSign,
      sunSign: u.sunSign,
      prefs: u.prefs,
    });
  }),
);
usersRouter.delete(
  "/me",
  asyncRoute(async (req: AuthRequest, res) => {
    const transaction = await mongoose.startSession();
    try {
      await transaction.withTransaction(async () => {
        const user = await User.findById(req.userId).session(transaction);
        if (!user)
          throw new AppError(401, "UNAUTHORIZED", "Please sign in again");
        if (user.role !== "user")
          throw new AppError(
            403,
            "DELETION_REQUIRES_SUPPORT",
            "Please contact support to delete this account",
          );
        const threads = await ChatThread.find({ userId: user._id })
          .select("_id")
          .session(transaction)
          .lean();
        await ChatMessage.deleteMany(
          { threadId: { $in: threads.map((thread) => thread._id) } },
          { session: transaction },
        );
        await ChatThread.deleteMany(
          { userId: user._id },
          { session: transaction },
        );
        await TarotReading.deleteMany(
          { userId: user._id },
          { session: transaction },
        );
        await Kundli.deleteMany({ userId: user._id }, { session: transaction });
        await DeviceToken.deleteMany(
          { userId: user._id },
          { session: transaction },
        );
        await AstrologerSubscription.deleteMany(
          { userId: user._id },
          { session: transaction },
        );
        await Session.deleteMany(
          { userId: user._id },
          { session: transaction },
        );
        await OtpChallenge.deleteMany(
          { email: user.email },
          { session: transaction },
        );
        await User.deleteOne({ _id: user._id }, { session: transaction });
      });
      ok(res, { deleted: true });
    } finally {
      await transaction.endSession();
    }
  }),
);
export const kundliRouter = Router();
kundliRouter.use(requireAuth);
kundliRouter.get(
  "/",
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId);
    const birth = u?.birth;
    if (!birth || !birth.dob)
      throw new AppError(
        409,
        "BIRTH_DETAILS_REQUIRED",
        "Add birth details first",
      );
    const existing = await Kundli.findOne({ userId: u.id });
    const currentHash = createHash("sha256").update(JSON.stringify({
      dob: new Date(birth.dob).toISOString(),
      time: birth.time ?? null,
      lat: birth.lat,
      lng: birth.lng,
      timezone: birth.timezone,
    })).digest("hex");

    if (existing && existing.birthHash === currentHash && existing.computedAt && (Date.now() - new Date(existing.computedAt).getTime() < 86_400_000)) {
      return ok(res, existing);
    }
    const k = await Kundli.findOneAndUpdate(
      { userId: u.id },
      computeKundli(u.id, birth),
      { upsert: true, new: true },
    );
    ok(res, k);
  }),
);
kundliRouter.post(
  "/recompute",
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId);
    if (!u?.birth)
      throw new AppError(
        409,
        "BIRTH_DETAILS_REQUIRED",
        "Add birth details first",
      );
    const k = computeKundli(u.id, u.birth);
    await Kundli.findOneAndUpdate({ userId: u.id }, k, {
      upsert: true,
      new: true,
    });
    ok(res, k);
  }),
);
export const publicRouter = Router();
publicRouter.get(
  "/places/search",
  asyncRoute(async (req, res) => {
    const q = z.string().trim().min(2).max(100).parse(req.query.q);
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", q);
    url.searchParams.set("count", "8");
    url.searchParams.set("language", "en");
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new AppError(
        503,
        "PLACES_UNAVAILABLE",
        "Place search is temporarily unavailable",
      );
    }
    if (!response.ok)
      throw new AppError(
        503,
        "PLACES_UNAVAILABLE",
        "Place search is temporarily unavailable",
      );
    const payload = z
      .object({
        results: z
          .array(
            z.object({
              name: z.string(),
              admin1: z.string().optional(),
              country: z.string().optional(),
              latitude: z.number(),
              longitude: z.number(),
              timezone: z.string().optional(),
            }),
          )
          .optional(),
      })
      .parse(await response.json());
    ok(
      res,
      (payload.results ?? [])
        .filter((place) => place.timezone)
        .map((place) => ({
          name: [place.name, place.admin1, place.country]
            .filter(Boolean)
            .join(", "),
          lat: place.latitude,
          lng: place.longitude,
          timezone: place.timezone,
        })),
    );
  }),
);
publicRouter.get(
  "/horoscope/today",
  requireAuth,
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId);
    const sign = u?.nameSign?.name;
    const content = typeof sign === "string" ? seedHoroscope(sign) : null;
    if (!content)
      throw new AppError(
        409,
        "NAME_SIGN_REQUIRED",
        "Complete your profile to see your horoscope",
      );
    const timezone = u?.prefs?.timezone || u?.birth?.timezone || "UTC";
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
    } catch {
      throw new AppError(
        400,
        "TIMEZONE_INVALID",
        "Update your profile timezone to see your horoscope",
      );
    }
    const part = (type: string) =>
      parts.find((value) => value.type === type)?.value;
    const date = `${part("year")}-${part("month")}-${part("day")}`;
    let h;
    try {
      h = await DailyHoroscope.findOneAndUpdate(
        { sign, date },
        { $setOnInsert: { sign, date, ...content } },
        { upsert: true, new: true, setDefaultsOnInsert: false },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      )
        h = await DailyHoroscope.findOne({ sign, date });
      else throw error;
    }
    if (!h)
      throw new AppError(
        503,
        "HOROSCOPE_UNAVAILABLE",
        "Horoscope is temporarily unavailable",
      );
    ok(res, h);
  }),
);
export const tarotRouter = Router();
tarotRouter.use(requireAuth);
tarotRouter.get(
  "/cards",
  asyncRoute(async (_req, res) => {
    const cards = await TarotCard.find().sort({ number: 1 }).lean();
    if (cards.length < 8)
      throw new AppError(
        503,
        "TAROT_UNAVAILABLE",
        "Tarot cards are not available yet",
      );
    for (let i = cards.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    ok(
      res,
      cards.slice(0, 8).map((card) => ({ id: card._id.toString() })),
    );
  }),
);
tarotRouter.post(
  "/readings",
  asyncRoute(async (req: AuthRequest, res) => {
    const { topic, cardIds } = z
      .object({
        topic: z.enum(["Career", "Love", "Health", "Money", "General"]),
        cardIds: z
          .array(
            z
              .string()
              .regex(/^[a-f\d]{24}$/i)
              .transform((id) => id.toLowerCase()),
          )
          .length(3)
          .refine(
            (ids) => new Set(ids).size === 3,
            "Choose three different cards",
          ),
      })
      .parse(req.body);
    const cards = await TarotCard.find({ _id: { $in: cardIds } });
    if (cards.length !== 3)
      throw new AppError(400, "INVALID_CARDS", "Choose three valid cards");
    const positions = ["Past", "Present", "Future"];
    const byId = new Map(cards.map((card) => [card.id, card]));
    const reading = await TarotReading.create({
      userId: req.userId,
      topic,
      cards: cardIds.map((id, i) => {
        const c = byId.get(id)!;
        return {
          cardId: c.id,
          position: positions[i],
          name: c.name,
          numeral: c.numeral,
          artKey: c.artKey,
          meaning: c.meanings?.[positions[i].toLowerCase()],
        };
      }),
      interpretation:
        "Reflect on these symbols as gentle prompts, not predictions.",
    });
    ok(res, reading, 201);
  }),
);
tarotRouter.get(
  "/readings/:id",
  asyncRoute(async (req: AuthRequest, res) => {
    const id = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(req.params.id);
    const reading = await TarotReading.findOne({ _id: id, userId: req.userId });
    if (!reading)
      throw new AppError(404, "READING_NOT_FOUND", "Reading not found");
    ok(res, reading);
  }),
);
export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get(
  "/threads",
  asyncRoute(async (req: AuthRequest, res) => {
    const threads = await ChatThread.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .lean();
    ok(res, threads);
  }),
);

chatRouter.get(
  "/threads/:id/messages",
  asyncRoute(async (req: AuthRequest, res) => {
    const id = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(req.params.id);
    const thread = await ChatThread.findOne({ _id: id, userId: req.userId });
    if (!thread) throw new AppError(404, "THREAD_NOT_FOUND", "Thread not found");
    const messages = await ChatMessage.find({ threadId: id })
      .sort({ createdAt: 1 })
      .lean();
    ok(res, messages);
  }),
);

function buildVedicPrompt(u: any, kundli: any) {
  const userName = u?.name?.trim() || "Seeker";
  const planetsSummary = kundli?.planets?.length
    ? kundli.planets.map((p: any) => `${p.id} in ${p.sign}${p.house ? ` (House ${p.house})` : ""}`).join(", ")
    : "Not calculated yet";

  const dashaSummary = kundli?.dasha?.current
    ? `${kundli.dasha.current.planet} Mahadasha${kundli.dasha.current.subperiod ? ` with ${kundli.dasha.current.subperiod.planet} Antardasha` : ""}`
    : "General lifecycle period";

  const birthDateStr = u?.birth?.dob ? new Date(u.birth.dob).toISOString().split("T")[0] : "Unknown";

  return `You are Astro Galexa AI, a wise, compassionate, and deeply knowledgeable Vedic astrologer.
You are in a direct one-on-one consultation with the user.

USER PROFILE & ASTROLOGICAL DATA:
- Full Name: ${userName}
- Birth Date: ${birthDateStr}
- Birth Time: ${u?.birth?.time || "Not provided"}
- Birth Place: ${u?.birth?.placeName || "Not provided"}
- Lagna (Ascendant): ${kundli?.ascendant?.sign || "Unknown"}
- Chandra Rashi (Moon Sign): ${kundli?.moonSign || "Unknown"}
- Surya Rashi (Sun Sign): ${u?.sunSign || "Unknown"}
- Nakshatra: ${kundli?.nakshatra?.name || "Unknown"}
- Current Running Dasha: ${dashaSummary}
- Planetary House Placements: ${planetsSummary}

RESPONSE GUIDELINES:
1. Always greet the user warmly by their name (${userName}).
2. Directly answer their question using their authentic Vedic placements (mention their relevant house, planetary placement, Moon sign, or current running Dasha when answering).
3. If their birth time is approximate or unknown, provide general Moon-sign/Nakshatra guidance while noting that exact house details depend on birth time.
4. Keep the tone compassionate, uplifting, practical, and grounded. Never give fatalistic predictions or medical/legal advice.
5. Offer practical spiritual and behavioral remedies (e.g. mindfulness, clarity, focus, positive habits) suited to their current planetary period.`;
}

chatRouter.post(
  "/ai",
  asyncRoute(async (req: AuthRequest, res) => {
    const { text, threadId } = z
      .object({
        text: z.string().trim().min(1).max(2000),
        threadId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      })
      .parse(req.body);

    const groqOrOpenAiKey = env.GROQ_API_KEY || env.AI_API_KEY;
    const geminiKey = env.GEMINI_API_KEY;
    const activeKey = groqOrOpenAiKey || geminiKey;

    if (!activeKey) {
      throw new AppError(
        503,
        "AI_UNAVAILABLE",
        "AI chat is temporarily unavailable",
      );
    }

    let thread = threadId
      ? await ChatThread.findOne({ _id: threadId, userId: req.userId })
      : null;
    if (!thread) {
      thread = await ChatThread.create({
        type: "ai",
        userId: req.userId,
        status: "active",
        startedAt: new Date(),
      });
    }

    await ChatMessage.create({ threadId: thread._id, sender: "user", text });

    const [u, kundli] = await Promise.all([
      User.findById(req.userId).lean(),
      Kundli.findOne({ userId: req.userId }).lean(),
    ]);

    const sysPrompt = buildVedicPrompt(u, kundli);

    let aiText = "The celestial bodies invite patience and clarity today.";
    try {
      if (groqOrOpenAiKey) {
        const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqOrOpenAiKey}`,
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: text },
            ],
            temperature: 0.7,
            max_tokens: 600,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data = await response.json();
          aiText = data.choices?.[0]?.message?.content || aiText;
        }
      } else if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${sysPrompt}\n\nUser: ${text}` }],
              },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data = await response.json();
          aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || aiText;
        }
      }
    } catch {
      // Graceful fallback
    }

    const aiMsg = await ChatMessage.create({
      threadId: thread._id,
      sender: "ai",
      text: aiText,
    });
    ok(res, { text: aiText, threadId: thread._id, message: aiMsg });
  }),
);

chatRouter.post(
  "/ai/stream",
  asyncRoute(async (req: AuthRequest, res) => {
    const { text, threadId } = z
      .object({
        text: z.string().trim().min(1).max(2000),
        threadId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      })
      .parse(req.body);

    const groqOrOpenAiKey = env.GROQ_API_KEY || env.AI_API_KEY;
    const geminiKey = env.GEMINI_API_KEY;
    const activeKey = groqOrOpenAiKey || geminiKey;

    if (!activeKey) {
      throw new AppError(
        503,
        "AI_UNAVAILABLE",
        "AI chat is temporarily unavailable",
      );
    }

    let thread = threadId
      ? await ChatThread.findOne({ _id: threadId, userId: req.userId })
      : null;
    if (!thread) {
      thread = await ChatThread.create({
        type: "ai",
        userId: req.userId,
        status: "active",
        startedAt: new Date(),
      });
    }

    await ChatMessage.create({ threadId: thread._id, sender: "user", text });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const [u, kundli] = await Promise.all([
      User.findById(req.userId).lean(),
      Kundli.findOne({ userId: req.userId }).lean(),
    ]);

    const sysPrompt = buildVedicPrompt(u, kundli);

    let fullText = "The celestial alignment suggests quiet contemplation.";
    try {
      if (groqOrOpenAiKey) {
        const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqOrOpenAiKey}`,
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: text },
            ],
            temperature: 0.7,
            max_tokens: 600,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data = await response.json();
          fullText = data.choices?.[0]?.message?.content || fullText;
          res.write(`data: ${JSON.stringify({ text: fullText, threadId: thread._id })}\n\n`);
        }
      } else if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${sysPrompt}\n\nUser: ${text}` }],
              },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data = await response.json();
          fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || fullText;
          res.write(`data: ${JSON.stringify({ text: fullText, threadId: thread._id })}\n\n`);
        }
      }
    } catch {
      res.write(`data: ${JSON.stringify({ text: fullText, threadId: thread._id })}\n\n`);
    }

    await ChatMessage.create({ threadId: thread._id, sender: "ai", text: fullText });
    res.write("data: [DONE]\n\n");
    res.end();
  }),
);
export const astrologersRouter = Router();
astrologersRouter.use(requireAuth);
astrologersRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const specialty = z
      .enum(["All", "Career", "Love", "Health"])
      .optional()
      .parse(req.query.specialty);
    ok(
      res,
      await Astrologer.find(
        specialty && specialty !== "All"
          ? { verified: true, specialties: specialty }
          : { verified: true },
      )
        .select(
          "name specialties languages experienceYears ratingAvg ratingCount pricePerMinute status busyUntil verified",
        )
        .lean(),
    );
  }),
);
