# Minimalist UI Polish & Motion Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine, polish, and add Apple/Linear-style minimalist motion transitions and tactile micro-interactions across the Tracking Spending web app without altering the existing core visual identity.

**Architecture:** Utilize `motion/react` with unified spring physics (`stiffness: 400, damping: 32`) and clean fade + Y-offset transitions (`180ms – 240ms`, easing `[0.16, 1, 0.3, 1]`) across all components, modals, and lists.

**Tech Stack:** React 19, Vite, Tailwind CSS, `motion/react`, Lucide React, i18next.

## Global Constraints

- Preserve current color theme and overall visual branding.
- All motion durations MUST be between 150ms and 240ms.
- Easing MUST use `[0.16, 1, 0.3, 1]` or spring physics `{ stiffness: 400, damping: 32 }`.
- All clickable elements MUST include `cursor-pointer` and `whileTap={{ scale: 0.98 }}`.
- Every change MUST build cleanly via `npm run build`.

---

### Task 1: Global CSS & Font Configuration

**Files:**
- Modify: `frontend/src/index.css:1-50`

**Interfaces:**
- Consumes: Google Fonts `@import` for Outfit and Plus Jakarta Sans.
- Produces: CSS animation utility classes (`.hide-scroll`, `.animate-pulse-subtle`).

- [ ] **Step 1: Update index.css with font imports & custom scrollbar/animation utilities**

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: Test build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: configure global Outfit and Plus Jakarta Sans typography"
```

---

### Task 2: Polish Dashboard & Navigation Motion in App.tsx

**Files:**
- Modify: [`frontend/src/App.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/App.tsx)

**Interfaces:**
- Consumes: `motion/react` (AnimatePresence, motion.div, motion.button)
- Produces: Tactile responsive main tabs, header currency/language toggles, balance cards, and transaction list items.

- [ ] **Step 1: Apply Apple-style minimal transitions to main navigation tabs**

Update tab container with `motion.div` using `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}` and `transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}`.

- [ ] **Step 2: Add tactile tap feedback to transaction cards and header buttons**

Add `whileTap={{ scale: 0.98 }}` and `whileHover={{ scale: 1.01 }}` to header action pills, action buttons, and transaction rows.

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "style(app): polish main navigation, header, and transaction card motion physics"
```

---

### Task 3: Polish Split Bill & OCR Component Motion in AssignBill.tsx

**Files:**
- Modify: [`frontend/src/features/split-bill/AssignBill.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/AssignBill.tsx)

**Interfaces:**
- Consumes: `SplitItem`, `AssignBillProps`, `useCurrency`
- Produces: Minimalist motion dish cards, consumer checkmark badges, and scanning beam pulse animations.

- [ ] **Step 1: Enhance dish item cards with spring touch interactions**

Wrap dish card item elements with `whileTap={{ scale: 0.98 }}` and spring transition `{ stiffness: 400, damping: 32 }`.

- [ ] **Step 2: Add spring checkmark scaling for selected consumer badges**

Animate participant avatar selections with `initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}` (150ms).

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/split-bill/AssignBill.tsx
git commit -m "style(split-bill): polish dish item card and consumer pill motion physics"
```

---

### Task 4: Polish Debt Balances & Modal Motion in DebtBalances.tsx & BillHistory.tsx

**Files:**
- Modify: [`frontend/src/features/split-bill/DebtBalances.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/DebtBalances.tsx)
- Modify: [`frontend/src/features/split-bill/BillHistory.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/BillHistory.tsx)

**Interfaces:**
- Consumes: `SavedBill`, `FriendBalanceItem`, `useCurrency`
- Produces: Tactile debt list items, Nudge button tap physics, and smooth modal backdrop scale-ups.

- [ ] **Step 1: Update modal backdrops and scale transitions**

Set modal container entrance to `initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}` and exit to `exit={{ opacity: 0, scale: 0.97 }}` with `duration: 0.18`.

- [ ] **Step 2: Add tactile feedback to debt list rows and bill history cards**

Add `whileTap={{ scale: 0.98 }}` and `cursor-pointer` to all bill history cards and debt rows.

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/split-bill/DebtBalances.tsx frontend/src/features/split-bill/BillHistory.tsx
git commit -m "style(split-bill): polish debt balances and bill history modal motion transitions"
```
