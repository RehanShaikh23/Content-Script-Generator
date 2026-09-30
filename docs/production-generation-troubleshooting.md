# OpenRouter production configuration

## Confirmed findings (2026-09-30)

- The frontend calls `https://content-script-generator-t7oy.onrender.com/api`.
- The Java API belongs to Render service `srv-d9mpnru417fc73buhol0`.
- Render service `srv-d80oqunavr4c73anf1o0` is a Node frontend at
  `https://content-script-generator.onrender.com`, not the Java backend. Deploying
  this service does not update Java controllers or AI model routing.
- Access to the Java service has been restored. Render confirmed backend
  revision `66ae5b6` live, including VisualSceneController and model aliases.
- All AI features now use OpenRouter: scripts, streaming, visual profiles,
  scenes, calendars, and admin email drafts.
- OpenRouter's public catalog no longer listed the configured Gemma 2 Free,
  Claude 3.5 Sonnet, Gemini 2.0 Flash, or `mistral-large-latest` IDs.
  Replacement IDs were verified at https://openrouter.ai/api/v1/models.

## Local fixes

- Preserve HTTP error status in `apiPost` and forward AbortSignal to fetch.
- Stop visual generation after a profile authentication failure. Stop the scene
  queue and abort in-flight requests after a scene authentication failure.
- Display the session/access error and avoid requests when no token is present.
- Replace unavailable model IDs in both frontend and backend. Backend aliases
  accept previous frontend IDs during rolling upgrades; premium gates remain.
- The shared OpenRouter default is `deepseek/deepseek-chat`, optionally
  overridden with `OPENROUTER_DEFAULT_MODEL`. Admin email drafts use
  `google/gemini-2.5-flash`.
- Store `OPENROUTER_API_KEY` only in the backend environment, never source,
  chat, or frontend `VITE_*` variables. Rotate keys shared in chat.
- Remove obsolete `API_KEY` and `AI_MODEL` variables after deploying the
  OpenRouter-only backend. Neither is read by the application anymore.
- App free-tier eligibility does not mean provider usage is free. OpenRouter
  bills the account at the selected model's rates.

## Deployment order and verification

1. Sign into the account/workspace owning the Java API service.
2. Check its deployed revision and confirm VisualSceneController is included.
   Do not assume a 401 proves an expired JWT: a missing endpoint can also be
   masked by security during error dispatch. Inspect logs and response bodies.
3. Publish reviewed changes and deploy the Java backend first, then the Vercel
   frontend. Do not deploy only the Node service.
4. Verify authenticated visual profile/scene requests, cancellation, and model
   generation using an authorized test account.
5. For OpenRouter generation failures, inspect provider status/error codes
   in backend logs. Check credentials, quota/balance, model access, and provider
   availability. Never print credentials or remove endpoint authentication.

A successful deployment or health check alone does not
prove authenticated AI generation works. Verify that separately using a signed-in
account. No paid model calls were made by the automated regression tests.

## Tests

- `npm test`: mocked frontend HTTP/orchestration regression tests.
- `npm run build`: frontend production build.
- From `backend`: `./mvnw test` (Windows: `mvnw.cmd test`). Tests cover model
  routing, premium access, missing credentials, and shared OpenRouter requests
  for scripts, profiles, and calendars.
