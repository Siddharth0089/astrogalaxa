# API

Base URL: `/api/v1`. Authenticated routes require `Authorization: Bearer <access token>`.

`PATCH /users/me` accepts a trimmed `name`, birth details, and/or notification preferences. Times use 24-hour `HH:MM` and timezone values must be valid IANA names. Updating the name recomputes the name sign. Preference changes are stored, but push delivery is not implemented yet.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/google`, `/auth/refresh`, `/auth/logout` |
| User | `GET/PATCH /users/me`, `DELETE /users/me` |
| Kundli | `GET /kundli`, `POST /kundli/recompute` |
| Horoscope | `GET /horoscope/today` |
| Chat | `GET/POST /chat/ai`, `POST /chat/ai/stream` (SSE), `GET /astrologers` |
| Tarot | `GET /tarot/cards` returns eight face-down card IDs; `POST /tarot/readings` saves three distinct selected IDs in order; `GET /tarot/readings/:id` returns only the authenticated user's reading |
| Places | `GET /places/search?q=` |

`/health` confirms process liveness and `/ready` confirms database readiness. Interactive OpenAPI is available at `/docs`.
