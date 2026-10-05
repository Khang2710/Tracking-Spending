# Mobile Form Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a keyboard-safe iPhone/PWA New Transaction sheet with persistent optional notes, while creating a reusable mobile form-sheet primitive.

**Architecture:** Extract New Transaction into a focused feature component and render it inside a reusable `MobileFormSheet`. The sheet owns visual-viewport, safe-area, body-scroll and focus behavior; the transaction form owns its values and validation. Add an optional `note` end-to-end through the existing authenticated backend, Supabase migration and transaction mapping without changing wallet-balance semantics or RLS.

**Tech Stack:** React 19, TypeScript, Vaul, Tailwind CSS, Vitest + Testing Library, Express, Zod, Supabase/Postgres migrations.

## Global Constraints

- Mobile must use `window.visualViewport` when present and `100dvh` fallback when absent.
- No secret, Supabase service-role key, or provider key is introduced into frontend code or migration files.
- The database migration is imperative and must preserve existing RLS policies and wallet ownership rules.
- `note` is optional, trimmed, capped at 500 characters, and stored as `null` when blank.
- New Transaction keeps Description, Amount, Category, Transaction date, and Wallet visible in the compact mobile sheet; Note is disclosed on demand.
- Do not alter OCR, Split Bills, transaction amount sign rules, or wallet-balance RPC behavior.

---

## File Structure

- Create `frontend/src/components/mobile/MobileFormSheet.tsx` — reusable dialog/sheet that tracks the visible iOS viewport, handles safe-area padding, contains scrolling content, and exposes a sticky footer.
- Create `frontend/src/components/mobile/MobileFormSheet.test.tsx` — behavior tests for viewport CSS state, cleanup, close focus, and fallback behavior.
- Create `frontend/src/features/transactions/NewTransactionForm.tsx` — focused transaction input form with compact mobile field layout and expandable Note.
- Create `frontend/src/features/transactions/NewTransactionForm.test.tsx` — interaction tests for required fields, Note disclosure, and submit payload.
- Modify `frontend/src/App.tsx` — remove the inline Add Transaction form and current Drawer markup; render `MobileFormSheet` plus `NewTransactionForm`.
- Modify `frontend/src/types/finance.ts` and `frontend/src/features/finance-data/finance.repository.ts` — map and send `note` consistently.
- Modify `frontend/src/features/finance-data/finance.repository.test.ts` — prove note maps, creates, updates, and preserves legacy null values.
- Modify `backend/src/modules/finance/finance.schemas.ts` and `backend/src/modules/finance/finance.repository.ts` — validate, select, and pass note to existing transaction RPC calls.
- Modify `backend/tests/finance.routes.test.ts` — prove authenticated transaction routes accept valid notes and reject oversized/unknown fields.
- Create a generated `supabase/migrations/*_add_tracker_transaction_note.sql` — add nullable note column and replace only the two transaction RPC signatures/bodies plus execute grants.

### Task 1: Build the reusable keyboard-safe MobileFormSheet

**Files:**
- Create: `frontend/src/components/mobile/MobileFormSheet.tsx`
- Test: `frontend/src/components/mobile/MobileFormSheet.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type MobileFormSheetProps = {
    open: boolean;
    title: string;
    description: string;
    onOpenChange(open: boolean): void;
    footer?: React.ReactNode;
    children: React.ReactNode;
  };
  export function MobileFormSheet(props: MobileFormSheetProps): React.ReactElement | null;
  ```
- Consumes: `Drawer` from `vaul`; browser `window.visualViewport` when available.

