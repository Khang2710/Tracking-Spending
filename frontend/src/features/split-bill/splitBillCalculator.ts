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

const asAmount = (value: number | undefined) => Number.isFinite(value) && value! > 0 ? value! : 0;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

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
  const participantCount = participants.length;
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

    const priceShare = price / recipients.length;
    const discountShare = itemDiscount / recipients.length;
    recipients.forEach((recipient) => {
      itemCosts[recipient] += priceShare;
      itemDiscounts[recipient] += discountShare;
    });
  });

  const netItemCosts = Object.fromEntries(participants.map((participant) => [
    participant,
    Math.max(itemCosts[participant] - itemDiscounts[participant], 0),
  ])) as Record<string, number>;
  const netSubtotal = Object.values(netItemCosts).reduce((sum, value) => sum + value, 0);
  const proportionalShare = (amount: number, participant: string) => {
    const normalizedAmount = asAmount(amount);
    if (participantCount === 0) return 0;
    return netSubtotal > 0
      ? normalizedAmount * (netItemCosts[participant] / netSubtotal)
      : normalizedAmount / participantCount;
  };
  const equalShare = (amount: number) => participantCount > 0 ? asAmount(amount) / participantCount : 0;
  const normalizedTax = asAmount(tax);
  const normalizedServiceCharge = asAmount(serviceCharge);
  const normalizedTip = asAmount(tip);
  const normalizedBillDiscount = asAmount(billDiscount);
  const normalizedOtherFees = asAmount(otherFees);
  const debts = participants.map((name) => {
    const debt = {
      name,
      itemCost: roundMoney(itemCosts[name]),
      itemDiscount: roundMoney(itemDiscounts[name]),
      billDiscount: roundMoney(proportionalShare(normalizedBillDiscount, name)),
      tax: roundMoney(proportionalShare(normalizedTax, name)),
      serviceCharge: roundMoney(equalShare(normalizedServiceCharge)),
      tip: roundMoney(equalShare(normalizedTip)),
      otherFees: roundMoney(equalShare(normalizedOtherFees)),
      total: 0,
    };
    debt.total = roundMoney(
      debt.itemCost - debt.itemDiscount - debt.billDiscount + debt.tax + debt.serviceCharge + debt.tip + debt.otherFees,
    );
    return debt;
  });
  const grandTotal = roundMoney(
    subtotal - itemDiscountTotal - normalizedBillDiscount + normalizedTax + normalizedServiceCharge + normalizedTip + normalizedOtherFees,
  );
  const normalizedReceiptTotal = receiptTotal === null ? null : asAmount(receiptTotal);

  return {
    debts,
    subtotal: roundMoney(subtotal),
    itemDiscountTotal: roundMoney(itemDiscountTotal),
    totalTax: normalizedTax,
    billDiscount: normalizedBillDiscount,
    serviceCharge: normalizedServiceCharge,
    tip: normalizedTip,
    otherFees: normalizedOtherFees,
    grandTotal,
    receiptDifference: normalizedReceiptTotal === null ? null : roundMoney(grandTotal - normalizedReceiptTotal),
  };
}
