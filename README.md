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
npm --prefix backend ci
npm --prefix frontend ci
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

### Test on an iPhone over private Wi-Fi

Connect the Mac and iPhone to the same trusted private Wi-Fi. Use the environment setup above and leave `VITE_API_BASE_URL` empty so the iPhone's `/api` requests use the Vite proxy on the Mac. Keep backend secrets in `backend/.env`; only browser-safe Supabase configuration belongs in `frontend/.env.local`.

From the repository root, start the backend in one terminal:

```bash
NODE_ENV=development npm run dev:backend
```

Start the LAN frontend in another terminal:

```bash
npm --prefix frontend run dev:lan
```

The LAN command binds Vite to `0.0.0.0` and requires port `5173`; if that port is occupied, stop the existing frontend process first. Find the Mac's Wi-Fi IPv4 address in **System Settings → Wi-Fi → Details → TCP/IP**. In Safari on the iPhone, open `http://<Mac-LAN-IP>:5173` with that address substituted. `localhost` on the iPhone refers to the iPhone itself, so it cannot reach the Mac's app.

In development, backend CORS accepts HTTP origins on port `5173` from `localhost`, loopback IPv4 (`127.0.0.0/8`), and private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). Production and test modes accept only the configured `FRONTEND_ORIGINS` allowlist. You do not need to commit a LAN IP or change the production allowlist for this workflow.

If Safari cannot connect, allow the Node/Vite process through the Mac firewall for the trusted network and check that the Wi-Fi does not isolate clients. Keep both terminals running during testing and stop them afterward. Do not forward the development port to the internet or use this workflow on public Wi-Fi.

## Verify

```bash
npm run check
```

This runs both applications' typechecks, tests, and production builds.

## Deploy

The repository includes `render.yaml` for the backend and `vercel.json` for the frontend.

For Render, create a Blueprint from this repository. Render will build the Node service from `backend/` and use `/api/health` as its health check. Enter the environment variables marked `sync: false` in the Render dashboard; never commit their values.

For Vercel, import the repository from GitHub. Add these project environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

After Vercel assigns the production domain, set `FRONTEND_ORIGINS` on Render to that exact origin, for example `https://your-project.vercel.app`.

## Security model

The browser signs in through Supabase Auth and sends the current access token to the backend. The backend verifies the token with Supabase Auth and forwards it to a request-scoped Supabase client, so PostgreSQL RLS remains active. AI provider keys never enter the browser, browser storage, or API request bodies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full request and data flow.
