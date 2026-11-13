import type { Budget, Transaction } from "./types";

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export const shortRupiah = (value: number) => {
  if (value >= 1_000_000)
    return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`;
  return `Rp${value}`;
};

export function getSummary(transactions: Transaction[], budgets: Budget[]) {
  const opening = transactions
    .filter((item) => item.type === "opening_balance")
    .reduce((sum, item) => sum + item.amount, 0);
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const savings = transactions
    .filter((item) => item.type === "savings")
    .reduce((sum, item) => sum + item.amount, 0);
  const activeBudget = budgets.find((item) => item.status === "active");
  const totalBudget = activeBudget?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return {
    opening,
    income,
    expenses,
    savings,
    balance: opening + income - expenses - savings,
    totalBudget,
    remainingBudget: Math.max(0, totalBudget - expenses),
    transactionCount: transactions.length,
  };
}

export function getExpenseCategories(transactions: Transaction[]) {
  const totals = new Map<string, number>();
  transactions
    .filter((item) => item.type === "expense")
    .forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount));
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export const today = () => new Date().toISOString().slice(0, 10);
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