- [ ] **Step 1: Write failing component tests**

  Create tests that install a fake `window.visualViewport`, set `window.innerHeight = 844`, set its `height = 520`, and dispatch `resize`. Assert that an open sheet has CSS custom property `--keyboard-offset: 324px`; assert it resets/removes the property after close and listener cleanup. Also render with no `visualViewport` and assert the dialog remains available.

  ```tsx
  it("tracks the keyboard-covered visual viewport and cleans up on close", () => {
    const { rerender } = render(<MobileFormSheet open title="New Transaction" description="Add transaction" onOpenChange={vi.fn()}><input aria-label="Description" /></MobileFormSheet>);
    act(() => viewport.resizeTo(520));
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "324px" });
    rerender(<MobileFormSheet open={false} title="New Transaction" description="Add transaction" onOpenChange={vi.fn()} />);
    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `npm test -- --run src/components/mobile/MobileFormSheet.test.tsx`

  Expected: FAIL because `MobileFormSheet` does not exist.

- [ ] **Step 3: Implement the smallest reusable component**

  Create `MobileFormSheet` with these behaviors:

  ```tsx
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
  const keyboardOffset = Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop);
  <Drawer.Content
    role="dialog"
    aria-modal="true"
    style={{ "--keyboard-offset": `${keyboardOffset}px` } as React.CSSProperties}
    className="fixed inset-x-0 bottom-0 flex max-h-[calc(100dvh-var(--keyboard-offset))] w-full flex-col rounded-t-[32px] ..."
  >
    <header>...</header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    {footer ? <footer className="shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</footer> : null}
  </Drawer.Content>
  ```

  Subscribe only while `open`; recalculate on `resize` and `scroll`; use `requestAnimationFrame` before focusing/scrolling the focused field into the sheet’s scroll region; restore the trigger focus via Vaul close lifecycle. Apply and remove `document.body.style.overflow = "hidden"` only for the open sheet.

- [ ] **Step 4: Run focused tests**

  Run: `npm test -- --run src/components/mobile/MobileFormSheet.test.tsx`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/components/mobile/MobileFormSheet.tsx frontend/src/components/mobile/MobileFormSheet.test.tsx
  git commit -m "feat: add keyboard-safe mobile form sheet"
  ```

### Task 2: Persist optional transaction notes safely

**Files:**
- Create: generated `supabase/migrations/*_add_tracker_transaction_note.sql`
- Modify: `backend/src/modules/finance/finance.schemas.ts`
- Modify: `backend/src/modules/finance/finance.repository.ts`
- Modify: `backend/tests/finance.routes.test.ts`
- Modify: `frontend/src/types/finance.ts`
- Modify: `frontend/src/features/finance-data/finance.repository.ts`
- Modify: `frontend/src/features/finance-data/finance.repository.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Transaction { note: string | null; }
  const transactionSchema = z.object({ ..., note: z.string().trim().max(500).nullable().optional() }).strict();
  ```
- Consumes: existing `tracker_create_transaction` and `tracker_update_transaction` RPC workflow.

- [ ] **Step 1: Write failing frontend and backend contract tests**

  Extend `finance.repository.test.ts` so a cloud transaction with `note: "Shared birthday dinner"` maps to a local Transaction and so create/update payloads include `note: "Shared birthday dinner"`. Add backend route tests for a 201 create request containing `note`, and a 400 response for a 501-character note.

  ```ts
  expect(JSON.parse(apiRequestMock.mock.calls[0][1].body)).toMatchObject({ note: "Shared birthday dinner" });
  await request(app).post("/api/finance/transactions").set(authHeader).send({ ...validTransaction, note: "x".repeat(501) }).expect(400);
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd frontend && npm test -- --run src/features/finance-data/finance.repository.test.ts && cd ../backend && npm test -- --run tests/finance.routes.test.ts`

  Expected: frontend payload/mapping assertions fail and backend rejects the unknown `note` key.

- [ ] **Step 3: Create and review the migration before applying it**

  Run `supabase migration new add_tracker_transaction_note` from the repository root. In the generated migration:

  ```sql
  alter table public.tracker_transactions add column note text null
    check (note is null or char_length(note) <= 500);
  ```

  Recreate `tracker_create_transaction` and `tracker_update_transaction` with a final `p_note text default null` parameter; normalize it with `nullif(trim(p_note), '')`; include `note` in the insert/update statements; revoke and grant execute for the new full function signatures to `authenticated`. Do not modify tables, policies, or RPCs unrelated to transactions.

- [ ] **Step 4: Update application contracts**

  Add `note` mapping in frontend `CloudTransaction`, local `Transaction`, create/update request bodies, backend `transactionSchema`, `loadAllTransactions` select list, and both backend RPC argument maps. Convert omitted/null/blank values to `null`; never put an empty string in persisted data.

- [ ] **Step 5: Run focused tests and migration checks**

  Run:
  ```bash
  cd frontend && npm test -- --run src/features/finance-data/finance.repository.test.ts
  cd ../backend && npm test -- --run tests/finance.routes.test.ts
  supabase migration list --local
  ```

  Expected: all focused tests pass and the generated migration appears once in the local migration list. If a local Supabase database is configured, execute the migration there and query an inserted transaction with a note to verify it round-trips as text.

- [ ] **Step 6: Commit**

  ```bash
  git add supabase/migrations backend/src/modules/finance backend/tests/finance.routes.test.ts frontend/src/types/finance.ts frontend/src/features/finance-data
  git commit -m "feat: persist optional transaction notes"
  ```

### Task 3: Extract and implement the compact New Transaction form

**Files:**
- Create: `frontend/src/features/transactions/NewTransactionForm.tsx`
- Test: `frontend/src/features/transactions/NewTransactionForm.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes:
  ```ts
  type NewTransactionFormProps = {
    wallets: Wallet[];
    onSubmit(transaction: Omit<Transaction, "id">): void;
  };
  ```
- Produces: a complete form whose submit value has `note: string | null`.

- [ ] **Step 1: Write failing form tests**

  Test default rendering of Description, Amount, Category, Transaction date, Wallet, and a collapsed Note control. Fill core fields, expand Note, type text, submit, and assert the callback receives `note: "Taxi home"`. Submit without opening Note and assert `note: null`.

  ```tsx
  await user.click(screen.getByRole("button", { name: /add note/i }));
  await user.type(screen.getByLabelText(/note/i), "Taxi home");
  await user.click(screen.getByRole("button", { name: /save transaction/i }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ note: "Taxi home" }));
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `npm test -- --run src/features/transactions/NewTransactionForm.test.tsx`

  Expected: FAIL because `NewTransactionForm` does not exist.

