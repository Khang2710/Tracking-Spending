# Receipt Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert a restaurant receipt into an editable, fair split-bill breakdown of items, fees, discounts, and printed total.

**Architecture:** The backend returns typed, fixed monetary amounts. The frontend converts all scanned values to VND base storage at the Split Bill boundary, and a pure calculator allocates adjustments and compares its total with the receipt total.

**Tech Stack:** React, TypeScript, Vitest, Express, OpenAI-compatible vision providers.

## Global Constraints

- Persist all monetary values in VND base units.
- OCR returns explicit amounts, never inferred percentages.
- Invalid, negative, and percentage-style OCR adjustments become zero.
- Item discounts are item-specific; bill discount and tax are proportional to discounted item cost; service charge, tip, and other fees are equal shares.
- Printed receipt total is comparison-only and never overwrites calculated values.

---

### Task 1: Expand backend receipt OCR result

**Files:**

- Modify: `backend/src/modules/receipt-ocr/receiptItems.ts`
- Modify: `backend/src/modules/receipt-ocr/providers.ts`
- Modify: `backend/src/modules/receipt-ocr/ocr.service.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/receiptItems.test.ts`
- Test: `backend/tests/receiptOcrService.test.ts`
- Test: `backend/tests/app.test.ts`

**Produces:**

```ts
interface ReceiptScanResult {
  items: ReceiptItem[];
  tax: number;
  serviceCharge: number;
  tip: number;
  billDiscount: number;
  otherFees: number;
  receiptTotal: number | null;
}
```

- [x] Write failing tests for a receipt with `$7` tax, `$36` service charge, `$0` tip/discount/other fees, and `$234` total.
- [x] Run focused receipt tests; confirm the old result omitted the fields.
- [x] Update the provider prompt to request the exact object; preserve items and default missing invalid adjustments to zero, but keep missing total as `null`.
- [x] Run backend typecheck, build, and focused receipt tests.
- [x] Commit: `feat: extract full receipt adjustments`.

### Task 2: Carry the full result through frontend OCR

**Files:**

- Modify: `frontend/src/services/ocrService.ts`
- Modify: `frontend/src/services/ocrService.test.ts`
- Modify: `frontend/src/features/split-bill/OcrScannerCard.tsx`
- Modify: `frontend/src/features/split-bill/splitBillAmounts.ts`
- Test: `frontend/src/features/split-bill/splitBillAmounts.test.ts`

**Produces:**

```ts
interface OcrScanResult {
  items: OcrParsedItem[];
  tax: number;
  serviceCharge: number;
  tip: number;
  billDiscount: number;
  otherFees: number;
  receiptTotal: number | null;
}
```

- [x] Write failing client tests for every adjustment and nullable `receiptTotal`.
- [x] Run focused OCR and currency-conversion tests; confirm the old client result omitted the fields.
- [x] Normalize every non-total adjustment to a finite non-negative amount; preserve `receiptTotal: null`; keep API keys out of browser code.
- [x] Run the focused tests plus `npm run typecheck`.
- [ ] Commit: `feat: carry receipt adjustments to split bills`.

### Task 3: Allocate adjustments and reconcile total

**Files:**

- Modify: `frontend/src/features/split-bill/splitBillCalculator.ts`
- Modify: `frontend/src/features/split-bill/splitBillCalculator.test.ts`

**Calculator input:**

```ts
{
  participants, items: [{ name, price, discount, consumers }],
  tax, serviceCharge, tip, billDiscount, otherFees, receiptTotal
}
```

**Calculator output:** debt lines for `itemCost`, `itemDiscount`, `billDiscount`, `tax`, `serviceCharge`, `tip`, `otherFees`, `total`; summary totals and `receiptDifference`.

- [x] Write a failing test with two people, a `$20` discount on only Khang's `$100` item, a `$18` bill discount, `$18` tax, `$20` service charge, `$10` tip, `$2` other fees, and the correctly calculated `$212` receipt total.
- [x] Run `npm test -- --run src/features/split-bill/splitBillCalculator.test.ts`; confirm failure.
- [x] Implement: item discount reduces only that item's consumers; bill discount/tax are proportional after item discounts (equal if no item cost); service/tip/other fees are equal; total is `subtotal - item discounts - bill discount + tax + service + tip + other fees`; difference is calculated total minus printed total.
- [x] Run the calculator test; confirm pass.
- [ ] Commit: `feat: allocate receipt adjustments fairly`.

### Task 4: Add editable receipt-breakdown UI and history

**Files:**

- Modify: `frontend/src/features/split-bill/AssignBill.tsx`
- Modify: `frontend/src/features/split-bill/SplitScreen.tsx`
- Modify: `frontend/src/features/split-bill/BillHistory.tsx`
- Test: `frontend/src/features/split-bill/SplitScreen.serviceCharge.test.tsx`

- [x] Write a failing interaction test: scan result fills Tax `$7`, Service charge `$36`, and receipt total `$234`; debt row labels all non-zero adjustments; matching total shows `Matches receipt`.
- [x] Run `npm test -- --run src/features/split-bill/AssignBill.receiptBreakdown.test.tsx`; confirm it initially fails on missing accessible adjustment labels.
- [x] Add editable amount fields for Tax, Service charge, Tip/gratuity, Bill discount, Other fees, and selected-item discount. Convert every displayed amount using `toStoredSplitBillAmount`; persist every adjustment in `SavedBill`; display every non-zero adjustment in history and debt rows.
- [x] Run focused UI/calculator tests, `npm run typecheck`, and `npm run build`.
- [ ] Commit: `feat: add editable receipt breakdown`.

### Task 5: Verify the receipt flow

- [ ] Run `npm run typecheck && npm test && npm run build` in `backend`; confirm pass.
- [ ] Run `npm run check` in `frontend`; confirm pass.
- [ ] In USD mode, scan the supplied receipt and verify `$191` subtotal, `$7` tax, `$36` service charge, `$234` printed total, and a matching-total state.
- [ ] Run `git status --short`; confirm no uncommitted feature files remain.
