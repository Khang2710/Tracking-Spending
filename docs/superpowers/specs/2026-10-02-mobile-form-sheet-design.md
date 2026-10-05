# Mobile Form Sheet Design

## Goal

Make mobile web-app forms behave predictably in iOS Safari and Home Screen mode when the software keyboard opens and closes. The first consumer is New Transaction; the component is intentionally reusable for future form sheets.

## User experience

On phones, New Transaction opens as a keyboard-safe form sheet.

- The sheet always uses the visible viewport width and remains horizontally contained.
- When the keyboard opens, the focused input remains visible inside the sheet's own scrolling content area.
- When the keyboard closes, the sheet returns to its natural height and clears any temporary keyboard offset.
- The page behind the sheet does not scroll while the sheet is open.
- Safe-area spacing is respected above the home indicator.

## New Transaction layout

The compact keyboard state keeps all core transaction data visible without a vertical hunt:

1. Type switcher: Income or Outcome.
2. Description.
3. Amount and Category in a two-column row.
4. Transaction date and selected wallet in a two-column row.
5. An optional Note disclosure row, shown below the required fields.
6. A Save transaction action anchored above the keyboard / safe area.

Note is optional and starts collapsed. Opening it reveals a text field in the sheet content; it does not change the default compact layout.

## Shared component boundary

`MobileFormSheet` owns only mobile presentation and viewport behavior. It accepts a title, close action, scrollable children, and an optional sticky footer. It does not own transaction values or validation.

It uses `window.visualViewport` when available to calculate the keyboard-covered portion of the layout. It subscribes while open and removes listeners and temporary document styles on close/unmount. Browsers without `visualViewport` use standards-based dynamic viewport sizing as a fallback.

Existing read-only overlays remain unchanged initially. Future input-heavy sheets can adopt the component without duplicating iOS keyboard code.

## Error handling and accessibility

- Keep a labeled dialog with a visible close action.
- Preserve focus within the open sheet and return focus to the trigger when it closes.
- Use native date and select controls for keyboard-appropriate iOS input.
- A viewport listener failure must fall back to a scrollable sheet, never clip or overflow the form.

## Verification

- Component tests verify normal and keyboard-adjusted layout state and cleanup on close.
- New Transaction tests cover default rendering of date, wallet, and collapsed Note; opening Note reveals its field.
- Manual iPhone Safari/Home Screen checks: opening and dismissing keyboard, focus through every core field, rotating once, and saving with and without a note.
- Full frontend typecheck, test suite, and production build must pass.

## Note persistence

Note is optional but persistent. Add a nullable `note` column to `public.tracker_transactions`, return it from workspace reads, and pass it through the authenticated transaction create and update routes. Existing transactions keep `note = null`. The migration must not alter RLS policies, wallet-balance behavior, or existing transaction ownership rules.

## Scope

This change does not make a native iOS app or add Apple Developer Program requirements. It adds only the transaction-note persistence required by the approved form; it does not redesign the rest of transaction history.
