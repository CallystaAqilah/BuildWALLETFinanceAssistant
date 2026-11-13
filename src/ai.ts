import type { Transaction, WalletState } from "./types";

export type Intent =
  | "greeting"
  | "create_income"
  | "create_expense"
  | "create_savings"
  | "update_transaction"
  | "delete_transaction"
  | "ask_balance"
  | "ask_income"
  | "ask_expense"
  | "ask_budget"
  | "financial_advice"
  | "budget_recommendation"
  | "reject_recommendation"
  | "edit_recommendation"
  | "hypothetical_purchase"
  | "future_plan"
  | "clarification"
  | "unknown";

export function extractAmount(text: string): number | null {
  const match = text.toLowerCase().match(/(?:rp\s*)?(\d[\d.,]*)(?:\s*(ribu|rb|juta|jt))?/);
  if (!match) return null;
  const raw = match[1];
  const suffix = match[2];
  if (!suffix && /^\d{1,3}$/.test(raw) && !text.toLowerCase().includes("rp")) return null;
  let value: number;
  if (suffix) {
    value = Number(raw.replace(",", ".").replace(/\.(?=\d{3}(?:\D|$))/g, ""));
    value *= suffix === "juta" || suffix === "jt" ? 1_000_000 : 1_000;
  } else {
    value = Number(raw.replace(/[.,]/g, ""));
  }
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export function detectCategory(text: string) {
  const value = text.toLowerCase();
  const categories: [RegExp, string][] = [
    [/(makan|nasi|bakso|sarapan|lunch|dinner)/, "Makanan"],
    [/(minum|kopi|boba|teh)/, "Minuman"],
    [/(kos|kontrakan|sewa)/, "Tempat Tinggal"],
    [/(transport|ojol|gojek|grab|bensin|bus|kereta)/, "Transportasi"],
    [/(kuliah|buku|kelas|kursus|ukt)/, "Pendidikan"],
    [/(hiburan|nonton|game|konser)/, "Hiburan"],
    [/(orang tua|ortu|ayah|ibu)/, "Uang dari Orang Tua"],
    [/(gaji|upah|freelance)/, "Penghasilan"],
    [/(tabung|saving|dana darurat)/, "Tabungan"],
    [/(sepatu|baju|laptop|belanja)/, "Belanja"],
  ];
  return categories.find(([pattern]) => pattern.test(value))?.[1] ?? "Lainnya";
}

export function detectIntent(text: string): Intent {
  const value = text.toLowerCase().trim();
  if (/^(hai|halo|hi|pagi|siang|malam)\b/.test(value)) return "greeting";
  if (
    /(nggak|tidak|ga|gak).*(mau|jadi|pakai).*(saran|rekomendasi|anggaran)|tolak.*(saran|rekomendasi)/.test(
      value,
    )
  )
    return "reject_recommendation";
  if (
    /(kurangi|ubah|ganti).*(anggaran|budget|saran|rekomendasi)|(?:tabungan|hiburan).*(terlalu besar|kebanyakan)/.test(
      value,
    )
  )
    return "edit_recommendation";
  if (/(bulan depan|minggu depan|nanti|tahun depan).*(mau|ingin|rencana)/.test(value))
    return "future_plan";
  if (/^(kalau|andaikan|misal)|aman nggak|mampu nggak|bisa beli/.test(value))
    return "hypothetical_purchase";
  if (/(ubah|koreksi|ternyata|eh,?).*(pengeluaran|pemasukan|jadi|rp|\d)/.test(value))
    return "update_transaction";
  if (
    /(nggak jadi|tidak jadi|hapus|batalkan).*(beli|bayar|transaksi|pengeluaran|pemasukan)?/.test(
      value,
    )
  )
    return "delete_transaction";
  if (/(saldo|uangku|uang aku).*(berapa|sekarang)|berapa.*(saldo|uang)/.test(value))
    return "ask_balance";
  if (/(total|berapa).*(pemasukan|pendapatan)/.test(value)) return "ask_income";
  if (/(total|berapa).*(pengeluaran|belanja)|totalnya berapa/.test(value)) return "ask_expense";
  if (/(budget|anggaran).*(berapa|sisa)|berapa.*(budget|anggaran)/.test(value)) return "ask_budget";
  if (/(saran|rekomendasi).*(budget|anggaran)|buatkan.*(budget|anggaran)/.test(value))
    return "budget_recommendation";
  if (/(saran|nasihat|boros|hemat)/.test(value)) return "financial_advice";
  if (/(tabung|masuk tabungan|alokasi.*tabungan)/.test(value)) return "create_savings";
  if (/(dapat|terima|gajian|dibayar|pemasukan|masuk).*(rp|\d|ribu|juta)/.test(value))
    return "create_income";
  if (/(beli|bayar|keluar|pengeluaran|habis|makan|minum).*(rp|\d|ribu|juta)/.test(value))
    return "create_expense";
  return "unknown";
}

export function findRelevantTransaction(
  state: WalletState,
  text: string,
  type?: Transaction["type"],
): Transaction[] {
  const category = detectCategory(text);
  return state.transactions.filter((item) => {
    const typeMatch = !type || item.type === type;
    const categoryMatch = category === "Lainnya" || item.category === category;
    return typeMatch && categoryMatch;
  });
}
