# Third-party setup

- **Resend:** create an API key, verify a sending domain, set `RESEND_API_KEY` and `EMAIL_FROM`.
- **Google:** create iOS, Android, and web OAuth clients. Put the server audiences in `GOOGLE_CLIENT_IDS`; configure the native client IDs in Expo app configuration.
- **Firebase:** add `google-services.json` and `GoogleService-Info.plist` locally (never commit them), then set `FIREBASE_SERVICE_ACCOUNT_BASE64` for the server.
- **Places:** development search calls Open-Meteo's geocoding service, using GeoNames data. It needs network access; check its terms, attribution, quotas and commercial access before production. The app must use a selected result, including its timezone and coordinates.
- **EAS:** native Firebase and Google Sign-In require `eas build --profile development`; Expo Go cannot load these modules.
