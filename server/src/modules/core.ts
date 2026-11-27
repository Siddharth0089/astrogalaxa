import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { createHash, randomInt } from "node:crypto";
import { DateTime } from "luxon";
import { env } from "../common/config.js";
import { tarotContent } from "../seeds/tarot-content.js";
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
import {
  computeKundli,
  computeMatch,
  computePanchang,
  computeTransits,
  ENGINE_VERSION,
} from "./kundli-engine.js";
import { localizeHoroscope, seedHoroscope } from "./horoscope-content.js";

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
      gender: u.gender ?? null,
      language: u.language || u.prefs?.language || "English",
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
        gender: z.enum(["male", "female", "other"]).optional(),
        language: z.enum(["English", "Hindi", "Hinglish"]).optional(),
        birth: birthSchema.optional(),
        prefs: z
          .object({
            language: z.string().optional(),
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
    if (body.gender) {
      u.gender = body.gender;
    }
    if (body.language) {
      u.language = body.language;
      u.set("prefs.language", body.language);
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
      gender: u.gender ?? null,
      language: u.language || u.prefs?.language || "English",
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

    if (
      existing &&
      existing.birthHash === currentHash &&
      existing.engineVersion === ENGINE_VERSION &&
      existing.avakhada &&
      existing.d9
    ) {
      const plain = existing.toObject();
      const transits = computeTransits(plain.moonSign || "Aries");
      return ok(res, { ...plain, transits });
    }
    const k = await Kundli.findOneAndUpdate(
      { userId: u.id },
      computeKundli(u.id, birth),
      { upsert: true, new: true },
    );
    const plain = k.toObject();
    const transits = computeTransits(plain.moonSign || "Aries");
    ok(res, { ...plain, transits });
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
    const transits = computeTransits(k.moonSign || "Aries");
    ok(res, { ...k, transits });
  }),
);
kundliRouter.post(
  "/match",
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId);
    if (!u?.birth || !u.birth.dob)
      throw new AppError(
        409,
        "BIRTH_DETAILS_REQUIRED",
        "Complete your own birth details first",
      );
    const body = z
      .object({
        partnerName: z.string().trim().min(1).max(100),
        partner: birthSchema,
      })
      .strict()
      .parse(req.body);
    const result = computeMatch(u.birth, body.partner, u.gender);
    ok(res, {
      partnerName: body.partnerName,
      ...result,
    });
  }),
);
export const publicRouter = Router();
publicRouter.get(
  "/panchang/today",
  requireAuth,
  asyncRoute(async (req: AuthRequest, res) => {
    const u = await User.findById(req.userId).lean();
    const tz = u?.prefs?.timezone || u?.birth?.timezone || "Asia/Kolkata";
    ok(res, computePanchang(tz));
  }),
);
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
    const preferredLang = u?.language || u?.prefs?.language || "English";
    const plain = typeof h.toObject === "function" ? h.toObject() : h;
    ok(res, localizeHoroscope(plain, preferredLang));
  }),
);
export const tarotRouter = Router();
tarotRouter.use(requireAuth);

const MAX_DAILY_TAROT_CARDS = 3;

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Career: [
    "career", "work", "job", "promotion", "business", "boss", "office",
    "interview", "study", "exam", "project", "leadership", "victory",
    "mastery", "craft", "ambition", "teamwork", "vision", "planning",
    "discipline", "initiative", "skill", "wands", "pentacles",
  ],
  Love: [
    "love", "relationship", "partner", "marriage", "crush", "ex", "husband",
    "wife", "dating", "romance", "soul", "heart", "bond", "family",
    "harmony", "affection", "compassion", "union", "loyalty", "cups",
  ],
  Health: [
    "health", "healing", "body", "recovery", "rest", "peace", "stress",
    "anxiety", "sleep", "energy", "vitality", "balance", "moderation",
    "wellbeing", "wellness", "calm", "strength", "renewal", "hope", "doctor",
  ],
  Money: [
    "money", "wealth", "finance", "financial", "salary", "income", "invest",
    "investment", "property", "house", "debt", "loan", "profit", "savings",
    "prosperity", "abundance", "generosity", "security", "legacy", "pentacles",
  ],
  General: [],
};

