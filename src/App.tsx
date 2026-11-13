import { useEffect, useMemo, useRef, useState } from "react";
import { detectCategory, detectIntent, extractAmount, findRelevantTransaction } from "./ai";
import {
  currentMonth,
  getExpenseCategories,
  getSummary,
  rupiah,
  shortRupiah,
  today,
  uid,
} from "./finance";
import { Icon } from "./icons";
import { makeTransactionInput, useWallet, WalletProvider } from "./store";
import type { Budget, BudgetItem, Transaction, TransactionType } from "./types";

type Page = "home" | "setup" | "planner" | "assistant" | "transactions" | "profile";

const categoryColors = ["#08C486", "#087CFF", "#FF851B", "#25B8F0", "#7AD83B", "#FF3030"];

function Header({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="header-row">
        {onBack && (
          <button className="icon-button" onClick={onBack} aria-label="Kembali">
            <Icon name="back" />
          </button>
        )}
        <div className="header-copy">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

function BottomNav({
  page,
  navigate,
  openAdd,
}: {
  page: Page;
  navigate: (page: Page) => void;
  openAdd: () => void;
}) {
  const items = [
    { label: "Dashboard", icon: "home", page: "home" as Page },
    { label: "Planning", icon: "plan", page: "setup" as Page },
    { label: "Add", icon: "plus", page: null },
    { label: "Statistics", icon: "stats", page: "transactions" as Page },
    { label: "More", icon: "more", page: "profile" as Page },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {items.map((item) =>
        item.page ? (
          <button
            key={item.label}
            className={
              page === item.page || (item.page === "setup" && page === "planner") ? "active" : ""
            }
            onClick={() => navigate(item.page!)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ) : (
          <button
            key={item.label}
            className="add-nav"
            onClick={openAdd}
            aria-label="Tambah transaksi"
          >
            <span className="add-circle">
              <Icon name="plus" size={25} />
            </span>
            <span>{item.label}</span>
          </button>
        ),
      )}
    </nav>
  );
}

function Donut({
  categories,
  total,
}: {
  categories: { category: string; amount: number }[];
  total: number;
}) {
  if (!total) {
    return (
      <div className="donut empty">
        <div>
          <strong>Rp0</strong>
          <span>Belum ada data</span>
        </div>
      </div>
    );
  }
  let cumulative = 0;
  const gradient = categories
    .map((item, index) => {
      const start = (cumulative / total) * 100;
      cumulative += item.amount;
      const end = (cumulative / total) * 100;
      return `${categoryColors[index % categoryColors.length]} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
      <div>
        <strong>{shortRupiah(total)}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function HomePage({ navigate, openAdd }: { navigate: (page: Page) => void; openAdd: () => void }) {
  const { state } = useWallet();
  const summary = getSummary(state.transactions, state.budgets);
  const categories = getExpenseCategories(state.transactions);
  const budgetPercentage = summary.totalBudget
    ? Math.min(100, (summary.expenses / summary.totalBudget) * 100)
    : 0;
  const hasActivity = state.transactions.length > 0;

  return (
    <main className="page home-page">
      <section className="green-hero">
        <div className="home-top">
          <div>
            <span className="eyebrow-light">Selamat datang kembali</span>
            <h1>Hai, {state.user.name}!</h1>
          </div>
          <button className="avatar" onClick={() => navigate("profile")}>
            T
          </button>
        </div>
        <div className="balance-label">
          <span>Saldo tersedia</span>
          <Icon name="eye" size={17} />
        </div>
        <div className="hero-balance">{rupiah(summary.balance)}</div>
        <div className="account-scroller">
          <article className="account-card primary">
            <div>
              <Icon name="wallet" size={18} />
              <span>Uang tersedia</span>
            </div>
            <strong>{rupiah(summary.balance)}</strong>
            <small>{summary.transactionCount} transaksi</small>
          </article>
          <article className="account-card savings-card">
            <div>
              <span className="account-dot" />
              <span>Tabungan</span>
            </div>
            <strong>{rupiah(summary.savings)}</strong>
            <small>Dana yang dialokasikan</small>
          </article>
        </div>
      </section>

      <div className="content-stack home-content">
        {state.recoveryMessage && <div className="recovery-banner">{state.recoveryMessage}</div>}
        <section className="summary-grid">
          <article className="mini-summary">
            <span className="summary-icon income">
              <Icon name="arrowDown" size={17} />
            </span>
            <div>
              <small>Pemasukan</small>
              <strong>{rupiah(summary.income)}</strong>
            </div>
          </article>
          <article className="mini-summary">
            <span className="summary-icon expense">
              <Icon name="arrowUp" size={17} />
            </span>
            <div>
              <small>Pengeluaran</small>
              <strong>{rupiah(summary.expenses)}</strong>
            </div>
          </article>
        </section>

        {!hasActivity && (
          <section className="empty-card">
            <div className="empty-icon">
              <Icon name="wallet" size={28} />
            </div>
            <h2>Belum ada aktivitas keuangan.</h2>
            <p>Yuk, mulai catat pemasukan dan pengeluaranmu.</p>
            <button className="primary-button" onClick={() => navigate("setup")}>
              Mulai Atur Keuangan
            </button>
          </section>
        )}

        <section className="ai-callout">
          <div className="spark-box">
            <Icon name="spark" size={23} />
          </div>
          <div>
            <span className="section-kicker">WALLET AI</span>
            <h2>Ngobrol soal keuanganmu</h2>
            <p>Catat transaksi atau tanyakan kondisi uangmu dengan bahasa sehari-hari.</p>
          </div>
          <button onClick={() => navigate("assistant")}>
            Tanya AI <Icon name="chevron" size={17} />
          </button>
        </section>

        <section className="white-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">BULAN INI</span>
              <h2>Anggaran bulanan</h2>
            </div>
            <button className="text-button" onClick={() => navigate("planner")}>
              Atur
            </button>
          </div>
          {summary.totalBudget ? (
            <>
              <div className="budget-values">
                <strong>{rupiah(summary.expenses)}</strong>
                <span>dari {rupiah(summary.totalBudget)}</span>
              </div>
              <div className="progress">
                <span style={{ width: `${budgetPercentage}%` }} />
              </div>
              <div className="budget-foot">
                <span>{Math.round(budgetPercentage)}% terpakai</span>
                <span>Sisa {rupiah(summary.remainingBudget)}</span>
              </div>
            </>
          ) : (
            <div className="inline-empty">
              <p>Belum ada anggaran aktif.</p>
              <button onClick={() => navigate("planner")}>Buat anggaran</button>
            </div>
          )}
        </section>

        <section className="white-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">STATISTIK</span>
              <h2>Distribusi pengeluaran</h2>
            </div>
            <button className="text-button" onClick={() => navigate("transactions")}>
              Detail
            </button>
          </div>
          <div className="distribution">
            <Donut categories={categories} total={summary.expenses} />
            <div className="legend">
              {categories.length ? (
                categories.slice(0, 4).map((item, index) => (
                  <div key={item.category}>
                    <span style={{ background: categoryColors[index] }} />
                    <p>
                      {item.category}
                      <strong>{Math.round((item.amount / summary.expenses) * 100)}%</strong>
                    </p>
                  </div>
                ))
              ) : (
                <p className="muted">Catat pengeluaran untuk melihat distribusi kategori.</p>
              )}
            </div>
          </div>
        </section>

        {hasActivity && summary.expenses > 0 && (
          <section className="insight-card">
            <Icon name="spark" size={20} />
            <div>
              <strong>Insight untukmu</strong>
              <p>
                Pengeluaranmu saat ini {rupiah(summary.expenses)}. Semua analisis berasal dari
                transaksi yang kamu catat.
              </p>
            </div>
          </section>
        )}
        <button className="quick-add" onClick={openAdd}>
          <Icon name="plus" size={18} /> Catat transaksi
        </button>
      </div>
    </main>
  );
}

function SetupPage({ navigate }: { navigate: (page: Page) => void }) {
  const { state, addTransaction, deleteTransaction } = useWallet();
  const [consent, setConsent] = useState(false);
  const [values, setValues] = useState({
    opening: "",
    income: "",
    expenses: "",
    budget: "",
    goal: "",
  });
  const [saved, setSaved] = useState("");
  const summary = getSummary(state.transactions, state.budgets);

  const saveSetup = () => {
    const entries: { key: keyof typeof values; type: TransactionType; category: string }[] = [
      { key: "opening", type: "opening_balance", category: "Saldo Awal" },
      { key: "income", type: "income", category: "Penghasilan" },
      { key: "expenses", type: "expense", category: "Pengeluaran Lainnya" },
    ];
    let count = 0;
    entries.forEach(({ key, type, category }) => {
      const amount = Number(values[key].replace(/\D/g, ""));
      if (amount > 0) {
        addTransaction(
          makeTransactionInput(type, amount, category, "setup", "Dicatat dari pengaturan awal"),
        );
        count += 1;
      }
    });
    if (values.goal.trim()) localStorage.setItem("wallet_financial_goal", values.goal.trim());
    if (Number(values.budget.replace(/\D/g, "")) > 0)
      localStorage.setItem("wallet_budget_preference", values.budget.replace(/\D/g, ""));
    setSaved(
      count ? `${count} informasi keuangan berhasil disimpan.` : "Preferensi berhasil disimpan.",
    );
    setValues({ opening: "", income: "", expenses: "", budget: "", goal: "" });
  };

  return (
    <main className="page">
      <Header title="Atur Keuangan" subtitle="Mulai dari informasi yang ingin kamu bagikan." />
      <div className="content-stack">
        <div className="planning-tabs">
          <button className="active">Pengaturan</button>
          <button onClick={() => navigate("planner")}>AI Planner</button>
        </div>
        <section className="consent-card">
          <div className="shield-circle">
            <Icon name="shield" />
          </div>
          <div>
            <h2>Data keuanganmu bersifat pribadi</h2>
            <p>Semua data hanya disimpan di browser ini. Kamu bebas melewati pertanyaan apa pun.</p>
          </div>
          {!consent ? (
            <button className="primary-button" onClick={() => setConsent(true)}>
              Saya Mengerti, Lanjutkan
            </button>
          ) : (
            <span className="consent-ok">Izin diberikan untuk sesi ini</span>
          )}
        </section>

        {consent && (
          <section className="white-card setup-form">
            <div className="section-heading">
              <div>
                <span className="section-kicker">OPSIONAL</span>
                <h2>Ceritakan kondisi awalmu</h2>
              </div>
            </div>
            <MoneyField
              label="Saldo awal"
              value={values.opening}
              onChange={(opening) => setValues({ ...values, opening })}
              placeholder="0"
            />
            <MoneyField
              label="Pemasukan bulan ini"
              value={values.income}
              onChange={(income) => setValues({ ...values, income })}
              placeholder="0"
            />
            <MoneyField
              label="Pengeluaran yang sudah ada"
              value={values.expenses}
              onChange={(expenses) => setValues({ ...values, expenses })}
              placeholder="0"
            />
            <MoneyField
              label="Target anggaran bulanan"
              value={values.budget}
              onChange={(budget) => setValues({ ...values, budget })}
              placeholder="0"
            />
            <label className="field-label">
              Tujuan keuangan
              <input
                value={values.goal}
                onChange={(event) => setValues({ ...values, goal: event.target.value })}
                placeholder="Contoh: beli laptop tahun depan"
              />
            </label>
            <button className="primary-button full" onClick={saveSetup}>
              Simpan Informasi
            </button>
            {saved && <p className="success-text">{saved}</p>}
          </section>
        )}

        <section className="white-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">DATA TERKONFIRMASI</span>
              <h2>Ringkasan saat ini</h2>
            </div>
          </div>
          <div className="data-list">
            <div>
              <span>Saldo tersedia</span>
              <strong>{rupiah(summary.balance)}</strong>
            </div>
            <div>
              <span>Pemasukan</span>
              <strong>{rupiah(summary.income)}</strong>
            </div>
            <div>
              <span>Pengeluaran</span>
              <strong>{rupiah(summary.expenses)}</strong>
            </div>
          </div>
          {state.transactions
            .filter((item) => item.source === "setup")
            .map((item) => (
              <div className="setup-entry" key={item.id}>
                <span>
                  {item.category} · {rupiah(item.amount)}
                </span>
                <button onClick={() => deleteTransaction(item.id)}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
        </section>
      </div>
    </main>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="field-label">
      {label}
      <div className="money-input">
        <span>Rp</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}

const suggestedCategories = [
  { category: "Kebutuhan Pokok", ratio: 0.45 },
  { category: "Transportasi", ratio: 0.15 },
  { category: "Tabungan", ratio: 0.2 },
  { category: "Hiburan", ratio: 0.1 },
  { category: "Dana Fleksibel", ratio: 0.1 },
];

function PlannerPage({ navigate }: { navigate: (page: Page) => void }) {
  const { state, saveBudget, updateBudget, addMemory } = useWallet();
  const summary = getSummary(state.transactions, state.budgets);
  const available = Math.max(0, summary.balance);
  const currentDraft = state.budgets.find((item) => item.status === "draft");
  const [draft, setDraft] = useState<BudgetItem[]>(currentDraft?.items ?? []);
  const [showWhy, setShowWhy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const total = draft.reduce((sum, item) => sum + item.amount, 0);

  const generate = () => {
    if (!available) return;
    const items = suggestedCategories.map((item) => ({
      id: uid("budget_item"),
      category: item.category,
      amount: Math.floor((available * item.ratio) / 1000) * 1000,
      spent: 0,
    }));
    const budget: Budget = {
      id: currentDraft?.id ?? uid("budget"),
      name: "Rekomendasi Bulanan",
      month: currentMonth(),
      items,
      status: "draft",
      explanation: `Saran dibagi dari dana tersedia ${rupiah(available)} dengan fokus kebutuhan pokok dan tabungan.`,
      createdAt: new Date().toISOString(),
    };
    currentDraft ? updateBudget(budget) : saveBudget(budget);
    setDraft(items);
    addMemory(
      "recommendation",
      `Draf anggaran ${rupiah(items.reduce((sum, item) => sum + item.amount, 0))}`,
    );
  };

  const persistDraft = (items: BudgetItem[], status: Budget["status"] = "draft") => {
    const existing = state.budgets.find((item) => item.status === "draft") ?? currentDraft;
    const budget: Budget = {
      id: existing?.id ?? uid("budget"),
      name: "Rekomendasi Bulanan",
      month: currentMonth(),
      items,
      status,
      explanation: `Saran didasarkan pada dana tersedia ${rupiah(available)} dan dapat kamu ubah kapan saja.`,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    existing ? updateBudget(budget) : saveBudget(budget);
  };

  const reject = () => {
    persistDraft(draft, "rejected");
    addMemory("rejected", `Rekomendasi anggaran ${currentMonth()} ditolak`);
    setDraft([]);
  };

  const activate = () => {
    if (total > available) return;
    state.budgets
      .filter((item) => item.status === "active")
      .forEach((item) => updateBudget({ ...item, status: "rejected" }));
    persistDraft(draft, "active");
    setConfirm(false);
  };

  return (
    <main className="page">
      <Header
        title="AI Budget Planner"
        subtitle="Saran fleksibel berdasarkan data terkonfirmasi."
      />
      <div className="content-stack">
        <div className="planning-tabs">
          <button onClick={() => navigate("setup")}>Pengaturan</button>
          <button className="active">AI Planner</button>
        </div>
        <section className="planner-overview">
          <span>Dana tersedia</span>
          <strong>{rupiah(available)}</strong>
          <div>
            <span>Pemasukan {rupiah(summary.income)}</span>
            <span>Pengeluaran {rupiah(summary.expenses)}</span>
          </div>
        </section>
        {!available && (
          <section className="empty-card compact">
            <div className="empty-icon">
              <Icon name="plan" />
            </div>
            <h2>Belum ada dana terkonfirmasi</h2>
            <p>Tambahkan saldo awal atau pemasukan agar saran tidak memakai angka ilustrasi.</p>
            <button className="primary-button" onClick={() => navigate("setup")}>
              Tambah Data
            </button>
          </section>
        )}
        {available > 0 && !draft.length && (
          <section className="white-card recommendation-intro">
            <div className="spark-box">
              <Icon name="spark" />
            </div>
            <h2>Siap membuat saran anggaran?</h2>
            <p>
              WALLET akan membagi dana tersedia menjadi beberapa kategori. Ini hanya draf dan tidak
              mengubah saldo.
            </p>
            <button className="primary-button full" onClick={generate}>
              Buat Rekomendasi
            </button>
          </section>
        )}
        {draft.length > 0 && (
          <>
            <section className="white-card">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">REKOMENDASI · DRAF</span>
                  <h2>Alokasi yang disarankan</h2>
                </div>
              </div>
              <div className="allocation-list">
                {draft.map((item, index) => (
                  <div className="allocation-row" key={item.id}>
                    <span className="category-dot" style={{ background: categoryColors[index] }} />
                    <label>
                      <span>{item.category}</span>
                      <div className="inline-money">
                        <span>Rp</span>
                        <input
                          aria-label={`Anggaran ${item.category}`}
                          inputMode="numeric"
                          disabled={!editing}
                          value={item.amount}
                          onChange={(event) => {
                            const next = draft.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    amount: Number(event.target.value.replace(/\D/g, "")),
                                  }
                                : entry,
                            );
                            setDraft(next);
                            persistDraft(next);
                          }}
                        />
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="allocation-summary">
                <div>
                  <span>Total dialokasikan</span>
                  <strong>{rupiah(total)}</strong>
                </div>
                <div>
                  <span>Sisa dana</span>
                  <strong className={total > available ? "danger" : ""}>
                    {rupiah(available - total)}
                  </strong>
                </div>
              </div>
              {total > available && (
                <div className="warning">
                  Alokasi melebihi dana tersedia sebesar {rupiah(total - available)}. Kurangi
                  nominal sebelum mengaktifkan.
                </div>
              )}
              <button className="why-button" onClick={() => setShowWhy(!showWhy)}>
                Mengapa AI menyarankan ini? <Icon name="chevron" size={16} />
              </button>
              {showWhy && (
                <p className="why-copy">
                  45% untuk kebutuhan pokok, 20% untuk tabungan, dan sisanya untuk transportasi,
                  hiburan, serta dana fleksibel. Dasarnya hanya saldo dan transaksi yang kamu
                  konfirmasi.
                </p>
              )}
            </section>
            <div className="recommendation-actions">
              <button className="secondary-button" onClick={reject}>
                Tolak
              </button>
              <button className="secondary-button" onClick={() => setEditing(!editing)}>
                {editing ? "Selesai Edit" : "Edit"}
              </button>
              <button
                className="primary-button"
                onClick={() => setConfirm(true)}
                disabled={total > available}
              >
                Gunakan
              </button>
            </div>
          </>
        )}
      </div>
      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-icon">
              <Icon name="plan" />
            </div>
            <h2>Sudah sesuai kebutuhanmu, Tata?</h2>
            <p>
              Anggaran aktif tidak mengubah saldo. Hanya transaksi nyata yang memengaruhi
              perhitungan.
            </p>
            <button className="secondary-button full" onClick={() => setConfirm(false)}>
              Ubah Lagi
            </button>
            <button className="primary-button full" onClick={activate}>
              Aktifkan Anggaran
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function AssistantPage({
  navigate,
  openAdd,
}: {
  navigate: (page: Page) => void;
  openAdd: () => void;
}) {
  const store = useWallet();
  const {
    state,
    addMessage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setPending,
    addMemory,
    updateBudget,
  } = store;
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const summary = getSummary(state.transactions, state.budgets);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages, thinking]);

  const reply = (text: string, extra?: Parameters<typeof addMessage>[2]) =>
    addMessage("assistant", text, extra);

  const processMessage = (text: string, messageId: string) => {
    const lower = text.toLowerCase();
    const amount = extractAmount(text);
    const category = state.pending?.category ?? detectCategory(text);
    let intent = detectIntent(text);

    if (state.pending && amount) {
      intent =
        state.pending.intent === "balance_or_income"
          ? "clarification"
          : (`create_${state.pending.intent}` as ReturnType<typeof detectIntent>);
      if (state.pending.intent === "balance_or_income") {
        setPending(null);
        reply(
          "Maksudmu saldo yang sudah ada atau pemasukan baru? Ketik “saldo awal” atau “pemasukan baru” agar aku tidak salah mencatat.",
        );
        return;
      }
    }

    if (intent === "unknown" && !amount && /(beli|bayar|pengeluaran|habis)/.test(lower)) {
      setPending({ intent: "expense", category: detectCategory(text), sourceText: text });
      reply("Nominalnya berapa, Tata?");
      return;
    }
    if (intent === "unknown" && !amount && /(dapat|terima|pemasukan|gajian)/.test(lower)) {
      setPending({ intent: "income", category: detectCategory(text), sourceText: text });
      reply("Nominalnya berapa, Tata?");
      return;
    }

    const forbidden = (key: keyof typeof state.privacy) => !state.privacy[key];
    if (
      ["ask_balance", "ask_income", "ask_expense"].includes(intent) &&
      forbidden("transactions")
    ) {
      reply(
        "Aku tidak bisa memakai data transaksi karena aksesnya dinonaktifkan di Privasi. Data aslimu tetap tersimpan.",
      );
      return;
    }
    if (intent === "ask_income" && forbidden("income")) {
      reply(
        "Akses AI ke informasi pemasukan sedang dinonaktifkan. Kamu bisa mengubahnya di Profil & Privasi.",
      );
      return;
    }
    if (intent === "ask_budget" && forbidden("budget")) {
      reply("Akses AI ke anggaran sedang dinonaktifkan. Data anggaranmu tidak dihapus.");
      return;
    }

    if (/aku punya uang|uangku sekarang/.test(lower) && amount) {
      setPending({ intent: "balance_or_income", sourceText: text });
      reply("Apakah itu saldo uangmu saat ini, atau pemasukan baru yang baru kamu terima?");
      return;
    }
    if (/teman(ku)?.*traktir/.test(lower)) {
      reply(
        "Senang dengarnya. Karena kamu tidak mengeluarkan uang, aku tidak mencatat transaksi apa pun.",
      );
      return;
    }

    switch (intent) {
      case "greeting":
        reply(
          `Hai, ${state.user.name}! Ceritakan pemasukan atau pengeluaranmu, atau tanyakan kondisi keuanganmu.`,
        );
        break;
      case "create_income":
      case "create_expense":
      case "create_savings": {
        const type = intent.replace("create_", "") as "income" | "expense" | "savings";
        const resolvedAmount = amount;
        if (!resolvedAmount) {
          setPending({ intent: type, category, sourceText: text });
          reply("Nominalnya berapa, Tata?");
          break;
        }
        const duplicate = state.transactions.find(
          (item) =>
            item.source === "ai" &&
            item.type === type &&
            item.amount === resolvedAmount &&
            item.category === category &&
            Date.now() - new Date(item.createdAt).getTime() < 120_000,
        );
        if (duplicate) {
          reply(
            `Transaksi serupa ${rupiah(resolvedAmount)} untuk ${category} baru saja dicatat, jadi tidak aku duplikasi.`,
          );
          break;
        }
        const transaction = addTransaction(
          makeTransactionInput(type, resolvedAmount, category, "ai", text, messageId),
        );
        setPending(null);
        if (transaction) {
          const label =
            type === "income" ? "Pemasukan" : type === "expense" ? "Pengeluaran" : "Tabungan";
          reply(`${label} ${rupiah(resolvedAmount)} untuk ${category} sudah dicatat.`, {
            kind: "result",
            transactionId: transaction.id,
          });
          addMemory("confirmed", `${label} ${rupiah(resolvedAmount)} · ${category}`);
        } else {
          reply("Transaksi belum tersimpan karena datanya tidak valid atau sudah pernah dicatat.", {
            kind: "error",
          });
        }
        break;
      }
      case "ask_balance":
        reply(
          `Saldo tersedia kamu saat ini ${rupiah(summary.balance)}. Angka ini dihitung dari data yang sudah kamu konfirmasi.`,
        );
        break;
      case "ask_income":
        reply(`Total pemasukan yang tercatat adalah ${rupiah(summary.income)}.`);
        break;
      case "ask_expense": {
        const recent = state.messages
          .slice(-6)
          .filter((item) => item.transactionId)
          .map((item) => state.transactions.find((tx) => tx.id === item.transactionId))
          .filter(Boolean) as Transaction[];
        const recentTotal = recent
          .filter((item) => item.type === "expense")
          .reduce((sum, item) => sum + item.amount, 0);
        if (/totalnya/.test(lower) && recentTotal)
          reply(`Total pengeluaran yang baru kita bicarakan adalah ${rupiah(recentTotal)}.`);
        else reply(`Total pengeluaran yang tercatat adalah ${rupiah(summary.expenses)}.`);
        break;
      }
      case "ask_budget":
        reply(
          summary.totalBudget
            ? `Anggaran aktifmu ${rupiah(summary.totalBudget)}, dengan sisa ${rupiah(summary.remainingBudget)}.`
            : "Belum ada anggaran aktif. Aku bisa membantumu membuat rekomendasi di AI Budget Planner.",
        );
        break;
      case "hypothetical_purchase":
        if (!amount) {
          reply("Berapa perkiraan harga pembeliannya? Aku perlu nominal untuk membuat simulasi.");
        } else {
          const after = summary.balance - amount;
          reply(
            after >= 0
              ? `Pembelian ${rupiah(amount)} bisa dilakukan dari saldo saat ini. Sisanya menjadi ${rupiah(after)}. Ini hanya simulasi, tidak ada transaksi yang dicatat.`
              : `Saldo saat ini belum mencukupi untuk pembelian ${rupiah(amount)}. Kekurangannya ${rupiah(Math.abs(after))}. Ini hanya simulasi.`,
          );
        }
        break;
      case "future_plan":
        addMemory("context", `Rencana: ${text}`);
        reply(
          `Aku mengenali ini sebagai rencana masa depan${amount ? ` senilai ${rupiah(amount)}` : ""}, jadi tidak mencatatnya sebagai pengeluaran. Rencana ini kusimpan di konteks percakapanmu.`,
        );
        break;
      case "update_transaction": {
        const candidates = findRelevantTransaction(state, text, "expense");
        const target = candidates[0] ?? state.transactions.find((item) => item.source === "ai");
        if (!amount) {
          reply("Berapa nominal yang benar, Tata?");
        } else if (!target) {
          reply(
            "Aku belum menemukan transaksi yang cocok untuk diubah. Pilih transaksi dari halaman Transactions agar lebih pasti.",
          );
        } else {
          updateTransaction({ ...target, amount, note: `${target.note} · dikoreksi via AI` });
          reply(
            `Transaksi ${target.category} berhasil diperbarui dari ${rupiah(target.amount)} menjadi ${rupiah(amount)}.`,
            { kind: "result", transactionId: target.id },
          );
        }
        break;
      }
      case "delete_transaction": {
        const candidates = findRelevantTransaction(state, text, "expense");
        if (candidates.length > 1) {
          setPending({ intent: "delete", category, sourceText: text });
          reply(
            `Ada ${candidates.length} transaksi ${category}. Buka Transactions dan pilih yang ingin dihapus agar aku tidak menghapus transaksi yang salah.`,
          );
        } else if (candidates[0]) {
          deleteTransaction(candidates[0].id);
          reply(
            `Transaksi ${candidates[0].category} sebesar ${rupiah(candidates[0].amount)} sudah dibatalkan.`,
          );
        } else {
          reply("Aku belum menemukan transaksi yang cocok. Tidak ada data yang dihapus.");
        }
        break;
      }
      case "budget_recommendation":
        if (
          state.memory.some(
            (item) => item.type === "rejected" && item.text.includes(currentMonth()),
          )
        ) {
          reply(
            "Kamu sebelumnya menolak rekomendasi bulan ini, jadi aku tidak akan mendorong saran yang sama. Kamu tetap bisa membuka Planner jika ingin membuat draf baru.",
          );
        } else {
          reply(
            "Aku bisa membuat draf berdasarkan dana yang sudah terkonfirmasi. Draf tidak akan mengubah saldo atau membuat transaksi.",
          );
        }
        break;
      case "reject_recommendation": {
        const budget = state.budgets.find((item) => item.status === "draft");
        if (budget) {
          updateBudget({ ...budget, status: "rejected" });
          addMemory("rejected", `Rekomendasi anggaran ${currentMonth()} ditolak`);
          reply(
            "Baik, rekomendasi itu ditolak. Saldo dan transaksi aktualmu tidak berubah, dan aku tidak akan mendorong saran yang sama lagi.",
          );
        } else reply("Tidak ada rekomendasi aktif untuk ditolak.");
        break;
      }
      case "edit_recommendation": {
        const budget = state.budgets.find((item) => item.status === "draft");
        if (!budget) {
          reply(
            "Belum ada draf rekomendasi yang bisa diubah. Buat draf dulu di AI Budget Planner.",
          );
        } else {
          const hiburan = budget.items.find((item) => item.category === "Hiburan");
          if (hiburan && /kurangi.*hiburan/.test(lower)) {
            const nextAmount = amount ?? Math.floor(hiburan.amount * 0.75);
            updateBudget({
              ...budget,
              items: budget.items.map((item) =>
                item.id === hiburan.id ? { ...item, amount: nextAmount } : item,
              ),
            });
            reply(
              `Draf anggaran Hiburan diubah menjadi ${rupiah(nextAmount)}. Ini belum memengaruhi transaksi atau saldo.`,
            );
          } else
            reply(
              "Sebutkan kategori dan nominal baru yang kamu inginkan, misalnya “ubah anggaran hiburan jadi Rp150.000”.",
            );
        }
        break;
      }
      case "financial_advice":
        reply(
          summary.income || summary.expenses
            ? `Dari data terkonfirmasi, pemasukanmu ${rupiah(summary.income)} dan pengeluaranmu ${rupiah(summary.expenses)}. Prioritaskan kebutuhan utama dan pilih target tabungan yang tetap nyaman.`
            : "Aku belum punya cukup data nyata untuk memberi saran khusus. Kamu bisa mulai dengan mencatat pemasukan dan pengeluaran tanpa harus mengisi semuanya sekaligus.",
        );
        break;
      default:
        reply("Aku belum bisa memahami informasi ini, Tata. Bisa jelaskan sedikit lagi?", {
          kind: "error",
        });
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMessage = addMessage("user", text);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      try {
        processMessage(text, userMessage.id);
      } catch {
        reply(
          "Aku sedang mengalami kendala memahami pesanmu. Informasi yang sudah tersimpan tetap aman.",
          { kind: "error" },
        );
        setInput(text);
      } finally {
        setThinking(false);
      }
    }, 450);
  };

  const undo = (id: string) => {
    const item = state.transactions.find((tx) => tx.id === id);
    if (item) {
      deleteTransaction(id);
      reply(`Transaksi ${item.category} sebesar ${rupiah(item.amount)} sudah di-undo.`);
    }
  };

  return (
    <main className="assistant-page">
      <Header
        title="Asisten Keuangan"
        subtitle="Teman ngobrol dan asisten keuangan pribadimu."
        onBack={() => navigate("home")}
        action={
          <button
            className="small-text-button"
            onClick={() => {
              if (confirm("Mulai percakapan baru? Transaksi tidak akan dihapus."))
                store.clearMessages();
            }}
          >
            Chat baru
          </button>
        }
      />
      <div className="chat-scroll" ref={scrollRef}>
        {!state.messages.length && (
          <div className="assistant-welcome">
            <div className="ai-orb">
              <Icon name="spark" size={25} />
            </div>
            <h2>Hai, Tata! Ada yang mau kamu ceritakan tentang keuanganmu hari ini?</h2>
            <p>Aku memproses pesan secara lokal dan hanya mencatat kejadian yang jelas.</p>
          </div>
        )}
        <div className="suggestion-chips">
          {["Saldo aku berapa?", "Tadi aku beli makan 25 ribu", "Bantu atur budget"].map((chip) => (
            <button key={chip} onClick={() => setInput(chip)}>
              {chip}
            </button>
          ))}
        </div>
        <div className="messages">
          {state.messages.map((message) => (
            <div key={message.id} className={`message-wrap ${message.role}`}>
              <div className={`bubble ${message.kind === "error" ? "error" : ""}`}>
                {message.text}
              </div>
              {message.kind === "result" &&
                message.transactionId &&
                state.transactions.some((item) => item.id === message.transactionId) && (
                  <div className="transaction-result">
                    <span>Transaksi tersimpan</span>
                    <div>
                      <button onClick={() => undo(message.transactionId!)}>Undo</button>
                      <button onClick={() => navigate("transactions")}>Edit</button>
                    </div>
                  </div>
                )}
              {message.kind === "error" && (
                <div className="error-actions">
                  <button
                    onClick={() =>
                      setInput(
                        state.messages.filter((item) => item.role === "user").at(-1)?.text ?? "",
                      )
                    }
                  >
                    Coba Lagi
                  </button>
                  <button onClick={openAdd}>Input Manual</button>
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="thinking">
              <span />
              <span />
              <span />
              <small>Sebentar ya, aku baca...</small>
            </div>
          )}
        </div>
      </div>
      {voice && (
        <div className="voice-toast">
          <span className="voice-pulse">
            <Icon name="mic" />
          </span>
          <div>
            <strong>Mendengarkan...</strong>
            <small>Simulasi input suara</small>
          </div>
          <button
            onClick={() => {
              setVoice(false);
              setInput("Tadi aku beli makan 25 ribu");
            }}
          >
            Selesai
          </button>
        </div>
      )}
      <div className="chat-composer">
        <button
          className={voice ? "active" : ""}
          onClick={() => setVoice(!voice)}
          aria-label="Input suara"
        >
          <Icon name="mic" />
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Ceritakan tentang keuanganmu..."
        />
        <button className="send-button" onClick={send} disabled={!input.trim() || thinking}>
          <Icon name="send" size={19} />
        </button>
      </div>
    </main>
  );
}

function TransactionsPage({ openAdd }: { openAdd: (transaction?: Transaction) => void }) {
  const { state, deleteTransaction } = useWallet();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [month, setMonth] = useState(currentMonth());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const filtered = state.transactions.filter(
    (item) =>
      item.date.startsWith(month) &&
      (filter === "all" || item.type === filter) &&
      `${item.category} ${item.note}`.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, item) => {
    (acc[item.date] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className="page">
      <Header
        title="Transactions"
        subtitle="Semua catatan keuangan aktualmu."
        action={
          <button className="header-add" onClick={() => openAdd()}>
            <Icon name="plus" size={18} />
          </button>
        }
      />
      <div className="content-stack">
        <div className="month-search">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <label>
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari transaksi"
            />
          </label>
        </div>
        <div className="filter-scroll">
          {(
            [
              ["all", "Semua"],
              ["income", "Pemasukan"],
              ["expense", "Pengeluaran"],
              ["savings", "Tabungan"],
              ["opening_balance", "Saldo awal"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {!filtered.length ? (
          <section className="empty-card">
            <div className="empty-icon">
              <Icon name="stats" />
            </div>
            <h2>Belum ada transaksi.</h2>
            <p>Transaksi yang kamu catat akan muncul di sini.</p>
            <button className="primary-button" onClick={() => openAdd()}>
              Tambah Transaksi
            </button>
          </section>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => (
              <section className="transaction-group" key={date}>
                <h2>
                  {new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
                <div className="transaction-list">
                  {items.map((item) => (
                    <article className="transaction-item" key={item.id}>
                      <span className={`transaction-icon ${item.type}`}>
                        <Icon
                          name={
                            item.type === "income"
                              ? "arrowDown"
                              : item.type === "expense"
                                ? "arrowUp"
                                : "wallet"
                          }
                          size={18}
                        />
                      </span>
                      <div>
                        <strong>{item.category}</strong>
                        <small>
                          {item.note || (item.source === "ai" ? "Dicatat oleh AI" : "Input manual")}
                        </small>
                      </div>
                      <div className="transaction-amount">
                        <strong className={item.type}>
                          {item.type === "income" || item.type === "opening_balance"
                            ? "+"
                            : item.type === "closing_balance"
                              ? ""
                              : "-"}
                          {rupiah(item.amount)}
                        </strong>
                        <span>
                          <button onClick={() => openAdd(item)} aria-label="Edit">
                            <Icon name="edit" size={15} />
                          </button>
                          <button onClick={() => setDeleteId(item.id)} aria-label="Hapus">
                            <Icon name="trash" size={15} />
                          </button>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-icon danger-bg">
              <Icon name="trash" />
            </div>
            <h2>Hapus transaksi?</h2>
            <p>Saldo dan semua ringkasan akan langsung dihitung ulang.</p>
            <button className="secondary-button full" onClick={() => setDeleteId(null)}>
              Batal
            </button>
            <button
              className="danger-button full"
              onClick={() => {
                deleteTransaction(deleteId);
                setDeleteId(null);
              }}
            >
              Hapus Transaksi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfilePage() {
  const { state, setPrivacy, deleteMemory, updateMemory, setPeriods, reset } = useWallet();
  const [resetOpen, setResetOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const summary = getSummary(state.transactions, state.budgets);
  const activePeriod = state.periods.find((item) => item.status === "active");

  const closePeriod = () => {
    if (!activePeriod) return;
    setPeriods(
      state.periods.map((item) =>
        item.id === activePeriod.id
          ? { ...item, closingBalance: summary.balance, status: "closed" }
          : item,
      ),
    );
  };

  const newPeriod = (opening: number) => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setPeriods([
      ...state.periods,
      {
        id: uid("period"),
        startDate: next.toISOString().slice(0, 10),
        endDate: new Date(next.getFullYear(), next.getMonth() + 1, 0).toISOString().slice(0, 10),
        openingBalance: opening,
        status: "active",
      },
    ]);
  };

  return (
    <main className="page">
      <Header title="Profile & Privacy" subtitle="Kontrol data dan preferensimu." />
      <div className="content-stack">
        <section className="profile-card">
          <div className="profile-avatar">T</div>
          <div>
            <h2>Tata</h2>
            <p>Pengguna WALLET lokal</p>
          </div>
          <button>
            <Icon name="edit" size={17} />
          </button>
        </section>
        <section className="white-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">KONTROL AI</span>
              <h2>Privasi & akses data</h2>
            </div>
            <Icon name="shield" />
          </div>
          <p className="section-description">
            Matikan akses tanpa menghapus catatan keuangan yang sebenarnya.
          </p>
          {(
            [
              ["income", "Pemasukan", "AI dapat menjawab pertanyaan pemasukan."],
              ["budget", "Anggaran", "AI dapat membaca anggaran aktif."],
              ["transactions", "Transactions", "AI dapat memakai riwayat transaksi."],
              ["additional", "Informasi tambahan", "AI dapat memakai tujuan dan konteks lain."],
            ] as const
          ).map(([key, label, description]) => (
            <label className="setting-row" key={key}>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                checked={state.privacy[key]}
                onChange={(event) => setPrivacy({ ...state.privacy, [key]: event.target.checked })}
              />
            </label>
          ))}
        </section>
        <section className="menu-card">
          <button onClick={() => setMemoryOpen(!memoryOpen)}>
            <span className="menu-icon">
              <Icon name="spark" />
            </span>
            <span>
              <strong>AI Memory</strong>
              <small>{state.memory.length} informasi tersimpan</small>
            </span>
            <Icon name="chevron" />
          </button>
          {memoryOpen && (
            <div className="expand-content">
              {!state.memory.length ? (
                <p className="muted">Belum ada memori AI.</p>
              ) : (
                state.memory.map((item) => (
                  <div className="memory-item" key={item.id}>
                    <div>
                      <span>{item.type}</span>
                      <input
                        value={item.text}
                        onChange={(event) => updateMemory({ ...item, text: event.target.value })}
                      />
                    </div>
                    <button onClick={() => deleteMemory(item.id)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))
              )}
              <p className="fine-print">Menghapus memori tidak menghapus transaksi aktual.</p>
            </div>
          )}
          <button onClick={() => setPeriodOpen(!periodOpen)}>
            <span className="menu-icon blue">
              <Icon name="plan" />
            </span>
            <span>
              <strong>Periode Keuangan</strong>
              <small>{activePeriod ? "Periode aktif" : "Tidak ada periode aktif"}</small>
            </span>
            <Icon name="chevron" />
          </button>
          {periodOpen && (
            <div className="expand-content">
              {state.periods.map((period) => (
                <div className="period-row" key={period.id}>
                  <div>
                    <strong>
                      {period.startDate} — {period.endDate}
                    </strong>
                    <small>
                      {period.status === "active"
                        ? "Aktif"
                        : `Ditutup · ${rupiah(period.closingBalance ?? 0)}`}
                    </small>
                  </div>
                </div>
              ))}
              {activePeriod ? (
                <button className="secondary-button full" onClick={closePeriod}>
                  Simpan saldo akhir periode ini
                </button>
              ) : (
                <>
                  <p>Gunakan saldo akhir sebelumnya sebagai saldo awal periode berikutnya?</p>
                  <button
                    className="primary-button full"
                    onClick={() => newPeriod(state.periods.at(-1)?.closingBalance ?? 0)}
                  >
                    Gunakan Saldo Sebelumnya
                  </button>
                  <button className="secondary-button full" onClick={() => newPeriod(0)}>
                    Mulai dari Rp0
                  </button>
                </>
              )}
              <p className="fine-print">
                Saldo bawaan periode tidak dicatat sebagai pemasukan baru.
              </p>
            </div>
          )}
        </section>
        <section className="white-card danger-zone">
          <h2>Reset semua data</h2>
          <p>Menghapus transaksi, anggaran, percakapan, dan preferensi dari browser ini.</p>
          <button className="danger-outline" onClick={() => setResetOpen(true)}>
            Reset Data WALLET
          </button>
        </section>
      </div>
      {resetOpen && (
        <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-icon danger-bg">
              <Icon name="trash" />
            </div>
            <h2>Reset semua data?</h2>
            <p>
              Tindakan ini tidak dapat dibatalkan. Data hanya dihapus setelah kamu menekan tombol di
              bawah.
            </p>
            <button className="secondary-button full" onClick={() => setResetOpen(false)}>
              Batal
            </button>
            <button
              className="danger-button full"
              onClick={() => {
                reset();
                setResetOpen(false);
              }}
            >
              Ya, Reset Semua Data
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function TransactionSheet({
  transaction,
  onClose,
}: {
  transaction?: Transaction;
  onClose: () => void;
}) {
  const { addTransaction, updateTransaction } = useWallet();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [date, setDate] = useState(transaction?.date ?? today());
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState("");
  const categories =
    type === "income"
      ? ["Penghasilan", "Uang dari Orang Tua", "Freelance", "Lainnya"]
      : type === "savings"
        ? ["Tabungan", "Dana Darurat", "Tujuan Keuangan"]
        : [
            "Makanan",
            "Minuman",
            "Transportasi",
            "Tempat Tinggal",
            "Pendidikan",
            "Hiburan",
            "Belanja",
            "Lainnya",
          ];

  const save = () => {
    const numeric = Number(amount.replace(/\D/g, ""));
    if (!numeric || !category || !date) {
      setError("Lengkapi nominal, kategori, dan tanggal.");
      return;
    }
    if (transaction) {
      updateTransaction({ ...transaction, type, amount: numeric, category, date, note });
    } else {
      addTransaction({ ...makeTransactionInput(type, numeric, category, "manual", note), date });
    }
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">
          <div>
            <span className="section-kicker">{transaction ? "EDIT" : "TRANSAKSI BARU"}</span>
            <h2>{transaction ? "Ubah transaksi" : "Catat transaksi"}</h2>
          </div>
          <button onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="type-selector">
          {(
            [
              ["income", "Pemasukan"],
              ["expense", "Pengeluaran"],
              ["savings", "Tabungan"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={type === value ? "active" : ""}
              onClick={() => {
                setType(value);
                setCategory("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <MoneyField label="Nominal" value={amount} onChange={setAmount} placeholder="0" />
        <label className="field-label">
          Kategori
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Pilih kategori</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Tanggal
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field-label">
          Catatan <span>(opsional)</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Tambahkan catatan"
          />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button className="primary-button full" onClick={save}>
          {transaction ? "Simpan Perubahan" : "Tambah Transaksi"}
        </button>
      </section>
    </div>
  );
}

function WalletApp() {
  const [page, setPage] = useState<Page>("home");
  const [sheet, setSheet] = useState<{ open: boolean; transaction?: Transaction }>({ open: false });
  const navigate = (next: Page) => {
    setPage(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-shell">
      {page === "home" && <HomePage navigate={navigate} openAdd={() => setSheet({ open: true })} />}
      {page === "setup" && <SetupPage navigate={navigate} />}
      {page === "planner" && <PlannerPage navigate={navigate} />}
      {page === "assistant" && (
        <AssistantPage navigate={navigate} openAdd={() => setSheet({ open: true })} />
      )}
      {page === "transactions" && (
        <TransactionsPage openAdd={(transaction) => setSheet({ open: true, transaction })} />
      )}
      {page === "profile" && <ProfilePage />}
      {page !== "assistant" && (
        <BottomNav page={page} navigate={navigate} openAdd={() => setSheet({ open: true })} />
      )}
      {sheet.open && (
        <TransactionSheet
          transaction={sheet.transaction}
          onClose={() => setSheet({ open: false })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <WalletApp />
    </WalletProvider>
  );
}
