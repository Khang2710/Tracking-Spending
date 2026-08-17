# Tracking Spending & Split Bill System - System Architecture & Codebase Map

> **Updated**: August 2026  
> **Tech Stack**: Spring Boot 3.2.3 (Java 17), React 18, TypeScript, TailwindCSS, Supabase PostgreSQL & Auth, Groq AI OCR, Render & Vercel.

---

## 1. System Overview

The **Tracking Spending & Split Bill System** is a modern full-stack web application designed for personal expense tracking, group bill splitting, debt management, and AI-powered receipt OCR extraction.

- **Frontend**: React 18 SPA built with Vite, TypeScript, TailwindCSS, Lucide icons, and Supabase client SDK. Deployed on **Vercel** (`https://tracking-spending-k.vercel.app`).
- **Backend**: Spring Boot 3.2.3 REST API with Spring Data JPA, Spring Security (Supabase JWT HS256), and PostgreSQL database. Deployed on **Render** (`spending-tracker-backend`).
- **Database**: PostgreSQL hosted on **Supabase** with Connection Pooling (HikariCP).
- **Authentication**: **Supabase Auth** (Email/Password + Google OAuth), integrated with Spring Security JWT Filter and auto-provisioning logic (`auth_id` mapping).
- **AI Integrations**:
  - **OCR Receipt Scanning**: Groq API (`qwen/qwen3.6-27b`) for intelligent multi-currency bill extraction (Items, Subtotal, Tax, Tip, Service Charge, Discount).
  - **AI Meme Nudge**: Groq/OpenAI/Gemini for generating Gen-Z meme debt reminder messages.

---

## 2. Directory & Component Structure

```
Tracking-Spending/
├── api/                             # Serverless / Vercel Edge OCR API
│   └── ocr.ts                       # Groq Qwen receipt OCR parser endpoint
├── backend/                         # Spring Boot 17 Maven Project
│   ├── Dockerfile                   # Docker build with JVM memory caps (-Xmx256m)
│   ├── pom.xml                      # Maven dependencies (Spring Security, JJWT, JPA, Postgres)
│   └── src/
│       ├── main/
│       │   ├── java/com/spending/tracker/
│       │   │   ├── Application.java
│       │   │   ├── config/          # Spring Security & Supabase JWT Filter
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   └── SupabaseJwtFilter.java
│       │   │   ├── controller/      # REST API Controllers
│       │   │   │   ├── UserController.java       # /api/me (Auth user)
│       │   │   │   ├── SplitBillController.java  # /api/bills
│       │   │   │   ├── DebtController.java       # /api/debts
│       │   │   │   ├── UserBalanceController.java# /api/balances
│       │   │   │   ├── SavingsGoalController.java# /api/savings
│       │   │   │   ├── OcrController.java        # Backend OCR Proxy
│       │   │   │   ├── CategoryGuessController.java
│       │   │   │   └── AiNudgeController.java    # AI Meme Nudge generator
│       │   │   ├── dto/             # Data Transfer Objects
│       │   │   ├── entity/          # JPA Entities
│       │   │   │   ├── User.java                 # User entity with auth_id mapping
│       │   │   │   ├── Wallet.java
│       │   │   │   ├── Transaction.java
│       │   │   │   ├── Bill.java
│       │   │   │   ├── BillParticipant.java
│       │   │   │   ├── Debt.java
│       │   │   │   ├── DebtTransaction.java
│       │   │   │   ├── FriendBalance.java
│       │   │   │   └── SavingsGoal.java
│       │   │   ├── repository/      # Spring Data Repositories
│       │   │   └── service/         # Business Logic Services
│       │   │       ├── UserService.java          # Auto-provision user logic
│       │   │       ├── DebtService.java          # Debt settlement & net calculation
│       │   │       └── DebtSettleUpSystem.java
│       │   └── resources/
│       │       └── application.properties # App & Database settings
│       └── test/                    # JUnit 5 & Mockito test suite
└── frontend/                        # React + Vite TypeScript SPA
    ├── src/
    │   ├── App.tsx                  # Main router & layout shell
    │   ├── contexts/                # Auth, Currency, and Theme Contexts
    │   │   ├── AuthContext.tsx
    │   │   ├── CurrencyContext.tsx
    │   │   └── ThemeContext.tsx
    │   ├── features/                # Core Feature Modules
    │   │   ├── auth/                # Sign In / Sign Up Screen (Email + Google OAuth)
    │   │   ├── dashboard/           # Dashboard overview & monthly budget
    │   │   ├── split-bill/          # Split Bill Calculator & OCR UI
    │   │   │   ├── AssignBill.tsx   # Split item assignment, Tax/Tip/Fee/Discount UI
    │   │   │   ├── DebtBalances.tsx # Running balances & AI Meme Nudge trigger
    │   │   │   ├── SplitScreen.tsx  # Parent Split Bill View
    │   │   │   └── OcrScannerCard.tsx
    │   │   ├── Statistics/          # Spending charts & Cash Flow Calendar
    │   │   ├── Transaction/         # Transaction Manager & Form modal
    │   │   ├── wallet/              # Active Wallets Manager
    │   │   └── budget/              # Monthly Budget Manager
    │   ├── locales/                 # Internationalization (i18n)
    │   │   ├── en.ts                # English translations dictionary
    │   │   └── vi.ts                # Vietnamese translations dictionary
    │   ├── services/
    │   │   └── ocrService.ts        # OCR API client handler & prompt builder
    │   └── lib/
    │       └── supabaseClient.ts    # Supabase JS Client instance
    └── vite.config.ts
```

