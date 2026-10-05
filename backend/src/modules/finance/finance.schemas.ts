import { z } from "zod";

function isCalendarDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/).refine(isCalendarDate);
export const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/).refine(isCalendarDate);
export const idSchema = z.string().uuid();

export const walletSchema = z.object({
  label: z.string().trim().min(1).max(80),
  balance: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  accent: z.string().trim().min(1).max(40),
}).strict();

export const transactionSchema = z.object({
  walletId: idSchema,
  name: z.string().trim().min(1).max(160),
  occurredOn: dateSchema,
  amount: z.number().finite().min(-1_000_000_000).max(1_000_000_000).refine((value) => value !== 0),
  category: z.string().trim().min(1).max(80),
}).strict();

export const budgetSchema = z.object({
  amount: z.number().finite().min(0).max(1_000_000_000),
}).strict();

export const savingsGoalSchema = z.object({
  title: z.string().trim().min(1).max(120),
  targetAmount: z.number().finite().positive().max(1_000_000_000),
  currentAmount: z.number().finite().min(0).max(1_000_000_000),
  icon: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(40),
  deadline: z.union([dateSchema, z.literal("")]),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
}).strict();

export type WalletInput = z.infer<typeof walletSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
