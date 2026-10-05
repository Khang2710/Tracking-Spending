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

[main.tsx](../frontend/src/main.tsx) installs authentication and display-currency providers before rendering [App.tsx](../frontend/src/App.tsx). `App.tsx` is the screen/modal composition root; cloud bootstrap, legacy import, derived totals, and finance mutations live in `features/finance-data/useFinanceWorkspace.ts`. UI logic is grouped by domain under `frontend/src/features`.

[apiClient.ts](../frontend/src/services/apiClient.ts) is the authenticated backend boundary. It reads the current Supabase session immediately before each request and sends the access token in the `Authorization` header. Feature code does not store or manually pass tokens.

The browser may read only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL`.

## Backend boundary

[server.ts](../backend/src/server.ts) validates environment configuration and composes the API. [authenticate.ts](../backend/src/middleware/authenticate.ts) rejects missing or invalid Bearer tokens. Supabase Auth's `getUser(jwt)` performs the authoritative token check.

[finance.repository.ts](../backend/src/modules/finance/finance.repository.ts) creates a Supabase client carrying the user's JWT. All table queries and transaction RPCs therefore remain subject to the existing RLS policies. A service-role key is not used for normal user requests.

Core endpoints cover workspace loading, wallets, transactions, monthly budgets, savings goals, and recurring expenses. Transaction mutations and recurring payment confirmation use database RPCs so transaction rows and wallet balances change atomically.

Split Bills currently keep draft friends, bill history, and running balances in scoped browser storage. The database tables and RLS policies already exist, but the authenticated API migration has not been completed yet. Do not clear those browser keys during generic UI recovery.

## Receipt OCR

[ocrService.ts](../frontend/src/services/ocrService.ts) sends compressed image data through the authenticated API client. Backend validation accepts JPEG, PNG, and WebP images up to 8 MiB decoded.

The backend tries configured providers in order: Groq, then OpenRouter. It normalizes model output into `{ name, price }[]`. Receipt images, provider authorization headers, and model response bodies are not logged or persisted.

## Internationalization and currency

Translation resources live under `frontend/src/locales`. User language and display-currency preferences are persisted in Supabase. Finance values use the existing canonical VND storage representation; `CurrencyContext` and `currencyAmounts.ts` convert user input and output at the UI boundary. Components must not hard-code symbols or conversion rules.

## Verification boundaries

- Backend unit/API tests: `backend/tests`
- Frontend feature and adapter tests: colocated `*.test.ts(x)` files
- Supabase RLS/RPC verification: `supabase/tests` and `supabase/verification`
- Complete local verification: root `npm run check`

## Planned next migrations

- Move Split Bills history and running balances from browser storage to the existing Supabase tables through an idempotent authenticated API migration.
- Replace full-workspace reloads after each mutation with scoped responses and a client query cache.
- Add paginated transaction history and dedicated statistics aggregates so workspace loading does not scan all historical transactions.
- Move profile/display-name persistence behind the same backend boundary; profile preference writes currently use the user's RLS-protected Supabase client directly.
