export type TransactionType =
  | "income"
  | "expense"
  | "savings"
  | "opening_balance"
  | "closing_balance";

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  periodId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  source: "manual" | "ai" | "setup" | "period";
  sourceMessageId?: string;
};

export type BudgetItem = {
  id: string;
  category: string;
  amount: number;
  spent: number;
};

export type Budget = {
  id: string;
  name: string;
  month: string;
  items: BudgetItem[];
  status: "draft" | "active" | "rejected";
  explanation: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  transactionId?: string;
  kind?: "text" | "result" | "error";
};

export type PrivacySettings = {
  income: boolean;
  budget: boolean;
  transactions: boolean;
  additional: boolean;
};

export type MemoryEntry = {
  id: string;
  type: "confirmed" | "context" | "recommendation" | "rejected" | "missing";
  text: string;
  createdAt: string;
};

export type FinancialPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance?: number;
  status: "active" | "closed";
};

export type PendingClarification = {
  intent: "income" | "expense" | "savings" | "balance_or_income" | "delete";
  category?: string;
  sourceText: string;
  transactionId?: string;
} | null;

export type WalletState = {
  version: number;
  hydrated: boolean;
  recoveryMessage: string;
  user: { id: string; name: string };
  transactions: Transaction[];
  budgets: Budget[];
  messages: ChatMessage[];
  privacy: PrivacySettings;
  memory: MemoryEntry[];
  periods: FinancialPeriod[];
  pending: PendingClarification;
};
