# Wealthy — Full-Stack Personal Finance Tracker

Wealthy is a responsive finance application for wallets, transactions, monthly budgets, savings goals, recurring expenses, shared bills, and AI-powered receipt extraction. It supports English/Vietnamese interfaces and USD/VND display.

## Why this project is portfolio-ready

- React/TypeScript client with responsive desktop and mobile layouts
- Node.js/Express REST API with request validation and centralized errors
- Supabase Auth access-token verification and ownership-aware PostgreSQL RLS
- Atomic transaction and wallet-balance updates through database RPCs
- Server-only Groq/OpenRouter receipt OCR with provider fallback
- Automated frontend, backend, and database-policy tests

## Repository layout

```text
.
├── frontend/   # React 18 + Vite user interface
├── backend/    # Node.js 22 + Express API
├── supabase/   # PostgreSQL migrations, RLS tests, verification notes
└── docs/       # Architecture and maintenance documentation
```

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A Supabase project with the checked-in migrations applied
- A Groq or OpenRouter API key for receipt OCR

## Environment setup

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Frontend variables are browser-safe:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_API_BASE_URL=
```

Backend variables stay server-side:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GROQ_API_KEY=your-server-secret
OPENROUTER_API_KEY=
```

Never prefix AI secrets with `VITE_`. Vite exposes every `VITE_*` value to the browser bundle.

## Install

```bash
npm --prefix backend install
npm --prefix frontend install --legacy-peer-deps
```

## Run locally

Start the backend in one terminal:

```bash
npm run dev:backend
```

Start the frontend in a second terminal:

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies local `/api` calls to the backend at `http://localhost:8080`.

## Verify

```bash
npm run check
```

This runs both applications' typechecks, tests, and production builds.

## Security model

The browser signs in through Supabase Auth and sends the current access token to the backend. The backend verifies the token with Supabase Auth and forwards it to a request-scoped Supabase client, so PostgreSQL RLS remains active. AI provider keys never enter the browser, browser storage, or API request bodies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full request and data flow.
