import type {
  DonationOverview,
  RecentSupporter,
  TopSupporter,
} from "./donations";

export interface DemoDonation extends RecentSupporter {
  id: string;
  supporter_id: string;
}
// All names, messages and amounts below are synthetic, never real endorsements.
const entry = (
  id: number,
  supporter: string,
  name: string,
  amount: number,
  date: string,
  message: string | null,
  anonymous = false,
): DemoDonation => ({
  id: `demo-${id}`,
  supporter_id: supporter,
  full_name: anonymous ? "Pendukung anonim" : name,
  amount,
  paid_at: date,
  created_at: date,
  message,
  is_anonymous: anonymous,
});
export const DEMO_DONATIONS: DemoDonation[] = [
  entry(
    1,
    "alya",
    "Alya Putri",
    25000,
    "2026-11-18T09:10:00+07:00",
    "Sedikit dari aku. Semoga makin banyak yang terbantu. 🌱",
  ),
  entry(
    2,
    "anon-1",
    "",
    5000,
    "2026-11-18T08:05:00+07:00",
    "Bismillah, semoga kita dipertemukan dengan NIP impian.",
    true,
  ),
  entry(
    3,
    "rizky",
    "Rizky Pratama",
    50000,
    "2026-11-17T20:30:00+07:00",
    "Teman belajar sepulang kerja. Terima kasih sudah ada!",
  ),
  entry(4, "nadia", "Nadia Rahma", 10000, "2026-11-16T06:15:00+07:00", null),
  entry(
    5,
    "fajar",
    "Fajar Maulana",
    100000,
    "2026-11-12T12:00:00+07:00",
    "Semoga ruang ini terus menemani teman-teman berjuang.",
  ),
  entry(
    6,
    "alya",
    "Alya Putri",
    15000,
    "2026-11-05T19:20:00+07:00",
    "Balik lagi buat titip semangat. Pelan-pelan, kita bisa.",
  ),
  entry(
    7,
    "bima",
    "Bima Saputra",
    1000,
    "2026-11-01T00:00:00+07:00",
    "Belum banyak, tapi ingin ikut merawat. 🤍",
  ),
  entry(
    8,
    "anon-2",
    "",
    5000,
    "2026-10-31T23:59:00+07:00",
    "Menutup bulan dengan satu niat baik.",
    true,
  ),
  entry(
    9,
    "dewi",
    "Dewi Lestari",
    25000,
    "2026-10-28T14:45:00+07:00",
    "Satu latihan setiap hari. Satu langkah lebih dekat.",
  ),
  entry(
    10,
    "rizky",
    "Rizky Pratama",
    25000,
    "2026-10-20T21:00:00+07:00",
    "Buat yang belum lolos: istirahat boleh, menyerah jangan.",
  ),
  entry(
    11,
    "salsa",
    "Salsabila Nur Azizah Prameswari",
    50000,
    "2026-10-15T07:00:00+07:00",
    "Terima kasih sudah menemani proses belajar yang tidak selalu mudah. Semoga kita semua diberi kesehatan, kesabaran, dan hasil terbaik. Terus semangat!",
  ),
  entry(
    12,
    "arif",
    "Arif Hidayat",
    75000,
    "2026-10-06T16:30:00+07:00",
    "Untuk server dan teman-teman yang masih berjuang.",
  ),
  entry(
    13,
    "citra",
    "Citra Ayu",
    10000,
    "2026-10-01T00:00:00+07:00",
    "Bulan baru, semangat baru!",
  ),
  entry(14, "yoga", "Yoga Aditya", 5000, "2026-09-30T23:59:00+07:00", null),
  entry(
    15,
    "anon-3",
    "",
    25000,
    "2026-09-10T10:10:00+07:00",
    "Semoga bermanfaat.",
    true,
  ),
  entry(
    16,
    "tania",
    "Tania Maharani",
    500000,
    "2026-01-19T18:00:00+07:00",
    "Mau ikut membantu supaya platformnya terus dirawat.",
  ),
  entry(
    17,
    "bayu",
    "Bayu Setiawan",
    2000000,
    "2026-01-03T09:00:00+07:00",
    "Semoga akses belajar yang baik bisa terus berkembang.",
  ),
  entry(
    18,
    "intan",
    "Intan Permata",
    10000,
    "2026-01-01T00:00:00+07:00",
    "Tahun baru, harapan baru. Semangat semuanya!",
  ),
  entry(
    19,
    "wahyu",
    "Wahyu Nugroho",
    5000,
    "2025-12-31T23:59:00+07:00",
    "Sampai jumpa di tahun yang lebih baik.",
  ),
  entry(
    20,
    "alya",
    "Alya Putri",
    5000,
    "2026-11-01T00:05:00+07:00",
    "Awal bulan, mulai lagi. ✨",
  ),
];

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
    recent_supporters: rows,
    updated_at: "2026-11-18T12:00:00+07:00",
  };
}
