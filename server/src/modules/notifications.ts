import crypto from "node:crypto";
import { Router } from "express";
import { DateTime } from "luxon";
import { env } from "../common/config.js";
import { AppError, asyncRoute, ok } from "../common/http.js";
import { DailyHoroscope, DeviceToken, User } from "../models.js";
import { localizeHoroscope, seedHoroscope } from "./horoscope-content.js";

export type ExpoPushPayload = {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  channelId?: string;
  data?: Record<string, unknown>;
};

type PushLogger = {
  info?: (obj: unknown, msg?: string) => void;
  warn?: (obj: unknown, msg?: string) => void;
};

export async function sendExpoPushMessages(
  messages: ExpoPushPayload[],
  logger?: PushLogger,
): Promise<{ sent: number }> {
  const valid = messages.filter((m) => Boolean(m.to && m.to.trim()));
  if (valid.length === 0) return { sent: 0 };

  let sent = 0;
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
    }

    try {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        logger?.warn?.({ status: resp.status }, "Expo push dispatch returned non-OK status");
        continue;
      }
      const json = (await resp.json().catch(() => null)) as {
        data?: { status?: string; details?: { error?: string } }[];
      } | null;
      const tickets = Array.isArray(json?.data) ? json.data : [];
      const deadTokens: string[] = [];
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === "ok") {
          sent += 1;
        } else if (ticket?.details?.error === "DeviceNotRegistered" && batch[idx]?.to) {
          deadTokens.push(batch[idx].to);
        }
      });
      if (deadTokens.length > 0) {
        await DeviceToken.deleteMany({ token: { $in: deadTokens } });
      }
      if (tickets.length === 0) sent += batch.length;
    } catch (err) {
      logger?.warn?.(
        { err: err instanceof Error ? err.message : "unknown" },
        "Expo push request failed",
      );
    }
  }
  return { sent };
}

export async function runDailyHoroscopePushSweep(logger?: PushLogger): Promise<number> {
  const tokenUsers = await DeviceToken.distinct("userId");
  if (!tokenUsers.length) return 0;

  const candidates = await User.find({
    _id: { $in: tokenUsers },
    "prefs.dailyHoroscope": { $ne: false },
    "nameSign.name": { $exists: true },
  })
    .select("_id name language prefs birth nameSign lastDailyPushOn")
    .lean();

  let totalSent = 0;
  for (const user of candidates) {
    const sign = (user.nameSign as { name?: string } | undefined)?.name;
    if (!sign) continue;
    const rawTz = user.prefs?.timezone || user.birth?.timezone || "UTC";
    const dt = DateTime.now().setZone(rawTz);
    const localNow = dt.isValid ? dt : DateTime.now().setZone("UTC");
    const todayDate = localNow.toFormat("yyyy-LL-dd");
    const currentHHMM = localNow.toFormat("HH:mm");
    const targetHHMM = user.prefs?.notifyTime || "08:00";

    if (user.lastDailyPushOn === todayDate || currentHHMM < targetHHMM) continue;

    // Claim daily push atomically across workers/pods
    const claimed = await User.findOneAndUpdate(
      { _id: user._id, lastDailyPushOn: { $ne: todayDate } },
      { $set: { lastDailyPushOn: todayDate } },
      { new: true },
    );
    if (!claimed) continue;

    const baseContent = seedHoroscope(sign);
    if (!baseContent) continue;

    let h = await DailyHoroscope.findOne({ sign, date: todayDate }).lean();
    if (!h) {
      try {
        h = await DailyHoroscope.findOneAndUpdate(
          { sign, date: todayDate },
          { $setOnInsert: { sign, date: todayDate, ...baseContent } },
          { upsert: true, new: true, setDefaultsOnInsert: false },
        ).lean();
      } catch {
        h = await DailyHoroscope.findOne({ sign, date: todayDate }).lean();
      }
    }
    const lang = user.language || user.prefs?.language || "English";
    const localized = localizeHoroscope(
      { sign, text: h?.text || baseContent.text, advice: h?.advice || baseContent.advice, luckyColor: h?.luckyColor || baseContent.luckyColor },
      lang,
    );

    const tokens = await DeviceToken.find({ userId: user._id }).select("token").lean();
    if (!tokens.length) continue;

    const title =
      lang === "Hindi"
        ? `✦ आज का राशिफल · ${sign}`
        : lang === "Hinglish"
          ? `✦ Aaj Ka Rashifal · ${sign}`
          : `✦ Daily Cosmic Guidance · ${sign}`;

    const validTokens = tokens.filter((t) => Boolean(t.token));
    const result = await sendExpoPushMessages(
      validTokens.map((t) => ({
        to: t.token ?? "",
        title,
        body: localized.text || baseContent.text,
        sound: "default",
        channelId: "daily-guidance",
        data: { screen: "home", type: "daily_horoscope" },
      })),
      logger,
    );
    totalSent += result.sent;
  }
  return totalSent;
}

export function startDailyNotificationScheduler(logger?: PushLogger) {
  const timer = setInterval(() => {
    void runDailyHoroscopePushSweep(logger).catch((err) => {
      logger?.warn?.(
        { err: err instanceof Error ? err.message : "unknown" },
        "Daily push sweep error",
      );
    });
  }, 60_000);
  timer.unref();
  return timer;
}

export const cronRouter = Router();

/**
 * External cron trigger (e.g. cron-job.org on Render Free Tier) to run the daily push sweep even after cold sleep.
 */
cronRouter.post(
  "/daily-push",
  asyncRoute(async (req, res) => {
    const expectedSecret = env.CRON_SECRET;
    if (!expectedSecret) {
      throw new AppError(
        503,
        "CRON_NOT_CONFIGURED",
        "Cron push trigger is not configured",
      );
    }

    const headerSecret = req.header("x-cron-secret")?.trim();
    const bearerSecret = req
      .header("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim();
    const candidate = headerSecret || bearerSecret || "";

    const expectedBuf = Buffer.from(expectedSecret);
    const providedBuf = Buffer.from(candidate);
    if (
      expectedBuf.length === 0 ||
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid cron secret");
    }

    const sent = await runDailyHoroscopePushSweep(req.log);
    ok(res, { swept: true, sent, sweptAt: new Date().toISOString() });
  }),
);
