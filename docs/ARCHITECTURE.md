# Architecture

`mobile` is an Expo development-build application. It stores tokens in SecureStore, uses React Query for API state, Zustand for session state, and routes through a root session gate.

`server` is a modular Express monolith under `src/modules`. Each module separates routes, controller/service logic, and Mongoose persistence. Requests are validated with Zod; responses use `{ success, data, error }`. Socket.IO serves live chat and SSE streams AI responses.

Provider boundaries (`MailProvider`, `EphemerisProvider`, `GeocodingProvider`, `AiProvider`, `PushProvider`) permit credential-free local development without changing business logic.
