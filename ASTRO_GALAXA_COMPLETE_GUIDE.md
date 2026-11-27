# Astro Galaxa — Complete Architecture, Tech Stack, Q&A & Free Deployment Guide

> **Last updated:** November 27, 2026 (reflects commit `04deb64`)  
> **Project type:** Full-stack Cross-Platform Vedic Astrology, Tarot & Consultation App (Monorepo)

---

## Table of Contents
1. [Product Overview & Core Features](#1-product-overview--core-features)
2. [System Architecture Diagram & Data Flow](#2-system-architecture-diagram--data-flow)
3. [Repository & Workspace Structure](#3-repository--workspace-structure)
4. [Tools, Libraries & Technologies — Use & Importance](#4-tools-libraries--technologies--use--importance)
5. [Mobile App (`mobile/`) Screens & Components Breakdown](#5-mobile-app-mobile-screens--components-breakdown)
6. [Backend API (`server/`), Database Models & Core Engines](#6-backend-api-server-database-models--core-engines)
7. [Security, Privacy & Production Hardening](#7-security-privacy--production-hardening)
8. [Deploying Free on Render + Free Redis Caching + Phone Notifications](#8-deploying-free-on-render--free-redis-caching--phone-notifications)
9. [Viva / Technical Interview Q&A Cheat Sheet](#9-viva--technical-interview-qa-cheat-sheet)

---

## 1. Product Overview & Core Features

**Astro Galaxa** is a free, cross-platform Vedic astrology and spiritual guidance application built with **React Native (Expo)** on the client and **Node.js / Express / TypeScript / MongoDB / Socket.IO** on the backend.

### Core Capabilities
- **Authentic Sidereal Vedic Kundli (`sweph`):** Calculates Ascendant (Lagna), 9 Vedic Grahas (Sun through Saturn plus Rahu & Ketu), Whole-Sign house placements, planetary dignity (*Exalted*, *Debilitated*, *Own Sign*, *Neutral*), Retrograde, Combustion, Vargottama status, **D9 Navamsa**, **D10 Dasamsa**, **Avakhada Chakra**, Yogas, **Vimshottari Mahadasha / Antardasha**, **Vedic Panchang**, **Live Gochar Transits & Sade Sati**, and **36-point Ashtakoota Gun Milan** compatibility matching.
- **78-Card Cosmic Tarot:** Interactive 3-mode tarot experience (**Daily Draw**, **3-Card Spread**, **Yes / No**) backed by a complete 78-card deck (`22 Major Arcana + 56 Minor Arcana`), per-mode daily allowance (`3` cards per mode independently), relevance filtering by life area & question keywords, upright/reversed logic, persistent reading journal, and optional AI narrative synthesis.
- **Context-Aware AI Pandit:** Personalized AI astrology chat (supporting both JSON responses and Server-Sent Events streaming via `/chat/ai/stream`) whose system prompt strictly grounds the LLM in the user's real calculated Kundli, Yogas, Dasha, live Gochar transits, recent Tarot reading, and chosen language.
- **Free Live Astrologer Consultations:** Verified astrologer directory filterable by specialty (`All`, `Career`, `Love`, `Health`), one-tap free consultation threads with optional Kundli sharing, real-time **Socket.IO** messaging, and post-session star ratings.
- **Multilingual Experience:** Full runtime switching across **English**, **Hindi (Devanagari)**, and **Hinglish** across UI copy, horoscopes, tarot summaries, AI responses, and notifications.
- **Passwordless Authentication & Native Phone Notifications:** Email OTP (with rate limiting, cooldowns, attempt limits) + optional Google OAuth, encrypted native token storage (`expo-secure-store`), automated daily horoscope push notifications via Expo Push API, and GDPR data export + atomic account deletion.

---

## 2. System Architecture Diagram & Data Flow

```mermaid
flowchart LR
  User["Mobile / Web User (Android, iOS, Web)"] -->|"REST JSON + SSE + JWT"| API["Express API Server (Node.js 22 + TypeScript)"]
  User -->|"Socket.IO WebSocket (JWT Handshake)"| WS["Socket.IO Server (Live Rooms)"]
  API --> WS

  API --> Auth["Auth & Session Engine (OTP / Google / Refresh Rotation)"]
  API --> Kundli["Swiss Ephemeris Engine (sweph Lahiri Sidereal)"]
  API --> Tarot["Tarot Engine (78-Card Scoring + Quotas)"]
  API --> Notif["Push Scheduler (60s Sweep + Luxon)"]

  API -->|"Mongoose ODM"| DB[("MongoDB 8 Replica Set")]
  Notif -->|"Read Users & Tokens + Atomic Lock"| DB
  API -->|"AI Prompts (Chart Context)"| LLM["Groq (Llama 3.1) / OpenAI / Gemini"]
  API -->|"City Search (Lat/Lng/Timezone)"| Geo["Open-Meteo Geocoding API"]
  Auth -->|"OTP Emails"| Resend["Resend Email API"]
  Notif -->|"Push Tickets"| ExpoPush["Expo Push Service (FCM / APNs)"]
```

### Real-Time & Auth Request Flow

```mermaid
sequenceDiagram
  participant Phone as Mobile App (Expo)
  participant Server as Express + Socket.IO API
  participant Mongo as MongoDB 8
  participant Push as Expo Push API (FCM/APNs)

  Phone->>Server: POST /auth/otp/request (email)
  Server->>Mongo: Atomic OtpRequestLimit + OtpChallenge (HMAC hash)
  Server-->>Phone: 200 OK (60s resend cooldown)

  Phone->>Server: POST /auth/otp/verify (email, 6-digit code, deviceId)
  Server->>Mongo: Verify HMAC code + Create Session (refreshTokenHash)
  Server-->>Phone: accessToken (15m JWT w/ sid) + refreshToken (30d)

  Note over Phone,Server: Native device registers Expo Push Token
  Phone->>Server: POST /users/me/device-token (token, platform)
  Server->>Mongo: Upsert DeviceToken

  Note over Server,Push: Every 60s background sweep (when server is awake)
  Server->>Mongo: Atomic claim lastDailyPushOn == todayDate
  Server->>Push: POST exp.host/--/api/v2/push/send
```

---

## 3. Repository & Workspace Structure

The repository uses **npm workspaces** (`workspaces: ["mobile", "server"]` in root [package.json](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/package.json)):

```text
Astro Galaxa/
├── .github/workflows/ci.yml      # GitHub Actions CI: npm ci -> lint -> typecheck -> test
├── docker-compose.yml            # Local MongoDB 8 Replica Set (rs0) + Redis 7 + API container
├── package.json                  # Workspace scripts (lint, typecheck, test)
├── docs/                         # Technical design decisions, API notes, phone setup
├── mobile/                       # Expo SDK 52 / React Native 0.76 client
│   ├── app.json                  # App identity (com.astrogalaxa.app), plugins (secure-store, notifications)
│   ├── eas.json                  # EAS Build profiles (development, preview, production)
│   ├── App.tsx                   # Root screen router, session restore, BackHandler, push registration
│   ├── session.ts                # API client, SecureStore/localStorage token persistence, auto-refresh mutex
│   └── src/
│       ├── components/           # Custom SVG charts, tarot art, cosmic canvas, modals, nav
│       ├── screens/              # 11 application screens
│       ├── theme/                # Colors, styles, i18n translations (English/Hindi/Hinglish)
│       ├── types/                # Shared TypeScript interfaces
│       └── utils/                # pushNotifications.ts (Expo Push registration & local test trigger)
└── server/                       # Node.js 22 / Express 4 / TypeScript API server
    ├── Dockerfile                # Multi-stage node:22-alpine production image
    ├── .env.example              # Complete environment variable template
    ├── scripts/                  # DB connectivity checks, index creation (init:db), seeders
    └── src/
        ├── index.ts              # Express app, Helmet/CORS/RateLimit, Swagger /docs, Socket.IO, Boot
        ├── models.ts             # 13 Mongoose schemas + TTL / compound / unique partial indexes
        ├── common/               # config.ts (Zod env guard), crypto.ts, http.ts, redis.ts, signs.ts
        ├── modules/              # auth.ts, core.ts, kundli-engine.ts, horoscope-content.ts, notifications.ts
        └── seeds/                # 78-card tarot seed definitions + 3 verified free astrologers
```

---

## 4. Tools, Libraries & Technologies — Use & Importance

### A. Mobile Client Stack (`mobile/package.json`)

| Tool / Library | Exact Use in Astro Galaxa | Why It Is Important |
|---|---|---|
| **Expo SDK 52 (`expo`)** & **React Native (`0.76.6`)** | Cross-platform UI framework targeting Android, iOS, and Web (`react-native-web`) from one TypeScript codebase. | Eliminates maintaining separate Kotlin and Swift apps while still allowing native permissions and store builds. |
| **`react-native-svg` (`^15.8.0`)** | Renders custom vector graphics in `LagnaChart`, `TarotArt`, `ZodiacBadge`, `BottomNav`, and `Galaxy`. | Crisp astronomical charts and tarot iconography at any phone DPI without heavy raster image downloads. |
| **`expo-secure-store` (`^14.0.1`)** | Encrypted storage (`nakshatra_session`, `nakshatra_device_id`) on Android Keystore / iOS Keychain (with `localStorage` fallback on web). | Prevents plain-text theft of refresh tokens on mobile devices. |
| **`expo-notifications` (`^0.29.14`)** | Requests push permissions, creates Android notification channel (`daily-guidance`), fetches Expo Push Token, and shows local/remote notifications. | Enables daily morning horoscope reminders and instant test alerts on real phones. |
| **`socket.io-client` (`^4.8.1`)** | Connects to the backend Socket.IO room (`thread:<id>`) inside `LiveScreen.tsx` using JWT `auth.token`. | Delivers low-latency bidirectional messages during free live consultations without polling. |
| **`expo-font` + `@expo-google-fonts/cormorant-garamond`** | Loads editorial serif typography (`CormorantGaramond_700Bold`) alongside body text. | Gives the cosmic dark-mode UI a refined spiritual look consistent across devices. |
| **`expo-crypto` (`~14.0.2`)** | Generates cryptographically random UUIDs (`Crypto.randomUUID()`) for per-device binding. | Identifies each physical device safely for session management and token rotation. |
| **`react-native-safe-area-context`** | Applies device notch / gesture-bar insets (`SafeAreaProvider`, `SafeAreaView`). | Prevents bottom navigation or headers from being clipped on modern notched phones. |
| **EAS (`eas.json` + `expo-dev-client`)** | Cloud build configuration for `development` (APK + dev client), `preview` (internal staging APK), and `production` (Play Store / App Store binaries). | Required to bundle native plugins (`expo-secure-store`, `expo-notifications`) with FCM/APNs credentials. |

*(Note: `mobile/package.json` also includes `@tanstack/react-query`, `zustand`, `@react-navigation/*`, and `react-hook-form`, while the live app currently drives navigation and state cleanly through React hooks in `App.tsx`, `session.ts`, `BackHandler`, and `BottomNav`.)*

---

### B. Backend API Stack (`server/package.json`)

| Tool / Library | Exact Use in Astro Galaxa | Why It Is Important |
|---|---|---|
| **Node.js 22 + TypeScript (`^5.7.2`)** | ESM runtime and compile-time static type checker (`tsc --noEmit`). | Catches payload/schema mismatches across routes, engines, and models before runtime. |
| **Express (`^4.21.2`)** | HTTP REST API framework hosting `/api/v1/*`, `/health`, `/ready`, `/docs`, and SSE streaming. | Modular router separation (`auth`, `users`, `kundli`, `tarot`, `chat`, `astrologers`, `public`). |
| **MongoDB 8 + Mongoose (`^8.9.5`)** | Primary NoSQL database and ODM for all 13 collections, schema indexes, TTL expiry, and ACID multi-document transactions. | Enables transactional user deletion (`DELETE /users/me`), automatic OTP expiry cleanup, and flexible nested Kundli JSON storage. |
| **Swiss Ephemeris (`sweph` `^2.10.3-8`)** | Astronomical C-library bindings computing sidereal planetary longitudes with **Lahiri Ayanamsha** (`SE_SIDM_LAHIRI`) and Moshier ephemeris. | Guarantees genuine Vedic astronomical degree calculations instead of fake random placements. |
| **Luxon (`^3.7.2`)** | Converts birth dates/times + IANA timezones (`Asia/Kolkata`, etc.) for Julian Day Kundli math, Panchang, Tarot midnight reset, and Push scheduler local time checks. | Prevents off-by-one-day/hour bugs caused by daylight saving time (DST) or server UTC vs user local timezones. |
| **Socket.IO (`^4.8.1`)** | WebSocket server attached to `http.createServer(app)` with JWT session middleware and per-thread authorization rooms. | Powers live real-time astrologer consultations securely. |
| **Zod (`^3.24.1`)** | Validates every environment variable (`config.ts`), route body/params/queries (often `.strict()`), and external API responses (Open-Meteo). | Stops malformed input, mass-assignment attacks, and silent startup with insecure production secrets. |
| **`jsonwebtoken` (`^9.0.2`)** | Issues & verifies short-lived **15-minute** HS256 Access JWTs containing `{ sub, sid, role }`. | Enables instant server-side revocation: every request verifies that Session `sid` in MongoDB is not revoked or expired. |
| **`resend` (`^4.1.2`)** & **`google-auth-library`** | Sends styled HTML/text OTP verification emails via Resend; verifies Google ID tokens server-side (`verifyIdToken`). | Provides real passwordless email sign-in and verified OAuth login without trusting client claims. |
| **`helmet` + `cors` + `express-rate-limit`** | Security headers, origin allowlist enforcement, 100 KB JSON body cap, and rate limiters (global 1000/15m, OTP request 20/hr, OTP verify 10/15m), backed by Redis when `REDIS_URL` is set (`passOnStoreError: true`) and skipping `/health` & `/ready`. | Protects endpoints against brute-force OTP guessing, oversized payload DoS, and unauthorized browser origins. |
| **`ioredis` + `rate-limit-redis` + `@socket.io/redis-adapter`** | Fail-open Redis cache helpers (`redis.ts`), distributed rate-limit store, and Socket.IO multi-node adapter whenever `REDIS_URL` is provided. | Caches city search (`24h`), Panchang (`5m`), and astrologer lists (`2m`) with zero crash risk if Redis sleeps/disconnects. |
| **Pino + `pino-http`** | Structured JSON logging with automatic `redact` on authorization headers, emails, OTP codes, and refresh tokens. | Gives production observability with request UUIDs (`genReqId`) while preventing PII/token leaks in logs. |
| **`swagger-ui-express`** | Serves OpenAPI 3.0.3 documentation at `/docs`. | Makes backend endpoints immediately inspectable for testing, evaluators, and frontend devs. |

---

### C. External APIs, Testing & DevOps Tools

| Tool / Service | Exact Use | Why It Is Important |
|---|---|---|
| **Groq (`llama-3.1-8b-instant`) / OpenAI-compatible / Google Gemini (`gemini-2.5-flash`)** | Generates personalized Vedic AI Pandit replies, live astrologer fallback assistance, and 2-paragraph Tarot narrative syntheses. | Uses the user's real calculated chart/transits in `buildVedicPrompt` while gracefully falling back if AI keys aren't set. |
| **Open-Meteo Geocoding API** | `GET /api/v1/places/search?q=` fetches accurate city coordinates (`lat`, `lng`) and IANA `timezone`. | Essential because Vedic Lagna/ascendant shifts ~1 degree every 4 minutes and requires exact latitude, longitude, and timezone. |
| **Expo Push API (`exp.host/--/api/v2/push/send`)** | Receives batched push payloads (up to 100 per batch) from `notifications.ts` and dispatches them to Android FCM & iOS APNs. | Unified push pipeline without writing separate FCM and APNs backend transport code. |
| **Vitest (`^2.1.8`) + Supertest + `mongodb-memory-server`** | Unit tests (signs, crypto, Swiss Ephemeris Kundli math) and full HTTP integration tests against a real ephemeral MongoDB instance. | Proves OTP limits, refresh-token reuse detection, test-notifications, and chart calculations work end-to-end. |
| **ESLint 9 (`--max-warnings=0`) + GitHub Actions CI + Docker** | Zero-warning lint gate, TypeScript checks, CI pipeline ([ci.yml](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/.github/workflows/ci.yml)), multi-stage `node:22-alpine` [Dockerfile](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/Dockerfile), and [docker-compose.yml](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/docker-compose.yml). | Guarantees consistent builds, container portability, and regression-free commits. |

---

## 5. Mobile App (`mobile/`) Screens & Components Breakdown

### Navigation & Session Lifecycle ([App.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/App.tsx) & [session.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/session.ts))
- **Startup Gate:** Restores session from `SecureStore` (native) or `localStorage` (web) -> refreshes expired access token automatically -> routes incomplete users to `birth` onboarding or completed users to `home`.
- **Single-Flight Refresh Lock:** `pending` Promise in `session.ts` ensures multiple simultaneous `401` API calls trigger **only one** `/auth/refresh` request (critical because refresh tokens rotate single-use!).
- **Bottom Navigation Bar ([BottomNav.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/BottomNav.tsx)):** `Home` -> `Kundli` -> `Tarot` -> `Profile` (AI Chat is launched directly from Home).
- **Phone Hardware / Gesture Back Button:** Implemented via `BackHandler`:
  - `reading` -> `tarot`, `live` -> `chat`, `otp` -> `login`, `result` -> `birth`, main tabs -> `home`, `home` -> exits app cleanly.
  - Inside `TarotScreen` Journal overlay -> closes Journal; inside active `LiveScreen` consultation -> opens rating/end prompt so chats aren't accidentally dropped.

### Screens Directory (`mobile/src/screens/`)
1. **`LoginScreen.tsx`** — Email OTP entry + Privacy/Terms modal trigger ([LegalModal.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/LegalModal.tsx)).
2. **`OtpScreen.tsx`** — 6-digit OTP verification + live countdown timer for 60s resend cooldown.
3. **`BirthDetailsScreen.tsx`** — Captures Name, Gender, Language (`English`, `Hindi`, `Hinglish`), DOB, optional Birth Time, and debounced city autocomplete via `/places/search`.
4. **`ResultScreen.tsx`** — Onboarding celebration displaying calculated Vedic **Name Sign** (syllable match) & **Birth Sun Sign**.
5. **`HomeScreen.tsx`** — Cosmic dashboard showing today's localized Horoscope (headline, advice, lucky color/number), Sun & Name signs, and direct entry button to AI Chat.
6. **`KundliScreen.tsx`** — Complete Vedic chart explorer combining Lagna SVG diagram ([LagnaChart.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/LagnaChart.tsx)), planetary degree/dignity table ([PlanetsTable.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/PlanetsTable.tsx)), Mahadasha/Antardasha timeline ([DashaTimeline.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/DashaTimeline.tsx)), D9/D10/Avakhada/Panchang/Gochar views, and 36-point Gun Milan compatibility matcher ([GunMilanMatch.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/GunMilanMatch.tsx)).
7. **`ChatScreen.tsx`** — Personalized AI Vedic Pandit chat with persistent thread history, chart-aware answers, and link into Live Human/Specialist Consultations.
8. **`LiveScreen.tsx`** — Free verified astrologer directory with specialty filters (`All`, `Career`, `Love`, `Health`), toggle to share Kundli summary, real-time Socket.IO chat room, and 1–5 star rating prompt on session end.
9. **`TarotScreen.tsx`** — Modern spiritual 3-mode tarot hub (`Daily Draw`, `3-Card Spread`, `Yes / No`), intention question & life area chips (`Career`, `Love`, `Health`, `Money`, `General`), interactive horizontal curved card fan with flip & shuffle animations, independent per-mode daily quota indicator, and saved reading Journal modal.
10. **`ReadingScreen.tsx`** — Detailed Tarot reveal displaying upright/reversed card symbolism ([TarotArt.tsx](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/src/components/TarotArt.tsx)), position breakdown (*Past/Present/Future* or *Influence/Obstacle/Outcome*), key advice, and full synthesized interpretation.
11. **`ProfileScreen.tsx`** — Edit profile/birth details (triggers Kundli recompute), switch language, toggle notification preferences + daily notify time, **"Send Test Phone Notification"** button, **Export My Data** (`GET /users/me/export`), Legal links, Logout (revokes session & unregisters push token), and permanent **Delete Account**.

### Shared Components (`mobile/src/components/`)
- **`Galaxy.tsx`** — Animated cosmic starfield backdrop.
- **`ErrorBoundary.tsx`** — React crash boundary preventing blank screens on unexpected UI exceptions.
- **`ZodiacBadge.tsx`**, **`Button.tsx`**, **`Field.tsx`** — Reusable dark-gold cosmic UI primitives.

---

## 6. Backend API (`server/`), Database Models & Core Engines

### API Modules (`server/src/modules/` mounted under `/api/v1`)
- **`/auth` ([auth.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/auth.ts)):** `POST /otp/request`, `/otp/verify`, `/google`, `/refresh`, `/logout`.
- **`/users` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET/PATCH/DELETE /me`, `GET /me/export`, `POST/DELETE /me/device-token`, `POST /me/test-notification`.
- **`/kundli` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET /`, `POST /recompute`, `POST /match`.
- **`/` public ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET /panchang/today`, `GET /places/search`, `GET /horoscope/today`.
- **`/tarot` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET /cards`, `GET /quota`, `GET/POST /readings`, `GET /readings/:id`.
- **`/chat` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET /threads`, `GET /threads/:id/messages`, `POST /ai`, `POST /ai/stream` (SSE).
- **`/astrologers` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts)):** `GET /`, `POST /:id/connect`, `POST /threads/:id/messages`, `PATCH /threads/:id/end`.
- **`/cron` ([notifications.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/notifications.ts)):** `POST /daily-push` (requires `x-cron-secret` or Bearer `CRON_SECRET`; triggers daily push sweep on demand).

### MongoDB Collections & Indexes ([models.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/models.ts))
1. **`User`** — Email (`unique`), Google ID (`unique sparse`), profile, language, birth subdoc, `nameSign`, `sunSign`, notification `prefs`, `lastDailyPushOn`, `deletedAt`.
2. **`OtpChallenge`** — Unique `email`, HMAC `codeHash`, TTL `expiresAt` (`expires: 0`), `attempts`, `lastSentAt`, `consumedAt`.
3. **`OtpRequestLimit`** — Unique hashed email-hour key, `count`, TTL `expiresAt`.
4. **`Session`** — `userId`, `refreshTokenHash` (`unique`), `usedTokenHashes` (reuse detection), `familyId` (family-wide revocation), TTL `expiresAt`, `revokedAt`, compound `{ userId, revokedAt, expiresAt }`.
5. **`Kundli`** — Unique `userId`, SHA-256 `birthHash` + `engineVersion` cache key, full planetary/house/D9/D10/Avakhada/Yoga/Dasha results.
6. **`DailyHoroscope`** — Unique compound `{ sign, date }` + text, advice, lucky color/number.
7. **`Astrologer`** — Compound `{ verified, status }` + specialties, languages, experience, live calculated ratingAvg/count.
8. **`AstrologerSubscription`** — Unique `{ userId, astrologerId }`.
9. **`ChatThread`** — Compound `{ userId, type, status }` for AI & live consultation sessions + rating.
10. **`ChatMessage`** — `{ threadId, createdAt }` + partial unique index `{ threadId, clientMsgId }` for idempotent message delivery.
11. **`TarotCard`** — Unique `number` (`0–77`), numeral, name, suit, keywords, meanings, `artKey`.
12. **`TarotReading`** — Compound `{ userId, createdAt: -1 }`, mode, topic, question, drawn cards, narrative interpretation.
13. **`DeviceToken`** — Unique `token`, `userId`, `platform`, `appVersion`, `lastSeenAt`.

---

## 7. Security, Privacy & Production Hardening

1. **Refresh Token Rotation & Reuse Theft Detection ([auth.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/auth.ts#L228-L250)):** Refresh tokens are hashed (`SHA-256`) and rotated atomically. If a previously spent token (`usedTokenHashes`) is ever replayed—indicating token theft—the **entire `familyId` session family is revoked immediately**.
2. **OTP Brute-Force & Replay Defense:** OTP codes are HMAC-SHA256 hashed with `OTP_HMAC_SECRET`, verified via timing-safe comparison (`crypto.timingSafeEqual`), capped at **5 email requests/hour** (DB counter) + IP limits, **60s resend cooldown**, **10-min expiry**, **5 wrong attempts max**, and single-use atomic `consumedAt` flip.
3. **Database-Backed Session Revocation ([middleware.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/common/middleware.ts#L18-L35) & [index.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/index.ts#L122-L153)):** Both HTTP requests and Socket.IO WebSocket handshakes verify the JWT **and** confirm the `sid` Session in MongoDB has `revokedAt: null` and has not expired.
4. **GDPR Export & Transactional Account Deletion ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts#L229-L315)):** Users can download a full JSON export (`GET /users/me/export`) or delete their account inside a **MongoDB ACID transaction** deleting `User`, `Session`, `OtpChallenge`, `DeviceToken`, `AstrologerSubscription`, `Kundli`, `TarotReading`, `ChatThread`, and `ChatMessage` records atomically.
5. **Strict Startup Validation ([config.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/common/config.ts#L38-L57)):** When `NODE_ENV=production`, startup refuses to boot if `OTP_LOG_CODES=true` or if `JWT_SECRET` / `OTP_HMAC_SECRET` still contain `replace-with` placeholders or are under 32 characters.

---

## 8. Deploying Free on Render + Free Redis Caching + Phone Notifications

This is the exact architecture and gotchas if you host the backend on **Render's Free Web Service**.

### Part A — How Render Free Web Service Works (& Its Effect on Notifications)
- **Auto-Sleep after 15 Minutes of Inactivity:** Render's Free Web Service spins down after **15 minutes** with no incoming HTTP traffic. The next visitor experiences a **30–60 second cold start** while Node boots.
- **750 Free Instance Hours / Month:** Render provides 750 free hours per calendar month per workspace (a full month is 720–744 hours), meaning **one** web service can stay online 24/7 within the free quota—but **two** always-awake services will exhaust the free hours mid-month.
- **Ephemeral Disk:** Local files saved inside the Render container wipe on every restart/sleep—which is why all Astro Galaxa state lives in MongoDB Atlas (and optional external Redis).

> **CRITICAL IMPACT ON PHONE NOTIFICATIONS:**
> Your server's daily horoscope notification scheduler (`startDailyNotificationScheduler` in [index.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/index.ts#L218) running every 60s via `setInterval`) **only runs while the Node process is awake**.  
> If Render puts your free backend to sleep overnight when no users are active, **08:00 AM daily horoscope phone notifications will not trigger** until an HTTP request wakes Render up!

#### How to Make Phone Notifications Reliable on Render Free Tier ($0)
1. **Option 1 — Trigger `POST /api/v1/cron/daily-push` via External Cron (Works Even If Render Sleeps):**
   - Set `CRON_SECRET=<long-random-secret>` in Render's environment variables.
   - Use **cron-job.org** or GitHub Actions schedule to send `POST https://<your-render-service>.onrender.com/api/v1/cron/daily-push` with header `x-cron-secret: <CRON_SECRET>` every 15–30 minutes (or around user morning hours). Calling this endpoint wakes Render if asleep and immediately runs `runDailyHoroscopePushSweep`—while `lastDailyPushOn` atomically prevents duplicate same-day pushes.
2. **Option 2 — Keep 1 Render Instance Awake 24/7:**
   - Configure a `GET` monitor on **cron-job.org** or **UptimeRobot** hitting `https://<your-render-service>.onrender.com/health` every **10 to 14 minutes** (`/health` is exempt from rate-limiting so it never wastes Redis commands or trips limits).
   - Uses ~720–744 of your 750 free Render hours/month, keeps the built-in 60s `startDailyNotificationScheduler` active continuously, and eliminates 30–60s cold starts.
3. **Mobile App Build Requirement for Phone Notifications:**
   - Notifications **do not** run natively in web preview (`Platform.OS === "web"`).
   - For real background notifications on Android/iOS phones, run an **EAS build** (`eas build --profile preview` or `production` via [eas.json](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/eas.json)) with your Expo `projectId`, Android **FCM** credentials (`google-services.json` / EAS FCM key), and iOS **APNs** key configured in your Expo dashboard.
   - Add `EXPO_ACCESS_TOKEN` in Render environment variables if you want higher/authenticated Expo Push throughput.

---

### Part B — How Free Redis Works for Caching on Render

In Astro Galaxa (`server/src/common/redis.ts`), **Redis is pre-wired with automatic fail-open fallback**:
- When `REDIS_URL` is **unset**, the backend runs seamlessly without errors (using MongoDB persistence for `Kundli` / `DailyHoroscope` and in-memory Node rate-limits / Socket.IO rooms).
- When `REDIS_URL` **is configured** (such as Upstash `rediss://...`), the backend automatically activates:
  1. **Route Caching:**
     - `GET /places/search?q=` cached in Redis for **24 hours (`86400s`)** under `places:v1:<query>` (avoids repeat Open-Meteo geocoding HTTP requests).
     - `GET /panchang/today` cached for **5 minutes (`300s`)** under `panchang:v1:<timezone>`.
     - `GET /astrologers` cached for **2 minutes (`120s`)** under `astrologers:v1:<specialty>` and invalidated automatically when a consultation rating updates.
  2. **Persistent Rate Limiting (`rate-limit-redis`):** Global, OTP-request, and OTP-verify rate limiters persist counters in Redis (`passOnStoreError: true`), skipping `/health` and `/ready` to save commands.
  3. **Socket.IO Redis Adapter (`@socket.io/redis-adapter`):** Attached automatically on startup so live consultations scale seamlessly across multiple server nodes.
- **Fail-Open Resilience:** All cache helpers check `client.status === "ready"` and use fast timeouts (`2s` command timeout) so if free-tier Redis sleeps, hits command caps, or disconnects, requests immediately fall back to MongoDB / origin APIs without downtime.

#### Comparing Your Two Free Redis Options for Render

| Feature | **Option 1: Upstash Redis Free Tier (Recommended)** | **Option 2: Render Key Value Free Tier** |
|---|---|---|
| **Cost** | \$0/month | \$0/month |
| **Memory / Storage** | **250 MB** | **25 MB** |
| **Usage Limits** | **500,000 commands / month** (free bandwidth) | 1 free Valkey 8 instance per workspace |
| **Data Persistence** | **Persistent** (survives Render sleeps, crashes & redeploys) | **Non-persistent** (in-memory only; wiped on any restart/sleep) |
| **Best Use Case** | Caching geocoding/Panchang, persistent rate-limits, live Socket rooms | Temporary short-TTL cache only |

#### Connecting Free Upstash Redis on Render
1. Create a free Redis database on **Upstash** and copy its TLS connection URL (`rediss://default:...@...upstash.io:6379`).
2. Add `REDIS_URL=<your-upstash-url>` in Render's **Environment Variables** and deploy—no extra code changes are required.

---

## 9. Viva / Technical Interview Q&A Cheat Sheet

**Q1. Why does Astro Galaxa use Swiss Ephemeris (`sweph`) instead of simple sun-sign lookup formulas?**  
Simple calendar dates only give Western *Tropical* Sun Signs. Genuine Vedic Kundli requires sidereal (*Nirayana*) planetary longitudes corrected for Earth's axial precession using **Lahiri Ayanamsha**. `sweph` computes exact 9-planet degrees, Lagna ascendant, Nakshatras, Pada, and Vimshottari Dasha accurate to the minute and location.

**Q2. Why does city lookup (`Place Search`) need latitude, longitude, and timezone instead of just city name?**  
Because the Earth rotates 360° in 24 hours (~1° every 4 minutes), the Ascendant (Lagna) shifts rapidly by exact birth latitude/longitude, and Luxon requires the exact IANA timezone (including historical daylight-saving rules) to convert local birth time into Julian Day UT cleanly.

**Q3. How do you ensure the AI Pandit does not hallucinate fake planets or houses?**  
In `buildVedicPrompt()` ([core.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/core.ts#L1057-L1125)), the backend loads the user's computed Swiss Ephemeris `Kundli` (Lagnam, Moon sign, Sun sign, Nakshatra, D9 Ascendant, Yogas, active Mahadasha/Antardasha, Gochar transits, Sade Sati, and latest Tarot reading) directly from MongoDB and passes it into the system prompt with strict instructions to reference only those placements in the user's chosen language (`English`, `Hindi`, or `Hinglish`).

**Q4. Why do you hash and rotate Refresh Tokens instead of issuing a single 30-day JWT?**  
Long-lived JWTs cannot be revoked easily if stolen. Astro Galaxa issues a short **15-minute** Access JWT tied to a database `sid` (`Session`) plus an opaque 30-day Refresh Token stored hashed (`SHA-256`). Every `/auth/refresh` atomically rotates to a new token and records the old hash in `usedTokenHashes`. If an attacker replays an already-used token, the server detects reuse and immediately revokes the entire `familyId` login session family. And inside the mobile app ([session.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/mobile/session.ts)), a promise lock (`pending`) prevents parallel API calls from colliding during rotation.

**Q5. Why does MongoDB need to run as a Replica Set (`rs0` / MongoDB Atlas)?**  
Two reasons: (1) `DELETE /users/me` wraps cascading deletion across multiple collections inside a **MongoDB ACID transaction**, which MongoDB only supports on Replica Sets or sharded clusters; (2) atomic `findOneAndUpdate` guarantees single-use OTP consumption and single daily push locking without race conditions.

**Q6. How do you prevent duplicate daily horoscope push notifications if multiple workers or overlapping sweeps run?**  
In [notifications.ts](file:///c:/Users/anshu/Desktop/Astro%20Galaxa/server/src/modules/notifications.ts#L100-L106), before sending any push notification, the server performs an atomic conditional write:  
`User.findOneAndUpdate({ _id: user._id, lastDailyPushOn: { $ne: todayDate } }, { $set: { lastDailyPushOn: todayDate } })`.  
Only the single worker that atomically claims `todayDate` dispatches to Expo Push API; dead tokens returning `DeviceNotRegistered` are pruned cleanly.

**Q7. Why are `JWT_SECRET` and `OTP_HMAC_SECRET` validated with `.superRefine` in `config.ts`?**  
In local development, `.env.example` provides readable placeholder strings and `OTP_LOG_CODES=true` for friction-free testing. The Zod `.superRefine` check makes it impossible for someone to accidentally deploy to `NODE_ENV=production` with weak/placeholder secrets or OTPs leaking into server logs.

**Q8. How does Tarot relevance filtering work without hardcoding answers?**  
In `GET /tarot/cards`, when a user picks a Life Area (`Career`, `Love`, `Health`, `Money`) or types a question, `scoreCardRelevance()` scores all 78 cards using suit resonance (`Cups` for Love, `Pentacles` for Money/Wealth, `Wands`/`Pentacles` for Career), thematic Major Arcana sets, and keyword token matching—then selects the top 30 relevant cards and cryptographically re-shuffles (`randomInt`) their positions before returning face-down card IDs. Daily quotas (`MAX_DAILY_TAROT_CARDS = 3`) are tracked independently per mode (`daily`, `threeCard`, `yesNo`).
