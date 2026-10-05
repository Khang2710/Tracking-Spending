# Service Charge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read a receipt's fixed service-charge amount, let the user edit it, and include it transparently in the split-bill total and debts while retaining the existing user-entered Tax and Tip fields.

**Architecture:** The OCR API changes from an item array to a structured receipt result that contains items and a `serviceCharge` amount. The frontend stores all monetary fields in VND base units, converts the OCR amount once at the Split Bill boundary, and uses the existing pure calculator to distribute service charge equally.

**Tech Stack:** React, TypeScript, Vitest, Express, OpenAI-compatible vision providers.

## Global Constraints

- Keep all persisted monetary amounts in VND base units.
- Treat `serviceCharge` as a fixed amount, not a percentage.
- Do not include service charge in item subtotal or apply tax to it.
- Split service charge and tip equally across all participants.
- Preserve an editable zero-value fallback when OCR has no service-charge line.

---

### Task 1: Return a structured OCR receipt result

**Files:**
- Modify: `backend/src/modules/receipt-ocr/receiptItems.ts`
- Modify: `backend/src/modules/receipt-ocr/providers.ts`
- Modify: `backend/src/modules/receipt-ocr/ocr.service.ts`
- Test: `backend/tests/receiptItems.test.ts`
- Test: `backend/tests/receiptOcrService.test.ts`

**Interfaces:**
- Produces: `ReceiptScanResult` with `items: ReceiptItem[]` and `serviceCharge: number`.
- Consumes: raw model JSON from the OpenAI-compatible providers.

- [ ] **Step 1: Write the failing parser test**

```ts
expect(extractReceiptScan('{"items":[{"name":"Egust","price":35}],"serviceCharge":36}'))
  .toEqual({ items: [{ name: "Egust", price: 35 }], serviceCharge: 36 });
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- --run tests/receiptItems.test.ts`

Expected: FAIL because `extractReceiptScan` does not exist.

- [ ] **Step 3: Implement the parser and provider contract**

```ts
export interface ReceiptScanResult {
  items: ReceiptItem[];
  serviceCharge: number;
}

export function extractReceiptScan(raw: string): ReceiptScanResult {
  const parsed = JSON.parse(raw) as { items?: unknown; serviceCharge?: unknown };
  return {
    items: extractReceiptItems(JSON.stringify(parsed.items ?? [])),
    serviceCharge: parseReceiptPrice(parsed.serviceCharge),
  };
}
```

Update the OCR prompt to request only this JSON shape and explicitly read an amount from lines such as `Service Charge`; exclude tax, tip, discounts, and payment lines from both items and service charge.

- [ ] **Step 4: Update the OCR service to return `ReceiptScanResult` and run tests**

Run: `npm test -- --run tests/receiptItems.test.ts tests/receiptOcrService.test.ts`

Expected: PASS, including the existing fallback-provider behavior.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/receipt-ocr backend/tests/receiptItems.test.ts backend/tests/receiptOcrService.test.ts
git commit -m "feat: extract receipt service charges"
```

### Task 2: Carry service charge through the OCR endpoint and scanner

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/tests/app.test.ts`
- Modify: `frontend/src/services/ocrService.ts`
- Modify: `frontend/src/services/ocrService.test.ts`
- Modify: `frontend/src/features/split-bill/OcrScannerCard.tsx`

**Interfaces:**
- Consumes: `ReceiptScanResult` from `POST /api/ocr`.
- Produces: `OcrScanResult` with `items: OcrParsedItem[]` and `serviceCharge: number`.

- [ ] **Step 1: Write failing API and client tests**

```ts
await withAuth(request(app).post("/api/ocr").send(body)).expect(200, {
  items: [{ name: "Coffee", price: 5 }],
  serviceCharge: 1,
});

expect(await processReceiptOcr(options)).toEqual({
  items: [{ name: "Coffee", price: 5 }],
  serviceCharge: 1,
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- --run tests/app.test.ts` in `backend`, then `npm test -- --run src/services/ocrService.test.ts` in `frontend`.