- [ ] **Step 3: Implement compact form semantics and layout**

  Move the current Add Transaction state, validation, category guess behavior, amount conversion, and wallet selection from `App.tsx` into `NewTransactionForm`. Use responsive CSS:

  ```tsx
  <div className="grid grid-cols-2 gap-3">
    <AmountField />
    <CategoryField />
  </div>
  <div className="grid grid-cols-2 gap-3">
    <DateField />
    <WalletField />
  </div>
  ```

  Render Description first and keep the type switcher first. The Note button should use `aria-expanded`; only mount its textarea when expanded; enforce `maxLength={500}`. Keep desktop styling readable by allowing the same two-column rows rather than forcing the mobile sheet full screen.

- [ ] **Step 4: Replace the App.tsx drawer body**

  Replace the inline `AddTransactionForm` and hard-coded `Drawer.Root` markup with `MobileFormSheet`. Pass the form submit action through the existing `handleAddTransaction` and close the sheet only after that handler succeeds. Keep the existing `isTxModalOpen` state and AppShell trigger unchanged.

- [ ] **Step 5: Run focused tests**

  Run:
  ```bash
  npm test -- --run src/features/transactions/NewTransactionForm.test.tsx src/components/mobile/MobileFormSheet.test.tsx src/layout/AppShell.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/App.tsx frontend/src/features/transactions/NewTransactionForm.tsx frontend/src/features/transactions/NewTransactionForm.test.tsx
  git commit -m "feat: optimize mobile new transaction form"
  ```

### Task 4: Validate the full mobile PWA flow

**Files:**
- Modify if required by test results: only files from Tasks 1–3.

**Interfaces:**
- Consumes: completed mobile sheet, note API contract, and transaction persistence flow.
- Produces: verified keyboard-safe, persistent transaction form.

- [ ] **Step 1: Add a regression test for App integration**

  Extend the most appropriate existing App-level test or create `frontend/src/features/transactions/NewTransactionFlow.test.tsx`. Mock the finance repository, open New Transaction through the mobile action, save with a note, and assert the create request includes the note and the sheet closes.

- [ ] **Step 2: Run the regression test to verify it fails before any correction**

  Run: `npm test -- --run src/features/transactions/NewTransactionFlow.test.tsx`

  Expected: FAIL until the App wiring exposes and closes the new form correctly.

- [ ] **Step 3: Make the minimum integration correction**

  Fix only the missing wiring shown by Step 2. Do not add new UI behavior in this step.

- [ ] **Step 4: Run the complete automated verification**

  Run:
  ```bash
  cd frontend && npm run check
  cd ../backend && npm run typecheck && npm run build
  ```

  Expected: frontend typecheck, all tests, and production build pass; backend typecheck and build pass.

- [ ] **Step 5: Perform manual iPhone/Home Screen verification**

  Verify on an iPhone Home Screen install:

  1. Open New Transaction and tap Description, Amount, Note, Date, and Wallet in turn.
  2. Confirm each focused input is visible and the sheet never overflows horizontally.
  3. Dismiss the keyboard; confirm the sheet returns to its natural size.
  4. Save a transaction with Note and reload the app; confirm the note persists in the loaded transaction data.
  5. Save a transaction without Note; confirm it saves normally and no blank note text is displayed.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/features/transactions/NewTransactionFlow.test.tsx
  git commit -m "test: cover mobile transaction note flow"
  ```
