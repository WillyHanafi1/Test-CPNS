import donationFixtures from "./donation-demo-data.json";
import type {
  DonationOverview,
  RecentSupporter,
  TopSupporter,
} from "./donations";

export interface DemoDonation extends RecentSupporter {
  id: string;
  supporter_id: string;
}
// Shared synthetic fixtures for the studio and isolated local Docker database.
export const DEMO_DONATIONS: DemoDonation[] = donationFixtures;

export const DEMO_SCENARIOS = [
  {
    id: "all",
    label: "Semua data · 20 donasi",
    month: null,
    target: 0,
    note: "20 transaksi lintas September–November, pergantian tahun, donatur berulang, anonim, dan berbagai nominal.",
  },
  {
    id: "november",
    label: "November 2026 · bulan berjalan",
    month: "2026-11",
    target: 250000,
    note: "Bulan berjalan, termasuk transaksi 1 November pukul 00.00 WIB yang masih 31 Oktober dalam UTC.",
  },
  {
    id: "october",
    label: "Oktober 2026 · bulan sebelumnya",
    month: "2026-10",
    target: 250000,
    note: "Transaksi 31 Oktober pukul 23.59 WIB tetap masuk Oktober. Pendukung berulang dihitung per akun.",
  },
  {
    id: "new-month",
    label: "Desember 2026 · bulan baru/kosong",
    month: "2026-12",
    target: 250000,
    note: "Bulan baru dimulai: total dan progres kembali nol, riwayat bulan sebelumnya tetap ada di Semua data.",
  },
  {
    id: "new-year",
    label: "Januari 2026 · pergantian tahun",
    month: "2026-01",
    target: 250000,
    note: "1 Januari pukul 00.00 WIB masuk tahun baru. Donasi 31 Desember pukul 23.59 WIB tidak ikut Januari.",
  },
  {
    id: "exceeded",
    label: "Target terlampaui",
    month: "2026-11",
    target: 150000,
    note: "Persentase boleh di atas 100%; batang progres tetap dibatasi. Tidak menampilkan kekurangan dana palsu.",
  },
  {
    id: "anonymous",
    label: "Hanya donasi anonim",
    month: null,
    target: 0,
    note: "Donatur anonim tetap masuk peringkat berdasarkan total masing-masing akun. Nama ditampilkan sebagai Anonim dan pesan tetap terlihat.",
  },
] as const;
export type DemoScenarioId = (typeof DEMO_SCENARIOS)[number]["id"];

export function jakartaMonth(date: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(date));
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}
export function donationDate(date: string, short = false) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(date));
}
export function demoOverview(
  scenarioId: string = "all",
  extra: DemoDonation[] = [],
): DonationOverview {
  const scenario =
    DEMO_SCENARIOS.find((item) => item.id === scenarioId) || DEMO_SCENARIOS[0];
  const rows = [...DEMO_DONATIONS, ...extra]
    .filter(
      (row) =>
        (!scenario.month || jakartaMonth(row.paid_at!) === scenario.month) &&
        (scenario.id !== "anonymous" || row.is_anonymous),
    )
    .toSorted((a, b) => Date.parse(b.paid_at!) - Date.parse(a.paid_at!));
  const supporters = new Map<string, TopSupporter>();
  for (const row of rows) {
    const visibilityKey = `${row.supporter_id}:${row.is_anonymous ? "anonymous" : "public"}`;
    const previous = supporters.get(visibilityKey);
    supporters.set(visibilityKey, {
      full_name: row.is_anonymous ? "Anonim" : row.full_name,
      is_anonymous: row.is_anonymous,
      total_amount: (previous?.total_amount || 0) + row.amount,
      donation_count: (previous?.donation_count || 0) + 1,
      message: previous?.message?.trim() || row.message,
      rank: 0,
    });
  }
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const sorted = [...supporters.values()].sort(
    (a, b) =>
      b.total_amount - a.total_amount ||
      a.full_name.localeCompare(b.full_name, "id"),
  );
  return {
    period: scenario.month ? "month" : "all",
    period_label: scenario.month
      ? new Intl.DateTimeFormat("id-ID", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(new Date(`${scenario.month}-01T00:00:00+07:00`))
      : "Semua waktu",
    stats: {
      total_amount: total,
      target_amount: scenario.target,
      percentage: scenario.target ? (total / scenario.target) * 100 : 0,
      supporter_count: new Set(rows.map((row) => row.supporter_id)).size,
      donation_count: rows.length,
    },
    top_supporters: sorted.map((row) => ({
      ...row,
      rank:
        sorted.findIndex((other) => other.total_amount === row.total_amount) +
        1,
    })),
    recent_supporters: rows.map((row) =>
      row.is_anonymous ? { ...row, full_name: "Anonim" } : row,
    ),
    updated_at: "2026-11-18T12:00:00+07:00",
  };
}
