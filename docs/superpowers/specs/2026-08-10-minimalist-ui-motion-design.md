# Minimalist UI Polish & Motion Refinement Design Spec

**Date:** 2026-08-10  
**Status:** Approved  
**Topic:** Minimalist UI Polish, Alignment, and High-Performance Motion Transitions  

---

## 1. Overview & Objective

Keep the existing visual design and color identity of the Tracking Spending (Wealthy) web application intact, while performing a full-pass UI polish and motion optimization. The goal is to make all interactions, tab transitions, modal dialogs, and button states feel tactile, fast, unified, and premium—adopting Apple/Linear-style minimalist motion physics without sluggish or extraneous visual fluff.

---

## 2. Minimalist Motion & Physics System

### 2.1 Easing & Timing Constraints
- **Maximum Transition Duration:** 150ms – 240ms.
- **Primary Easing Curve:** `cubic-bezier(0.16, 1, 0.3, 1)` (Apple/Linear spring ease-out).
- **Spring Physics Config:** `{ stiffness: 400, damping: 32 }` for physical tactile response.

### 2.2 Component Motion Specs

| Component / Interaction | Animation Behavior | Parameters |
| :--- | :--- | :--- |
| **Tab / Screen Switching** | Fade + 6px Y-translation | `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}` (180ms) |
| **Interactive Buttons & Cards** | Subtle 2% scale drop on press | `whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}` (150ms) |
| **Modals & Drawers** | Center scale-up + backdrop blur fade | `initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}` (180ms) |
| **Participant Checkmarks / Badges** | Spring scale pop | `initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}` (150ms) |
| **Item List Staggering** | Staggered fade entrance | 20ms delay per child item |

---

## 3. UI Polish & Visual Alignment

### 3.1 Layout & Spacing Standardization
- Standardize container padding (`px-4 sm:px-6`), max-widths (`max-w-2xl` / `max-w-4xl`), and grid gaps (`gap-3` / `gap-4`).
- Ensure all interactive elements have explicit `cursor-pointer` utility classes.
- Ensure minimum touch target heights of `44px` on mobile screens.

### 3.2 Border & Contrast Consistency
- Align border tokens to `border-white/10` / `C.border` for subtle card boundaries.
- Ensure muted subtext complies with minimum 4.5:1 contrast ratio against dark backgrounds (`#09090B` / `#121318`).

### 3.3 Target Components & Files
1. [`frontend/src/App.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/App.tsx): Dashboard cards, navigation tabs, floating top bar, transaction list items.
2. [`frontend/src/features/split-bill/AssignBill.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/AssignBill.tsx): Dish item cards, consumer selection pills, calculation summary card, add item inputs.
3. [`frontend/src/features/split-bill/DebtBalances.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/DebtBalances.tsx): Running debt list items, Nudge button interactions, settle modal details.
4. [`frontend/src/features/split-bill/BillHistory.tsx`](file:///Users/khang/Documents/Project/Tracking%20Spending/frontend/src/features/split-bill/BillHistory.tsx): History item cards, itemized breakdown modal animations.

---

## 4. Verification & Quality Assurance

1. **Build Validation:** Execute `npm run build` to verify zero TypeScript or Vite minification errors.
2. **Runtime Verification:** Test tab switching, modal opening/closing, card tapping, and OCR extraction loading state for zero jank or layout shift.
3. **Deployment:** Commit to `main` branch and verify Vercel production deployment.
