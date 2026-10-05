export interface SavingsGoal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  deadline: string;
  status: "IN_PROGRESS" | "COMPLETED";
}

export interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  category: string;
  walletId: number;
}

export interface Wallet {
  id: number;
  label: string;
  balance: number;
  accent: string;
}
