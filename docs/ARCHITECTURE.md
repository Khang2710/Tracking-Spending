# Architecture

## Runtime overview

```text
React/Vite browser
  ├── Supabase Auth login and session refresh
  └── Authorization: Bearer <access token>
                    │
                    ▼
Node.js/Express API
  ├── verifies token with Supabase Auth
  ├── validates requests with Zod
  ├── executes finance use cases through the user's JWT
  └── calls Groq/OpenRouter for receipt OCR
                    │
                    ▼
Supabase PostgreSQL + RLS + transaction RPCs
```

## Frontend boundary

[main.tsx](../frontend/src/main.tsx) installs authentication and display-currency providers before rendering [App.tsx](../frontend/src/App.tsx). UI logic is grouped under `frontend/src/features`.

[apiClient.ts](../frontend/src/services/apiClient.ts) is the authenticated backend boundary. It reads the current Supabase session immediately before each request and sends the access token in the `Authorization` header. Feature code does not store or manually pass tokens.

The browser may read only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL`.

## Backend boundary

[server.ts](../backend/src/server.ts) validates environment configuration and composes the API. [authenticate.ts](../backend/src/middleware/authenticate.ts) rejects missing or invalid Bearer tokens. Supabase Auth's `getUser(jwt)` performs the authoritative token check.

[finance.repository.ts](../backend/src/modules/finance/finance.repository.ts) creates a Supabase client carrying the user's JWT. All table queries and transaction RPCs therefore remain subject to the existing RLS policies. A service-role key is not used for normal user requests.

Core endpoints cover workspace loading, wallets, transactions, monthly budgets, and savings goals. Transaction mutations use the existing database RPCs so transaction rows and wallet balances change atomically.

## Receipt OCR

[ocrService.ts](../frontend/src/services/ocrService.ts) sends compressed image data through the authenticated API client. Backend validation accepts JPEG, PNG, and WebP images up to 8 MiB decoded.

The backend tries configured providers in order: Groq, then OpenRouter. It normalizes model output into `{ name, price }[]`. Receipt images, provider authorization headers, and model response bodies are not logged or persisted.

## Internationalization and currency

Translation resources live under `frontend/src/locales`. User language and base-currency preferences are persisted in Supabase. Monetary values remain in the user's base currency; `CurrencyContext` handles display conversion and formatting.

## Verification boundaries

- Backend unit/API tests: `backend/tests`
- Frontend feature and adapter tests: colocated `*.test.ts(x)` files
- Supabase RLS/RPC verification: `supabase/tests` and `supabase/verification`
- Complete local verification: root `npm run check`

## Planned next migration

Preferences, recurring-expense persistence, split-bill persistence, and dedicated statistics endpoints will move behind the same authenticated backend boundary. Their current UI behavior remains intact while the core finance path is migrated and verified.
