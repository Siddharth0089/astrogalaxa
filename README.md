# Astro Galaxa

Cross-platform Vedic astrology mobile app with an Expo React Native client and Node.js/Express/MongoDB API.

## Features
- **Vedic Kundli Engine**: Full Swiss Ephemeris astronomical calculations (Lahiri Ayanamsha) computing ascendant, 9 planets, house placements, retrograde status, and Vimshottari Mahadasha timeline.
- **Personalized AI Astrologer**: Live streaming and interactive chat using user's real birth chart, moon sign, and planetary aspects (Groq / Llama 3 / OpenAI / Gemini).
- **Daily Horoscope**: Automated forecasts for Love, Career, and Health across all 12 zodiac signs.
- **Cosmic Tarot**: Interactive 3-card spread with animations and interpretation.
- **Verified Astrologers**: Live astrologer consultations directory with ratings, specialties, and Socket.IO real-time chat.
- **Passwordless Authentication**: Modern Email OTP authentication and secure session tokens.

## Quick Start

1. Copy `server/.env.example` to `server/.env` and fill the required secrets.
2. Run `npm install` at the repository root.
3. Start the backend: `npm run dev -w server`.
4. Start the mobile app: `npm start -w mobile` (press `w` for browser web preview, or `a` for Android).