const TOPIC_MAJOR_CARDS: Record<string, Set<string>> = {
  Career: new Set([
    "The Magician", "The Emperor", "The Hierophant", "The Chariot",
    "Strength", "Justice", "Wheel of Fortune", "The Sun", "Judgement", "The World",
  ]),
  Love: new Set([
    "The Lovers", "The Empress", "The High Priestess", "Strength",
    "Temperance", "The Star", "The Sun", "The Moon", "The World",
  ]),
  Health: new Set([
    "The Empress", "Strength", "Temperance", "The Star", "The Sun",
    "The Hermit", "The Hanged Man", "Judgement", "The Fool",
  ]),
  Money: new Set([
    "The Empress", "The Emperor", "The Magician", "Wheel of Fortune",
    "Justice", "The Sun", "The World", "The Devil",
  ]),
  General: new Set(),
};

const FILTER_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "will", "should",
  "what", "when", "where", "which", "would", "could", "have", "about",
  "into", "your", "mine", "they", "them", "been", "does", "doing", "getting",
]);

function extractQueryTokens(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FILTER_STOPWORDS.has(w));
}

function scoreCardRelevance(
  card: {
    name?: string;
    suit?: string;
    keywords?: string[];
    meanings?: Record<string, string>;
  },
  topic: string,
  questionTokens: string[],
): number {
  let score = 0;
  const suit = card.suit || "Major";
  const name = card.name || "";

  // Suit & Major Arcana resonance with Life Area
  if (topic === "Career") {
    if (suit === "Wands" || suit === "Pentacles") score += 6;
    if (TOPIC_MAJOR_CARDS.Career.has(name)) score += 6;
  } else if (topic === "Love") {
    if (suit === "Cups") score += 7;
    if (TOPIC_MAJOR_CARDS.Love.has(name)) score += 6;
    if (name === "Four of Wands" || name === "Ten of Pentacles") score += 5;
  } else if (topic === "Money") {
    if (suit === "Pentacles") score += 7;
    if (TOPIC_MAJOR_CARDS.Money.has(name)) score += 6;
    if (name === "Three of Wands" || name === "Nine of Cups") score += 5;
  } else if (topic === "Health") {
    if (TOPIC_MAJOR_CARDS.Health.has(name)) score += 7;
    if (suit === "Pentacles") score += 4;
    if (suit === "Cups") score += 3;
    if (
      name === "Four of Swords" ||
      name === "Six of Swords" ||
      name === "Nine of Swords" ||
      name === "Ten of Wands"
    ) {
      score += 6;
    }
  } else {
    score += 1;
  }

  // Question & domain keyword matching across card symbols and meanings
  const haystack = [
    name,
    suit,
    ...(card.keywords || []),
    card.meanings?.upright || "",
    card.meanings?.reversed || "",
    card.meanings?.love || "",
    card.meanings?.career || "",
    card.meanings?.advice || "",
  ]
    .join(" ")
    .toLowerCase();

  for (const kw of TOPIC_KEYWORDS[topic] || []) {
    if (haystack.includes(kw)) score += 1;
  }
  for (const token of questionTokens) {
    if (haystack.includes(token)) score += 5;
    for (const [domain, domainWords] of Object.entries(TOPIC_KEYWORDS)) {
      if (domainWords.some((w) => w.includes(token) || token.includes(w))) {
        if (
          (domain === "Love" && suit === "Cups") ||
          (domain === "Money" && suit === "Pentacles") ||
          (domain === "Career" && (suit === "Wands" || suit === "Pentacles")) ||
          (domain === "Health" && TOPIC_MAJOR_CARDS.Health.has(name))
        ) {
          score += 3;
        }
      }
    }
  }
  return score;
}

function getCardTopicInsight(
  meanings: Record<string, string> | undefined,
  keywords: string[] | undefined,
  topic: string,
  isRev: boolean,
): string {
  const k1 = keywords?.[0] || "clarity";
  const k2 = keywords?.[1] || "awareness";
  const baseReversed = meanings?.reversed || "";
  const baseUpright = meanings?.upright || "";

  let raw = baseUpright;
  if (topic === "Love") {
    raw =
      meanings?.love ||
      `In love, nurture ${k1} and honest ${k2} to strengthen emotional harmony.`;
  } else if (topic === "Career") {
    raw =
      meanings?.career ||
      `In your career, channel ${k1} and disciplined ${k2} toward tangible progress.`;
  } else if (topic === "Money") {
    raw =
      meanings?.money ||
      `Financially, lean into ${k1} and prudent ${k2}; stay mindful before making commitments (${baseUpright.toLowerCase()}).`;
  } else if (topic === "Health") {
    raw =
      meanings?.health ||
      `For health & vitality, prioritize ${k1}, nervous-system balance, and restorative ${k2}.`;
  }

  if (isRev) {
    return baseReversed
      ? `${raw} (Reversed caution: watch for ${baseReversed.charAt(0).toLowerCase()}${baseReversed.slice(1)})`
      : `${raw} (Reversed: slow down and address hidden blocks around ${k1}.)`;
  }
  return raw;
}

