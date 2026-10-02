# Service charge for split bills

## Goal

Include a fixed service-charge amount from a scanned receipt in the split-bill total and each participant's debt.

## Receipt scan

The receipt OCR response will include a `serviceCharge` amount when the receipt contains an explicit service-charge line. The scanner will leave the value at zero when no such line exists. The value is interpreted in the currently selected app currency and converted to the app's VND-based storage amount before it is used in calculations.

## User interface

The calculations panel will contain an editable `Service charge` monetary input next to Tax and Tip. OCR populates the input after a successful scan. The user may edit the amount or set it to zero.

## Calculation

The grand total is `items subtotal + tax + service charge + tip`.

The service charge and tip are each split equally among all participants. Tax remains proportional to each participant's item subtotal. The debt distribution details show separate lines for item cost, tax, service charge, and tip when their values are non-zero.

## Acceptance example

For the supplied USD receipt: item subtotal `$191`, service charge `$36`, tax `$7`, and tip `$0` produce a total of `$234`. With one participant, that person owes `$234`; with multiple participants, the `$36` service charge is split equally.

## Error handling and tests

If OCR does not return a valid service-charge value, the app keeps the input at zero and continues with the item list. Unit tests cover receipt parsing, the USD storage conversion, the total, and each debt's service-charge share.