Expected: FAIL because each interface still expects an item array.

- [ ] **Step 3: Implement the structured response at both boundaries**

```ts
export interface OcrScanResult {
  items: OcrParsedItem[];
  serviceCharge: number;
}
```

Pass the whole result from `OcrScannerCard` to its parent. Preserve the current cancellation, upload validation, and generic failure UI.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/app.test.ts` in `backend`, then `npm test -- --run src/services/ocrService.test.ts` in `frontend`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts backend/tests/app.test.ts frontend/src/services/ocrService.ts frontend/src/services/ocrService.test.ts frontend/src/features/split-bill/OcrScannerCard.tsx
git commit -m "feat: pass receipt service charge to split bills"
```

### Task 3: Edit and distribute service charge in Split Bill

**Files:**
- Modify: `frontend/src/features/split-bill/splitBillAmounts.ts`
- Modify: `frontend/src/features/split-bill/splitBillCalculator.ts`
- Modify: `frontend/src/features/split-bill/splitBillCalculator.test.ts`
- Modify: `frontend/src/features/split-bill/AssignBill.tsx`
- Modify: `frontend/src/features/split-bill/SplitScreen.tsx`
- Modify: `frontend/src/features/split-bill/BillHistory.tsx`

**Interfaces:**
- Consumes: `OcrScanResult` from `OcrScannerCard`.
- Produces: calculator debts containing `serviceCharge` and a grand total of `subtotal + tax + serviceCharge + tip`.

- [ ] **Step 1: Write the failing calculation test**

```ts
const result = calculateSplitBill({
  participants: ["Khang", "Minh"],
  items: [{ name: "Dinner", price: 4_775_000, consumers: [] }],
  taxPercent: 3.66,
  serviceCharge: 900_000,
  tip: 0,
});

expect(result.grandTotal).toBe(5_850_000);
expect(result.debts[0].serviceCharge).toBe(450_000);
```

- [ ] **Step 2: Run the calculation test to verify it fails**

Run: `npm test -- --run src/features/split-bill/splitBillCalculator.test.ts`

Expected: FAIL because `serviceCharge` is not part of the calculator input or debt result.

- [ ] **Step 3: Implement the calculator and editable UI**

```ts
const serviceChargePerPerson = participantCount > 0 ? serviceCharge / participantCount : 0;
const total = itemCost + tax + serviceChargePerPerson + tipPerPerson;
```

Add an editable monetary input labeled `Service charge` beside Tax and Tip. Convert its displayed USD value with `toStoredSplitBillAmount`, store it in base units, show a separate Service charge line in each debt row, and show it in the summary. On OCR result, replace the service-charge input with the converted OCR amount while appending parsed items.

Persist `serviceCharge` in `SavedBill` and show it in bill history.

- [ ] **Step 4: Run focused frontend tests and build**

Run: `npm test -- --run src/features/split-bill/splitBillAmounts.test.ts src/features/split-bill/splitBillCalculator.test.ts && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/split-bill
git commit -m "feat: split receipt service charges"
```

### Task 4: Verify the complete change

**Files:**
- Verify: `backend/tests/*.test.ts`
- Verify: `frontend/src/**/*.test.ts*`

**Interfaces:**
- Consumes: all completed feature changes.
- Produces: fresh build and test evidence before deployment.

- [ ] **Step 1: Run backend verification**

Run: `npm run typecheck && npm test && npm run build` in `backend`.

Expected: all tests pass and TypeScript build exits with status 0.

- [ ] **Step 2: Run frontend verification**

Run: `npm run check` in `frontend`.

Expected: all tests pass, typecheck passes, and Vite build exits with status 0.

- [ ] **Step 3: Manually verify the supplied-receipt scenario**

Run the app in USD mode, scan the supplied receipt, verify items total `$191` and service charge `$36`, enter tax `$7` and tip `$0`, then verify grand total `$234` before saving.

- [ ] **Step 4: Commit the verification-facing changes if any remain**

```bash
git status --short
```

Expected: no uncommitted feature files remain.
