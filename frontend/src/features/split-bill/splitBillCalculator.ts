export interface SplitBillCalculationItem {
  name: string;
  price: number;
  consumers: string[];
}

export interface SplitBillDebt {
  name: string;
  itemCost: number;
  tax: number;
  total: number;
}

export function calculateSplitBill({
  participants,
  items,
  taxPercent,
  tip,
}: {
  participants: string[];
  items: SplitBillCalculationItem[];
  taxPercent: number;
  tip: number;
}): { debts: SplitBillDebt[]; subtotal: number; totalTax: number; grandTotal: number } {
  const participantCount = participants.length;
  const itemShares = Object.fromEntries(participants.map((participant) => [participant, 0])) as Record<string, number>;
  const sharedSubtotal = items
    .filter((item) => item.consumers.length === 0)
    .reduce((sum, item) => sum + item.price, 0);
  const sharedPerPerson = participantCount > 0 ? sharedSubtotal / participantCount : 0;

  items.forEach((item) => {
    if (item.consumers.length === 0) return;
    const pricePerPerson = item.price / item.consumers.length;
    item.consumers.forEach((consumer) => {
      if (itemShares[consumer] !== undefined) itemShares[consumer] += pricePerPerson;
    });
  });

  const tipPerPerson = participantCount > 0 ? tip / participantCount : 0;
  const debts = participants.map((name) => {
    const itemCost = itemShares[name] + sharedPerPerson;
    const tax = itemCost * (taxPercent / 100);
    return { name, itemCost, tax, total: Math.round((itemCost + tax + tipPerPerson) * 100) / 100 };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const totalTax = subtotal * (taxPercent / 100);

  return { debts, subtotal, totalTax, grandTotal: subtotal + totalTax + tip };
}
