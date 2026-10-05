export interface SplitBillCalculationItem {
  name: string;
  price: number;
  discount?: number;
  consumers: string[];
}

export interface SplitBillDebt {
  name: string;
  itemCost: number;
  itemDiscount: number;
  billDiscount: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  otherFees: number;
  total: number;
}

export interface SplitBillCalculationResult {
  debts: SplitBillDebt[];
  subtotal: number;
  itemDiscountTotal: number;
  totalTax: number;
  billDiscount: number;
  serviceCharge: number;
  tip: number;
  otherFees: number;
  grandTotal: number;
  receiptDifference: number | null;
}

const asAmount = (value: number | undefined) => Number.isFinite(value) && value! > 0 ? Math.round(value!) : 0;

/**
 * All persisted amounts use VND base units. Allocate the unavoidable whole-VND
 * remainder deterministically so the displayed debts always add up to the bill.
 */
function allocateAmount(amount: number, participants: string[], weights: Record<string, number>): Record<string, number> {
  const normalizedAmount = asAmount(amount);
  const result = Object.fromEntries(participants.map((participant) => [participant, 0])) as Record<string, number>;
  if (normalizedAmount === 0 || participants.length === 0) return result;

  const totalWeight = participants.reduce((sum, participant) => sum + Math.max(weights[participant] ?? 0, 0), 0);
  const effectiveWeights = totalWeight > 0
    ? participants.map((participant) => Math.max(weights[participant] ?? 0, 0))
    : participants.map(() => 1);
  const effectiveTotal = effectiveWeights.reduce((sum, weight) => sum + weight, 0);
  const allocations = participants.map((participant, index) => {
    const exact = normalizedAmount * (effectiveWeights[index] / effectiveTotal);
    const whole = Math.floor(exact);
    return { participant, whole, remainder: exact - whole };
  });
  let remainder = normalizedAmount - allocations.reduce((sum, allocation) => sum + allocation.whole, 0);
  allocations
    .slice()
    .sort((left, right) => right.remainder - left.remainder || participants.indexOf(left.participant) - participants.indexOf(right.participant))
    .forEach((allocation) => {
      if (remainder > 0) {
        allocation.whole += 1;
        remainder -= 1;
      }
    });
  allocations.forEach((allocation) => { result[allocation.participant] = allocation.whole; });
  return result;
}

export function calculateSplitBill({
  participants,
  items,
  tax,
  serviceCharge,
  tip,
  billDiscount,
  otherFees,
  receiptTotal,
}: {
  participants: string[];
  items: SplitBillCalculationItem[];
  tax: number;
  serviceCharge: number;
  tip: number;
  billDiscount: number;
  otherFees: number;
  receiptTotal: number | null;
}): SplitBillCalculationResult {
  const itemCosts = Object.fromEntries(participants.map((participant) => [participant, 0])) as Record<string, number>;
  const itemDiscounts = Object.fromEntries(participants.map((participant) => [participant, 0])) as Record<string, number>;

  let subtotal = 0;
  let itemDiscountTotal = 0;

  items.forEach((item) => {
    const price = asAmount(item.price);
    const itemDiscount = Math.min(price, asAmount(item.discount));
    subtotal += price;
    itemDiscountTotal += itemDiscount;

    const consumers = item.consumers.filter((consumer) => itemCosts[consumer] !== undefined);
    const recipients = consumers.length > 0 ? consumers : participants;
    if (recipients.length === 0) return;

    const equalWeights = Object.fromEntries(recipients.map((recipient) => [recipient, 1]));
    const priceShares = allocateAmount(price, recipients, equalWeights);
    const discountShares = allocateAmount(itemDiscount, recipients, equalWeights);
    recipients.forEach((recipient) => {
      itemCosts[recipient] += priceShares[recipient];
      itemDiscounts[recipient] += discountShares[recipient];
    });
  });

  const netItemCosts = Object.fromEntries(participants.map((participant) => [
    participant,
    Math.max(itemCosts[participant] - itemDiscounts[participant], 0),
  ])) as Record<string, number>;
  const netSubtotal = Object.values(netItemCosts).reduce((sum, value) => sum + value, 0);
  const normalizedTax = asAmount(tax);
  const normalizedServiceCharge = asAmount(serviceCharge);
  const normalizedTip = asAmount(tip);
  const normalizedBillDiscount = Math.min(asAmount(billDiscount), netSubtotal);
  const normalizedOtherFees = asAmount(otherFees);
  const billDiscountShares = allocateAmount(normalizedBillDiscount, participants, netItemCosts);
  const taxShares = allocateAmount(normalizedTax, participants, netItemCosts);
  const equalWeights = Object.fromEntries(participants.map((participant) => [participant, 1]));
  const serviceChargeShares = allocateAmount(normalizedServiceCharge, participants, equalWeights);
  const tipShares = allocateAmount(normalizedTip, participants, equalWeights);
  const otherFeeShares = allocateAmount(normalizedOtherFees, participants, equalWeights);
  const debts = participants.map((name) => {
    const debt = {
      name,
      itemCost: itemCosts[name],
      itemDiscount: itemDiscounts[name],
      billDiscount: billDiscountShares[name],
      tax: taxShares[name],
      serviceCharge: serviceChargeShares[name],
      tip: tipShares[name],
      otherFees: otherFeeShares[name],
      total: 0,
    };
    debt.total = (
      debt.itemCost - debt.itemDiscount - debt.billDiscount + debt.tax + debt.serviceCharge + debt.tip + debt.otherFees
    );
    return debt;
  });
  const grandTotal = (
    subtotal - itemDiscountTotal - normalizedBillDiscount + normalizedTax + normalizedServiceCharge + normalizedTip + normalizedOtherFees
  );
  const normalizedReceiptTotal = receiptTotal === null ? null : asAmount(receiptTotal);

  return {
    debts,
    subtotal,
    itemDiscountTotal,
    totalTax: normalizedTax,
    billDiscount: normalizedBillDiscount,
    serviceCharge: normalizedServiceCharge,
    tip: normalizedTip,
    otherFees: normalizedOtherFees,
    grandTotal,
    receiptDifference: normalizedReceiptTotal === null ? null : grandTotal - normalizedReceiptTotal,
  };
}
