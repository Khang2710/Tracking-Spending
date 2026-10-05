# Receipt breakdown for split bills

## Goal

Turn a scanned restaurant receipt into an editable, fair split-bill breakdown: purchased items, tax, service charge, gratuity/tip, discounts, other explicit fees, and the printed total.

## Receipt scan

The OCR response contains `items`, `tax`, `serviceCharge`, `tip`, `billDiscount`, `otherFees`, and `receiptTotal`. Every value is an amount written on the receipt, never an inferred percentage. An item may include a `discount` only when the receipt clearly ties it to that item; otherwise the amount goes into `billDiscount`.

The scanner defaults an absent or invalid fee to zero. `receiptTotal` is nullable because a receipt may not show a readable total. Monetary values are interpreted in the active app currency and converted to the VND-based storage amount exactly once at the Split Bill boundary.

## User interface

The calculation panel contains editable amount inputs for Tax, Service charge, Tip/gratuity, Bill discount, and Other fees. OCR fills these values after scanning, and the user can correct them before saving.

Each selected item can expose an editable item discount. The debt panel lists item cost, item discounts, bill discount, tax, service charge, tip, and other fees when non-zero. A receipt-total indicator compares the calculated total with the printed total and shows a clear difference if they do not match.

## Allocation rules

1. Item discounts reduce only the people assigned to that item.
2. Bill discount is distributed proportionally to each participant's discounted item subtotal; if nobody has item cost, it is divided equally.
3. Tax is distributed proportionally to each participant's discounted item subtotal; if nobody has item cost, it is divided equally.
4. Service charge, tip/gratuity, and other fees are divided equally among all participants.
5. The grand total is `item subtotal - item discounts - bill discount + tax + service charge + tip + other fees`.

## Acceptance example

For the supplied USD receipt, the item subtotal is `$191`, service charge `$36`, tax `$7`, and no tip or discount. The calculated total is `$234`, matching the printed receipt total. With two people who both share all items, each debt includes `$18` service charge and `$3.50` tax.

## Error handling and tests

OCR must not turn negative amounts or percentages into charges. Invalid values default to zero without discarding valid items. Unit tests cover parsing, currency conversion, allocation of every adjustment, the printed-total reconciliation, and an item-specific discount.
