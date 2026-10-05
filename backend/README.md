# Wealthy Backend

Authenticated Node.js API for Wealthy's finance operations and AI receipt extraction.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:8080`. `GET /api/health` is public; finance and OCR endpoints require `Authorization: Bearer <Supabase access token>`.

Use Node.js 22 or newer. Never place `GROQ_API_KEY`, `OPENROUTER_API_KEY`, or a Supabase service-role key in the frontend.