---

## 3. Key Technical Features & Algorithms

### A. AI Receipt OCR Extraction (`Qwen 3.6 27B`)
- **Engine**: Groq Vision API via `qwen/qwen3.6-27b` model with `max_tokens: 4000`.
- **Extracted Fields**:
  - `items`: Dish names and base prices.
  - `tax`: Absolute dollar amount (USD) or percentage (VND).
  - `tip`: Flat tip amount.
  - `serviceCharge`: Processing Fee / Service Charge combined sum.
  - `discount`: Absolute discount amount (e.g., `-37.80` -> `37.80`).
  - `currency`: Automatic detection (`USD` or `VND`).
- **Regex & JSON Parser Resilience**: Fallback JSON parsers extract valid items even if LLM reasoning tags (`<think>`) pre-pend the JSON payload.

### B. Split Bill & Debt Calculation Formula
$$\text{Total Bill} = \text{Items Subtotal} - \text{Discount} + \text{Tax} + \text{Service Charge} + \text{Tip}$$

For each participant $p$:
$$\text{Discount Share}_p = \frac{\text{Personal Item Cost}_p}{\text{Subtotal}} \times \text{Discount}$$
$$\text{Personal Tax}_p = \frac{\text{Personal Item Cost}_p}{\text{Subtotal}} \times \text{Tax}$$
$$\text{Total Due}_p = \text{Personal Item Cost}_p - \text{Discount Share}_p + \text{Personal Tax}_p + \frac{\text{Tip} + \text{Service Charge}}{N}$$

### C. Supabase Auth JWT Verification & User Auto-Provisioning (Spring Boot)
1. Frontend sends `Authorization: Bearer <Supabase_JWT>` header.
2. `SupabaseJwtFilter` validates HS256 signature using `supabase.jwt.secret`.
3. `UserService.getOrCreateUser(authId, email)` checks DB for `auth_id` (or `email`).
4. Automatically provisions a new `User` record if it does not exist yet.
5. Populates Spring `SecurityContextHolder` for seamless `@AuthenticationPrincipal` injection.

---

## 4. Environment Variables

| Variable | Description | System |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC Connection URL | Backend (Render) |
| `SPRING_DATASOURCE_USERNAME` | Supabase Postgres Username | Backend (Render) |
| `SPRING_DATASOURCE_PASSWORD` | Supabase Postgres Password | Backend (Render) |
| `SUPABASE_JWT_SECRET` | Supabase JWT Secret Key (HS256) | Backend (Render) |
| `VITE_SUPABASE_URL` | Supabase Project URL | Frontend (Vercel) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Public Key | Frontend (Vercel) |
| `VITE_GROQ_KEY` / `GROQ_API_KEY` | Groq API Key for OCR & Meme AI | Frontend / Vercel Edge |
