import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type {
  Budget,
  ChatMessage,
  FinancialPeriod,
  MemoryEntry,
  PendingClarification,
  PrivacySettings,
  Transaction,
  WalletState,
} from "./types";
import { today, uid } from "./finance";

const KEYS = {
  user: "wallet_user",
  transactions: "wallet_transactions",
  budgets: "wallet_budgets",
  messages: "wallet_conversations",
  privacy: "wallet_privacy_settings",
  memory: "wallet_ai_memory",
  pending: "wallet_pending_context",
  periods: "wallet_financial_periods",
  version: "wallet_app_version",
} as const;

const initialPeriod = (): FinancialPeriod => {
  const now = new Date();
  return {
    id: `period_${now.getFullYear()}_${now.getMonth() + 1}`,
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    openingBalance: 0,
    status: "active",
  };
};

const baseState: WalletState = {
  version: 1,
  hydrated: false,
  recoveryMessage: "",
  user: { id: "user_tata", name: "Tata" },
  transactions: [],
  budgets: [],
  messages: [],
  privacy: { income: true, budget: true, transactions: true, additional: true },
  memory: [],
  periods: [initialPeriod()],
  pending: null,
};

function safeRead<T>(key: string, fallback: T, errors: string[]): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    errors.push(key);
    localStorage.setItem(`${key}_recovery_${Date.now()}`, value);
    return fallback;
  }
}

function safeArray<T>(key: string, errors: string[]): T[] {
  const value = safeRead<unknown>(key, [], errors);
  if (Array.isArray(value)) return value as T[];
  errors.push(key);
  const stored = localStorage.getItem(key);
  if (stored) localStorage.setItem(`${key}_recovery_${Date.now()}`, stored);
  return [];
}

function hydrate(): WalletState {
  if (typeof window === "undefined") return baseState;
  const errors: string[] = [];
  return {
    ...baseState,
    hydrated: true,
    user: safeRead(KEYS.user, baseState.user, errors),
    transactions: safeArray<Transaction>(KEYS.transactions, errors),
    budgets: safeArray<Budget>(KEYS.budgets, errors),
    messages: safeArray<ChatMessage>(KEYS.messages, errors),
    privacy: safeRead<PrivacySettings>(KEYS.privacy, baseState.privacy, errors),
    memory: safeArray<MemoryEntry>(KEYS.memory, errors),
    pending: safeRead<PendingClarification>(KEYS.pending, null, errors),
    periods: (() => {
      const periods = safeArray<FinancialPeriod>(KEYS.periods, errors);
      return periods.length ? periods : baseState.periods;
    })(),
    recoveryMessage: errors.length
      ? "Sebagian data tersimpan tidak dapat dipulihkan. Data lain tetap aman dan tidak dihapus."
      : "",
  };
}

type Action =
  | { type: "ADD_TRANSACTION"; item: Transaction }
  | { type: "UPDATE_TRANSACTION"; item: Transaction }
  | { type: "DELETE_TRANSACTION"; id: string }
  | { type: "ADD_MESSAGE"; item: ChatMessage }
  | { type: "CLEAR_MESSAGES" }
  | { type: "SET_PENDING"; pending: PendingClarification }
  | { type: "SAVE_BUDGET"; budget: Budget }
  | { type: "UPDATE_BUDGET"; budget: Budget }
  | { type: "SET_PRIVACY"; privacy: PrivacySettings }
  | { type: "ADD_MEMORY"; item: MemoryEntry }
  | { type: "UPDATE_MEMORY"; item: MemoryEntry }
  | { type: "DELETE_MEMORY"; id: string }
  | { type: "SET_PERIODS"; periods: FinancialPeriod[] }
  | { type: "RESET" };

function reducer(state: WalletState, action: Action): WalletState {
  switch (action.type) {
    case "ADD_TRANSACTION":
      return { ...state, transactions: [action.item, ...state.transactions] };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((item) =>
          item.id === action.item.id ? action.item : item,
        ),
      };
    case "DELETE_TRANSACTION":
      return { ...state, transactions: state.transactions.filter((item) => item.id !== action.id) };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.item] };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [], pending: null };
    case "SET_PENDING":
      return { ...state, pending: action.pending };
    case "SAVE_BUDGET":
      return { ...state, budgets: [action.budget, ...state.budgets] };
    case "UPDATE_BUDGET":
      return {
        ...state,
        budgets: state.budgets.map((item) => (item.id === action.budget.id ? action.budget : item)),
      };
    case "SET_PRIVACY":
      return { ...state, privacy: action.privacy };
    case "ADD_MEMORY":
      return { ...state, memory: [action.item, ...state.memory] };
    case "UPDATE_MEMORY":
      return {
        ...state,
        memory: state.memory.map((item) => (item.id === action.item.id ? action.item : item)),
      };
    case "DELETE_MEMORY":
      return { ...state, memory: state.memory.filter((item) => item.id !== action.id) };
    case "SET_PERIODS":
      return { ...state, periods: action.periods };
    case "RESET":
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
      return { ...baseState, hydrated: true, periods: [initialPeriod()] };
    default:
      return state;
  }
}

