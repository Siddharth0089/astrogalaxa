import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import { OtpChallenge, OtpRequestLimit, Session, User } from "../models.js";
import { env } from "../common/config.js";
import { AppError, asyncRoute, ok } from "../common/http.js";
import {
  hashOtp,
  hashToken,
  randomToken,
  secureEquals,
} from "../common/crypto.js";

const authBody = z.object({
  deviceId: z.string().min(4).max(100),
  platform: z.enum(["ios", "android", "web"]),
});
const accessTokenFor = (user: { id: string; role?: string | null }, sessionId: string) => jwt.sign({ sub: user.id, sid: sessionId, role: user.role }, env.JWT_SECRET, { expiresIn: "15m", algorithm: "HS256" });
const issue = async (
  user: any,
  deviceId: string,
  platform: string,
  familyId: string = crypto.randomUUID(),
) => {
  const refreshToken = randomToken();
  const session = await Session.create({
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    familyId,
    deviceId,
    platform,
    expiresAt: new Date(Date.now() + 30 * 864e5),
  });
  const accessToken = accessTokenFor(user, session._id.toString());
  return {
    accessToken,
    refreshToken,
    user: publicUser(user),
    isNewUser: !user.emailVerified,
    onboardingComplete: user.onboardingComplete,
  };
};
const publicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  onboardingComplete: u.onboardingComplete,
  birth: u.birth,
  nameSign: u.nameSign,
  sunSign: u.sunSign,
  prefs: u.prefs,
});
export const authRouter = Router();
const requestLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, data: null, error: { code: "RATE_LIMITED", message: "Please try again later" } } });
const verifyLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, data: null, error: { code: "RATE_LIMITED", message: "Please try again later" } } });
authRouter.post(
  "/otp/request",
  requestLimiter,
  asyncRoute(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().max(254) })
      .parse(req.body);
    const normalized = email.toLowerCase();
    const now = Date.now();
    const hour = Math.floor(now / 3600000);
    const limitKey = crypto.createHmac("sha256", env.OTP_HMAC_SECRET).update(`otp-request:${normalized}:${hour}`).digest("hex");
    const incrementLimit = (upsert: boolean) => OtpRequestLimit.findOneAndUpdate({ key: limitKey }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((hour + 2) * 3600000) } }, { upsert, new: true, setDefaultsOnInsert: false });
    let counter;
    try { counter = await incrementLimit(true); }
    catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) counter = await incrementLimit(false); else throw error; }
    if (!counter) throw new AppError(503, "RATE_LIMIT_UNAVAILABLE", "Please try again later");
    if (counter.count > 5) return ok(res, { resendAfterSeconds: 30 });
    if (!env.RESEND_API_KEY && !env.OTP_LOG_CODES)
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email sign-in is currently unavailable",
      );
    const code = crypto.randomInt(100000, 1000000).toString();
    try { await OtpChallenge.updateOne(
      { email: normalized, $or: [{ lastSentAt: { $lte: new Date(now - 30000) } }, { lastSentAt: { $exists: false } }] },
      {
        email: normalized,
        codeHash: hashOtp(normalized, code),
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        lastSentAt: new Date(),
        consumedAt: null,
      },
      { upsert: true },
    ); } catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return ok(res, { resendAfterSeconds: 30 }); throw error; }
    if (env.RESEND_API_KEY) {
      const result = await new Resend(env.RESEND_API_KEY).emails.send({
        from: env.EMAIL_FROM,
        to: normalized,
        subject: "Your Astro Galexa sign-in code",
        text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `<div style="background:#000;color:#f5f5f7;padding:32px"><h1 style="color:#e8b64c">Astro Galexa</h1><p>Your sign-in code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p></div>`,
      });
      if (result.error) {
        await OtpChallenge.deleteOne({
          email: normalized,
          codeHash: hashOtp(normalized, code),
        });
        throw new AppError(
          503,
          "EMAIL_UNAVAILABLE",
          "Email sign-in is currently unavailable",
        );
      }
    } else if (env.OTP_LOG_CODES) req.log.info({ code }, "Development OTP");
    return ok(res, { resendAfterSeconds: 30 });
  }),
);
authRouter.post(
  "/otp/verify",
  verifyLimiter,
  asyncRoute(async (req, res) => {
    const { email, code, deviceId, platform } = z
      .object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) })
      .merge(authBody)
      .parse(req.body);
    const challenge = await OtpChallenge.findOneAndUpdate({
      email: email.toLowerCase(),
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
    }, { $inc: { attempts: 1 } }, { new: true });
    if (
      !challenge ||
      challenge.consumedAt ||
      !challenge.expiresAt ||
      !challenge.codeHash ||
      challenge.expiresAt < new Date()
    )
      throw new AppError(400, "OTP_EXPIRED", "That code has expired");
    if (!secureEquals(challenge.codeHash, hashOtp(email.toLowerCase(), code)))
      throw new AppError(400, "OTP_INVALID", "That code is incorrect");
    const consumed = await OtpChallenge.updateOne({ _id: challenge._id, codeHash: challenge.codeHash, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } });
    if (consumed.modifiedCount !== 1) throw new AppError(400, "OTP_EXPIRED", "That code has expired");
    let user = await User.findOne({ email: email.toLowerCase() });
    const isNew = !user;
    if (!user)
      user = await User.create({
        email: email.toLowerCase(),
        emailVerified: true,
      });
    else {
      user.emailVerified = true;
      await user.save();
    }
    const tokens = await issue(user, deviceId, platform);
    ok(res, { ...tokens, isNewUser: isNew });
  }),
);
authRouter.post(
  "/google",
  asyncRoute(async (req, res) => {
    const { idToken, deviceId, platform } = z
      .object({ idToken: z.string().min(20) })
      .merge(authBody)
      .parse(req.body);
    const audiences = env.GOOGLE_CLIENT_IDS.split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!audiences.length)
      throw new AppError(
        503,
        "GOOGLE_NOT_CONFIGURED",
        "Google sign-in is not configured",
      );
    let ticket;
    try { ticket = await new OAuth2Client().verifyIdToken({ idToken, audience: audiences }); }
    catch { throw new AppError(401, "GOOGLE_INVALID", "Google sign-in could not be verified"); }
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified || !payload.sub)
      throw new AppError(
        401,
        "GOOGLE_INVALID",
        "Google did not verify this email",
      );
    let user = await User.findOne({ email: payload.email.toLowerCase() });
    const isNew = !user;
    if (!user)
      user = await User.create({
        email: payload.email.toLowerCase(),
        emailVerified: true,
        googleId: payload.sub,
        name: payload.name,
      });
    else {
      if (user.googleId && user.googleId !== payload.sub)
        throw new AppError(
          409,
          "GOOGLE_LINK_CONFLICT",
          "This email is linked to another Google account",
        );
      user.googleId = payload.sub;
      user.emailVerified = true;
      if (!user.name && payload.name) user.name = payload.name;
      await user.save();
    }
    ok(res, { ...(await issue(user, deviceId, platform)), isNewUser: isNew });
  }),
);
authRouter.post(
  "/refresh",
  asyncRoute(async (req, res) => {
    const { refreshToken, deviceId, platform } = z
      .object({ refreshToken: z.string().min(20) })
      .merge(authBody)
      .parse(req.body);
    const oldHash = hashToken(refreshToken);
    const nextToken = randomToken();
    const found = await Session.findOneAndUpdate(
      { refreshTokenHash: oldHash, deviceId, platform, revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { refreshTokenHash: hashToken(nextToken) }, $push: { usedTokenHashes: oldHash } },
      { new: true },
    );
    if (!found) {
      const reused = await Session.findOneAndUpdate({ usedTokenHashes: oldHash }, { $set: { revokedAt: new Date() } }, { new: true });
      // Also revoke records made by older deployments using one record per rotation.
      const legacy = reused ?? await Session.findOne({ refreshTokenHash: oldHash, revokedAt: { $ne: null } });
      if (legacy?.familyId) await Session.updateMany({ familyId: legacy.familyId }, { $set: { revokedAt: new Date() } });
      throw new AppError(401, "REFRESH_INVALID", "Please sign in again");
    }
    const user = await User.findById(found.userId);
    if (!user) throw new AppError(401, "UNAUTHORIZED", "Please sign in again");
    ok(res, { accessToken: accessTokenFor({ id: user._id.toString(), role: user.role }, found._id.toString()), refreshToken: nextToken, user: publicUser(user), isNewUser: false, onboardingComplete: user.onboardingComplete });
  }),
);
authRouter.post(
  "/logout",
  asyncRoute(async (req, res) => {
    const { refreshToken, all } = z
      .object({ refreshToken: z.string(), all: z.boolean().optional() })
      .parse(req.body);
    const found = await Session.findOne({
      refreshTokenHash: hashToken(refreshToken),
    });
    if (found)
      await Session.updateMany(
        all ? { userId: found.userId } : { _id: found.id },
        { revokedAt: new Date() },
      );
    ok(res, { loggedOut: true });
  }),
);