async function getTarotDailyQuota(userId: string) {
  const u = await User.findById(userId)
    .select("prefs.timezone birth.timezone")
    .lean();
  const rawTz = u?.prefs?.timezone || u?.birth?.timezone || "UTC";
  const zone = DateTime.now().setZone(rawTz).isValid ? rawTz : "UTC";
  const startOfDay = DateTime.now().setZone(zone).startOf("day").toJSDate();
  const todaysReadings = await TarotReading.find({
    userId,
    createdAt: { $gte: startOfDay },
  })
    .sort({ createdAt: -1 })
    .select("_id cards")
    .lean();
  const usedToday = todaysReadings.reduce(
    (sum, r) => sum + (Array.isArray(r.cards) ? r.cards.length : 0),
    0,
  );
  const remainingToday = Math.max(0, MAX_DAILY_TAROT_CARDS - usedToday);
  return {
    maxDailyCards: MAX_DAILY_TAROT_CARDS,
    usedToday,
    remainingToday,
    todaysReadingId: todaysReadings[0]?._id?.toString() ?? null,
  };
}

tarotRouter.get(
  "/cards",
  asyncRoute(async (req, res) => {
    const showAll = req.query.all === "true";
    const unfiltered = req.query.unfiltered === "true";
    const topic = typeof req.query.topic === "string" ? req.query.topic : "General";
    const question = typeof req.query.q === "string" ? req.query.q.trim() : "";

    let cards = await TarotCard.find().sort({ number: 1 }).lean();
    if (showAll && cards.length < tarotContent.length) {
      await TarotCard.bulkWrite(
        tarotContent.map((card) => ({
          updateOne: {
            filter: { number: card.number },
            update: { $setOnInsert: card },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      cards = await TarotCard.find().sort({ number: 1 }).lean();
    }
    if (cards.length < 8)
      throw new AppError(
        503,
        "TAROT_UNAVAILABLE",
        "Tarot cards are not available yet",
      );

    // Shuffle first so tied relevance scores vary fairly each shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const shouldFilter =
      showAll &&
      !unfiltered &&
      ((topic && topic !== "General") || question.length > 0);

    let selected = cards;
    if (shouldFilter) {
      const tokens = extractQueryTokens(question);
      const ranked = cards
        .map((c) => ({
          card: c,
          score: scoreCardRelevance(
            c as {
              name?: string;
              suit?: string;
              keywords?: string[];
              meanings?: Record<string, string>;
            },
            topic,
            tokens,
          ),
        }))
        .sort((a, b) => b.score - a.score);
      // 30 cards = 5 full rows of 6 aligned to their question & life area
      selected = ranked.slice(0, Math.min(30, ranked.length)).map((r) => r.card);
      // Re-shuffle selected relevant cards so positions remain unpredictable
      for (let i = selected.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
    } else if (!showAll) {
      selected = cards.slice(0, 8);
    }

    ok(
      res,
      selected.map((card) => ({ id: card._id.toString() })),
    );
  }),
);
tarotRouter.get(
  "/quota",
  asyncRoute(async (req: AuthRequest, res) => {
    ok(res, await getTarotDailyQuota(req.userId!));
  }),
);
tarotRouter.get(
  "/readings",
  asyncRoute(async (req: AuthRequest, res) => {
    const readings = await TarotReading.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    ok(res, readings);
  }),
);
tarotRouter.post(
  "/readings",
  asyncRoute(async (req: AuthRequest, res) => {
    const { topic, cardIds, mode = "threeCard", question, orientations = [] } = z
      .object({
        topic: z.enum(["Career", "Love", "Health", "Money", "General"]).default("General"),
        mode: z.enum(["daily", "threeCard", "yesNo"]).optional(),
        question: z.string().trim().max(500).optional(),
        orientations: z.array(z.enum(["upright", "reversed"])).optional(),
        cardIds: z
          .array(
            z
              .string()
              .regex(/^[a-f\d]{24}$/i)
              .transform((id) => id.toLowerCase()),
          )
          .min(1)
          .max(3)
          .refine(
            (ids) => new Set(ids).size === ids.length,
            "Choose different cards",
          ),
      })
      .parse(req.body);
    const cards = await TarotCard.find({ _id: { $in: cardIds } });
    if (cards.length !== cardIds.length)
      throw new AppError(400, "INVALID_CARDS", "Choose valid cards");
    const quota = await getTarotDailyQuota(req.userId!);
    if (quota.usedToday + cardIds.length > quota.maxDailyCards) {
      throw new AppError(
        429,
        "TAROT_DAILY_LIMIT",
        quota.remainingToday === 0
          ? "You have drawn all 3 daily Tarot cards for today. Revisit today's reading in your Journal or ask AI Pandit."
          : `You have ${quota.remainingToday} card${quota.remainingToday === 1 ? "" : "s"} remaining today. Choose a 1-card spread or check back tomorrow.`,
      );
    }
    const defaultMode = mode || (cardIds.length === 1 ? "daily" : "threeCard");
    const positions =
      cardIds.length === 1
        ? ["Focus"]
        : defaultMode === "yesNo"
          ? ["Influence", "Obstacle", "Outcome"]
          : ["Past", "Present", "Future"];
    const byId = new Map(cards.map((card) => [card.id, card]));
    const drawnCards = cardIds.map((id, i) => {
      const c = byId.get(id)!;
      const orient = orientations[i] || "upright";
      const isRev = orient === "reversed";
      const posKey = (positions[i] || "").toLowerCase();
      const meanings = c.meanings as Record<string, string> | undefined;
      const rawYesNo = meanings?.yesNo || "Maybe";
      const adjustedYesNo = isRev
        ? rawYesNo === "Yes"
          ? "Maybe"
          : "No"
        : rawYesNo;
      const topicInsight = getCardTopicInsight(meanings, c.keywords, topic, isRev);
      return {
        cardId: c.id,
        position: positions[i] || `Card ${i + 1}`,
        name: c.name,
        numeral: c.numeral,
        suit: c.suit || "Major",
        artKey: c.artKey,
        orientation: orient,
        keywords: c.keywords,
        meaning: isRev
          ? (meanings?.reversed || meanings?.upright || meanings?.[posKey])
          : (meanings?.upright || meanings?.[posKey]),
        topicInsight,
        past: meanings?.past,
        present: meanings?.present,
        future: meanings?.future,
        love: meanings?.love,
        career: meanings?.career,
        money: topic === "Money" ? topicInsight : undefined,
        health: topic === "Health" ? topicInsight : undefined,
        advice: meanings?.advice,
        yesNo: adjustedYesNo,
      };
    });

    const currentUser = await User.findById(req.userId)
      .select("language prefs.language")
      .lean();
    const preferredLang =
      currentUser?.language || currentUser?.prefs?.language || "English";

    const qLead = question
      ? preferredLang === "Hindi"
        ? `"${question}" (${topic}) के उत्तर में: `
        : preferredLang === "Hinglish"
          ? `"${question}" (${topic}) ke jawab me: `
          : `In response to "${question}" (${topic}): `
      : preferredLang === "Hindi"
        ? `${topic} टैरो सारांश: `
        : preferredLang === "Hinglish"
          ? `${topic} Tarot Summary: `
          : `${topic} Reading Summary: `;
    const verdictLead =
      defaultMode === "yesNo"
        ? preferredLang === "Hindi"
          ? `${drawnCards[0]?.name} (${drawnCards[0]?.orientation}) के अनुसार संकेत "${drawnCards[0]?.yesNo || "Maybe"}" की ओर है। `
          : preferredLang === "Hinglish"
            ? `${drawnCards[0]?.name} (${drawnCards[0]?.orientation}) ke hisab se oracle sanket "${drawnCards[0]?.yesNo || "Maybe"}" ki taraf hai. `
            : `Oracle verdict leans ${drawnCards[0]?.yesNo || "Maybe"} through ${drawnCards[0]?.name} (${drawnCards[0]?.orientation}). `
        : "";
    let interpretation =
      qLead +
      verdictLead +
      drawnCards
        .map(
          (c) =>
            `${c.position} (${c.name}, ${c.orientation}): ${c.topicInsight || c.meaning}`,
        )
        .join(" ") +
      (drawnCards[drawnCards.length - 1]?.advice
        ? ` ${
            preferredLang === "Hindi"
              ? "मुख्य सलाह:"
              : preferredLang === "Hinglish"
                ? "Khaas Salah:"
                : "Key Advice:"
          } ${drawnCards[drawnCards.length - 1].advice}`
        : "");

    const groqOrOpenAiKey = env.GROQ_API_KEY || env.AI_API_KEY;
    if (groqOrOpenAiKey) {
      try {
        const prompt = `You are an intuitive, insightful Tarot reader for Astro Galaxa.
User Language: ${preferredLang} (reply naturally in this language).
Spread Mode: ${defaultMode}
Life Area: ${topic}
${question ? `User Question: "${question}" — address this question directly and practically.` : ""}
Cards Drawn:
${drawnCards.map((c) => `- ${c.position}: ${c.name} (${c.orientation}). Core Meaning: ${c.meaning}. ${topic} Lens: ${c.topicInsight}`).join("\n")}

Synthesize a cohesive 2-paragraph narrative reading interpreting these cards specifically for the user's question and life area. Provide inspiring, clear guidance without fatalism or medical/legal advice.`;

        const resp = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqOrOpenAiKey}`,
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            messages: [
              { role: "system", content: `You are a warm, empowering Tarot reader. Respond in ${preferredLang}.` },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 450,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          const d = await resp.json();
          interpretation = d.choices?.[0]?.message?.content || interpretation;
        }
      } catch {}
    }

    const reading = await TarotReading.create({
      userId: req.userId,
      mode: defaultMode,
      topic,
      question: question ?? null,
      cards: drawnCards,
      interpretation,
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

function buildVedicPrompt(u: any, kundli: any, recentTarot?: any) {
  const userName = u?.name?.trim() || "Seeker";
  const genderStr = u?.gender ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : "Not specified";
  const preferredLang = u?.language || u?.prefs?.language || "English";
  const planetsSummary = kundli?.planets?.length
    ? kundli.planets
        .map(
          (p: any) =>
            `${p.id} in ${p.sign}${p.house ? ` (House ${p.house})` : ""}${p.dignity && p.dignity !== "Neutral" ? ` [${p.dignity}]` : ""}${p.retrograde ? " [Retrograde]" : ""}${p.vargottama ? " [Vargottama]" : ""}`,
        )
        .join(", ")
    : "Not calculated yet";

  const yogasSummary = kundli?.yogas?.length
    ? kundli.yogas.map((y: any) => y.name).join(", ")
    : "Standard planetary combination";

  const liveTransits = kundli?.moonSign ? computeTransits(kundli.moonSign) : null;
  const transitSummary = liveTransits
    ? `Saturn Sade Sati: ${liveTransits.sadeSati.status}. Current Transits from Moon: ${liveTransits.planets.map((p: any) => `${p.id} in ${p.sign} (H${p.houseFromMoon})`).join(", ")}.`
    : "Unavailable";

  const dashaSummary = kundli?.dasha?.current
    ? `${kundli.dasha.current.planet} Mahadasha${kundli.dasha.current.subperiod ? ` with ${kundli.dasha.current.subperiod.planet} Antardasha` : ""}`
    : "General lifecycle period";

  const birthDateStr = u?.birth?.dob ? new Date(u.birth.dob).toISOString().split("T")[0] : "Unknown";

  const tarotContext = recentTarot?.cards?.length
    ? `Latest Tarot Reading (${recentTarot.mode || "spread"} on "${recentTarot.topic}"${recentTarot.question ? `, question: "${recentTarot.question}"` : ""}): ${recentTarot.cards.map((c: any) => `${c.position || "Card"}: ${c.name} (${c.orientation || "upright"})`).join("; ")}. Narrative: "${recentTarot.interpretation || ""}"`
    : "No recent tarot draw on record.";

  const languageRule =
    preferredLang === "Hindi"
      ? `2. STRICT LANGUAGE MANDATE: You MUST reply 100% in fluent, authentic HINDI written strictly in DEVANAGARI script (हिन्दी). Do NOT write sentences in English or Hinglish. Greet warmly with "नमस्ते".`
      : preferredLang === "Hinglish"
        ? `2. STRICT LANGUAGE MANDATE: You MUST reply in warm, natural conversational HINGLISH (Hindi written using the Roman/English alphabet blended with common Indian English terms, e.g., "Namaste! Aapki kundli ke hisab se..."). Do NOT use Devanagari script or pure formal English.`
        : `2. STRICT LANGUAGE MANDATE: You MUST reply 100% in clear, fluent ENGLISH ONLY. NEVER use Hindi or Hinglish greetings like "Namaste", "Aap", "Ji", or untranslated Hinglish phrases. Greet warmly with "Hello" or "Greetings", and write in plain eloquent English (translating or briefly clarifying Vedic terms like Ascendant, Moon Sign, or planetary period in English).`;

  return `You are Astro Galaxa AI, a wise, compassionate, and deeply knowledgeable Vedic astrologer and spiritual guide.
You are in a direct one-on-one consultation with the user.

USER PROFILE & AUTHENTIC ASTROLOGICAL DATA:
- Full Name: ${userName}
- Gender: ${genderStr}
- Preferred Language: ${preferredLang}
- Birth Date: ${birthDateStr}
- Birth Time: ${u?.birth?.time || "Not provided"}
- Birth Place: ${u?.birth?.placeName || "Not provided"}
- Ascendant (Lagna): ${kundli?.ascendant?.sign || "Unknown"}
- Moon Sign (Chandra Rashi): ${kundli?.moonSign || "Unknown"}
- Sun Sign (Surya Rashi): ${u?.sunSign || "Unknown"}
- Nakshatra: ${kundli?.nakshatra?.name || "Unknown"}${kundli?.nakshatra?.pada ? ` (Pada ${kundli.nakshatra.pada})` : ""}
- Navamsa (D9) Ascendant: ${kundli?.d9?.ascendant?.sign || "Unknown"}
- Active Yogas: ${yogasSummary}
- Active Planetary Period (Dasha): ${dashaSummary}
- Planetary Placements & Dignities: ${planetsSummary}
- Live Transits (Gochar): ${transitSummary}
- Recent Tarot Draw Context: ${tarotContext}

STRICT PANDIT GUIDELINES:
1. Always greet the user warmly by their name (${userName}) using ONLY the requested language (${preferredLang}). Address interpretations respectfully for a ${genderStr} seeker.
${languageRule}
3. Do NOT guess or hallucinate any planetary positions: strictly reference the authentic calculated placements and active planetary period provided in the data above.
4. Directly answer their question using their authentic placements (mention relevant house, planetary placement, Moon sign, or active planetary period when answering). If relevant or asked, weave their recent tarot draw into the guidance.
5. If their birth time is approximate or unknown, provide general Moon-sign/Nakshatra guidance while noting that exact house details depend on birth time.
6. Keep the tone compassionate, uplifting, practical, and grounded. Never give fatalistic predictions or medical/legal advice. Include gentle reminders that astrology provides reflection, not absolute fate.
7. Offer practical spiritual and behavioral remedies (e.g. mindfulness, clarity, focus, positive habits) suited to their current planetary period.`;
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

    // Fetch prior messages before saving current user message for context
    const priorMessages = await ChatMessage.find({ threadId: thread._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    await ChatMessage.create({ threadId: thread._id, sender: "user", text });

    const [u, kundli, recentTarot] = await Promise.all([
      User.findById(req.userId).lean(),
      Kundli.findOne({ userId: req.userId }).lean(),
      TarotReading.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
    ]);

    const sysPrompt = buildVedicPrompt(u, kundli, recentTarot);

    // Build multi-turn conversational history in chronological order
    const history = priorMessages.reverse().map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

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
              ...history,
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
        const historyText = history.map((h) => `${h.role === "user" ? "User" : "Pandit"}: ${h.content}`).join("\n");
        const promptWithHistory = `${sysPrompt}\n\nRecent Conversation:\n${historyText}\nUser: ${text}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: promptWithHistory }],
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

    const priorMessages = await ChatMessage.find({ threadId: thread._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    await ChatMessage.create({ threadId: thread._id, sender: "user", text });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const [u, kundli, recentTarot] = await Promise.all([
      User.findById(req.userId).lean(),
      Kundli.findOne({ userId: req.userId }).lean(),
      TarotReading.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
    ]);

    const sysPrompt = buildVedicPrompt(u, kundli, recentTarot);
    const history = priorMessages.reverse().map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

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
              ...history,
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
        const historyText = history.map((h) => `${h.role === "user" ? "User" : "Pandit"}: ${h.content}`).join("\n");
        const promptWithHistory = `${sysPrompt}\n\nRecent Conversation:\n${historyText}\nUser: ${text}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: promptWithHistory }],
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
