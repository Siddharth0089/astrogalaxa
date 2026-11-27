# Phone setup and release checklist

**Status: not yet ready for real users.** The current app contains unfinished screens and unverified astrology calculations; the server blocks production startup. These steps prepare a development build for testing. They do not turn the prototype into a completed product.

## What the owner will need

1. A domain and a verified sender in Resend, with an API key stored privately.
2. A MongoDB database and an HTTPS host for the server. Use a separate database and test accounts for development.
3. An Expo account and a unique Android package name and iOS bundle identifier owned by the project. The current `com.nakshatra.app` values are placeholders; set final identifiers before creating OAuth and Firebase clients.
4. Google OAuth client IDs, Firebase project configuration and push credentials, and a supported AI provider, when those integrations are implemented. Keep the Firebase configuration files and server credentials out of version control.
5. An Apple Developer account for physical iOS device signing and an Apple App Store release; a Google Play Console account is required for a Play Store release.
6. An ephemeris licensing decision and professional review of chart calculations and the name-syllable table before launch.

## Local development (not a production deployment)

1. Install a supported Node LTS version, Docker, and project dependencies with `npm install` at the repository root.
2. Copy `server/.env.example` to `server/.env`. Generate unique random secrets for `JWT_SECRET` and `OTP_HMAC_SECRET` and set `MONGODB_URI`. Set `MONGODB_DB_NAME` to `astro_galexa` or another database you explicitly intend to use; this value overrides any database name in the connection URI. For email delivery set `RESEND_API_KEY` and a verified `EMAIL_FROM`; use `OTP_LOG_CODES=true` only for isolated development without real user data. Never share the URI or secrets in chat.
3. Start MongoDB, for example `docker compose up mongo`, and run `npm run dev -w server` from the repository root.
   From the repository root, `npm run check:db -w server` checks connectivity and collection-list access without inserting data. MongoDB creates the database and collections when data or indexes are first written; a successful read-only check alone does not create them or verify write access. If using Atlas, the cluster, database user, and network access rules must already exist and permit access.
   To verify write permission, `npm run check:db-write -w server` inserts, reads, and deletes a uniquely identified test record. It leaves the `__connection_checks` collection in the selected database; if cleanup fails, it reports the record ID for follow-up.
   `npm run init:db -w server` builds the server and creates the collections and declared indexes for the selected database. It preserves existing collections and does not insert user or sample data. If an existing index conflicts or existing records violate a unique index, the command stops; inspect the conflict before making any changes.
   `npm run seed:tarot -w server` adds missing Major Arcana definitions without replacing existing ones. These are basic reflective prompts that require editorial and visual review.
   If Node's SRV DNS lookup fails but the system's configured DNS works, `MONGODB_DNS_SERVERS` can specify comma-separated trusted resolver IP addresses. This overrides DNS resolution for the Node server process, not just MongoDB, and does not change Windows DNS settings. A shell environment value takes precedence over `.env`; use only DNS servers you trust and are authorized to use.
   The default Compose database is standalone and cannot run the transactional account-deletion flow. Use a replica-set MongoDB for testing deletion; a failure leaves the account intact.
4. Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL` to an API address reachable by the phone, ending in `/api/v1`. `localhost` on a phone points to the phone itself; an Android emulator's `10.0.2.2` does not work on a physical phone. Use an appropriate private development network address or a secured staging HTTPS endpoint. Never put secrets in `EXPO_PUBLIC_` variables.
5. From `mobile`, sign in to Expo and configure EAS for your project (`npx eas-cli login`, then `npx eas-cli build:configure`). Configure the project identifiers before building.
6. Build the development client with `npx eas-cli build --profile development --platform android` or `--platform ios`. Follow EAS's signing and device-registration prompts. Install the resulting build using the EAS instructions, then run `npm start -w mobile` and connect the phone to the development server.

Physical iOS builds require appropriate Apple signing and registered devices. Installation and signing steps can change; consult the current Expo, Apple, and Google documentation when preparing builds.

## Before the app can be used by customers

- Replace mock Kundli/Dasha, horoscope, tarot and chat behavior with verified services; complete Google sign-in, device push, notification preferences, profile edits, and account deletion.
- Complete backend authorization, distributed rate limiting, refresh and OTP concurrency tests, data deletion, backups, monitoring and recovery tests.
- Implement native configuration plugins, configure secrets and push credentials, verify the production API URL and TLS, and test every screen on physical Android and iOS devices.
- Test complete onboarding, app restart, expired sessions, offline and error states, account deletion, notifications, and server/provider failure paths.
- Have qualified reviewers validate astrology results and the privacy policy, terms, content and store disclosures. Only remove the production startup guard once the implementation and independent release checks are complete.