type Store = {
  state: WalletState;
  addTransaction: (
    item: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt" | "periodId">,
  ) => Transaction | null;
  updateTransaction: (item: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addMessage: (
    role: ChatMessage["role"],
    text: string,
    extra?: Partial<ChatMessage>,
  ) => ChatMessage;
  clearMessages: () => void;
  setPending: (pending: PendingClarification) => void;
  saveBudget: (budget: Budget) => void;
  updateBudget: (budget: Budget) => void;
  setPrivacy: (privacy: PrivacySettings) => void;
  addMemory: (type: MemoryEntry["type"], text: string) => void;
  updateMemory: (item: MemoryEntry) => void;
  deleteMemory: (id: string) => void;
  setPeriods: (periods: FinancialPeriod[]) => void;
  reset: () => void;
};

const WalletContext = createContext<Store | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);

  useEffect(() => {
    if (!state.hydrated) return;
    localStorage.setItem(KEYS.user, JSON.stringify(state.user));
    localStorage.setItem(KEYS.transactions, JSON.stringify(state.transactions));
    localStorage.setItem(KEYS.budgets, JSON.stringify(state.budgets));
    localStorage.setItem(KEYS.messages, JSON.stringify(state.messages));
    localStorage.setItem(KEYS.privacy, JSON.stringify(state.privacy));
    localStorage.setItem(KEYS.memory, JSON.stringify(state.memory));
    localStorage.setItem(KEYS.pending, JSON.stringify(state.pending));
    localStorage.setItem(KEYS.periods, JSON.stringify(state.periods));
    localStorage.setItem(KEYS.version, String(state.version));
  }, [state]);

  const value = useMemo<Store>(
    () => ({
      state,
      addTransaction: (input) => {
        if (!Number.isInteger(input.amount) || input.amount <= 0) return null;
        if (
          input.sourceMessageId &&
          state.transactions.some((item) => item.sourceMessageId === input.sourceMessageId)
        ) {
          return null;
        }
        const now = new Date().toISOString();
        const item: Transaction = {
          ...input,
          id: uid("tx"),
          userId: state.user.id,
          periodId:
            state.periods.find((period) => period.status === "active")?.id ?? "period_default",
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "ADD_TRANSACTION", item });
        return item;
      },
      updateTransaction: (item) =>
        dispatch({
          type: "UPDATE_TRANSACTION",
          item: { ...item, amount: Math.round(item.amount), updatedAt: new Date().toISOString() },
        }),
      deleteTransaction: (id) => dispatch({ type: "DELETE_TRANSACTION", id }),
      addMessage: (role, text, extra = {}) => {
        const item: ChatMessage = {
          id: uid("msg"),
          role,
          text,
          createdAt: new Date().toISOString(),
          ...extra,
        };
        dispatch({ type: "ADD_MESSAGE", item });
        return item;
      },
      clearMessages: () => dispatch({ type: "CLEAR_MESSAGES" }),
      setPending: (pending) => dispatch({ type: "SET_PENDING", pending }),
      saveBudget: (budget) => dispatch({ type: "SAVE_BUDGET", budget }),
      updateBudget: (budget) => dispatch({ type: "UPDATE_BUDGET", budget }),
      setPrivacy: (privacy) => dispatch({ type: "SET_PRIVACY", privacy }),
      addMemory: (type, text) =>
        dispatch({
          type: "ADD_MEMORY",
          item: { id: uid("memory"), type, text, createdAt: new Date().toISOString() },
        }),
      updateMemory: (item) => dispatch({ type: "UPDATE_MEMORY", item }),
      deleteMemory: (id) => dispatch({ type: "DELETE_MEMORY", id }),
      setPeriods: (periods) => dispatch({ type: "SET_PERIODS", periods }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [state],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}

export function makeTransactionInput(
  type: Transaction["type"],
  amount: number,
  category: string,
  source: Transaction["source"],
  note = "",
  sourceMessageId?: string,
) {
  return {
    type,
    amount: Math.round(amount),
    category,
    source,
    note,
    date: today(),
    sourceMessageId,
  };
}
