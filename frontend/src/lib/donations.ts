export const DONATION_AMOUNTS = [5000, 10000, 25000, 50000];
export const MIN_DONATION = 1000;
export const MAX_DONATION = 2147483647;
export function donationAmount(value: string): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text) && !/^\d{1,3}(\.\d{3})+$/.test(text)) return null;
  const amount = Number(text.replaceAll(".", ""));
  return Number.isSafeInteger(amount) &&
    amount >= MIN_DONATION &&
    amount <= MAX_DONATION
    ? amount
    : null;
}
export const rupiah = (amount: number) =>
  `Rp ${amount.toLocaleString("id-ID")}`;
export const donationLoginHref = (amount: number) =>
  `/login?next=${encodeURIComponent(`/donasi?amount=${amount}`)}`;
export function supporterName(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length || /@|:\/\/|www\./.test(name || ""))
    return "Pendukung TOCPNS";
  return (
    Array.from(parts[0]).slice(0, 40).join("") +
    (parts.length > 1 ? ` ${Array.from(parts.at(-1)!)[0].toUpperCase()}.` : "")
  );
}
export function dokuCheckoutUrl(value: string): string {
  const target = new URL(value);
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    !["checkout.doku.com", "jokul.doku.com", "sandbox.doku.com"].includes(
      target.hostname,
    ) ||
    (target.port && target.port !== "443")
  )
    throw new Error(
      "Tautan pembayaran belum dapat dikonfirmasi. Silakan coba lagi.",
    );
  return target.href;
}
export type DonationPeriod = "month" | "all";
export interface DonationStats {
  total_amount: number;
  target_amount: number;
  percentage: number;
  supporter_count: number;
  donation_count: number;
}
export interface TopSupporter {
  full_name: string;
  total_amount: number;
  donation_count: number;
  rank: number;
}
export interface RecentSupporter {
  full_name: string;
  amount: number;
  message: string | null;
  created_at: string;
  paid_at: string | null;
  is_anonymous: boolean;
}
export interface DonationOverview {
  period: DonationPeriod;
  period_label: string;
  stats: DonationStats;
  top_supporters: TopSupporter[];
  recent_supporters: RecentSupporter[];
  updated_at: string;
}
export function validDonationOverview(
  value: unknown,
): value is DonationOverview {
  if (!value || typeof value !== "object") return false;
  const data = value as DonationOverview;
  return (
    ["month", "all"].includes(data.period) &&
    typeof data.period_label === "string" &&
    !!data.stats &&
    [
      data.stats.total_amount,
      data.stats.target_amount,
      data.stats.supporter_count,
      data.stats.donation_count,
      data.stats.percentage,
    ].every((amount) => Number.isFinite(amount) && amount >= 0) &&
    Array.isArray(data.top_supporters) &&
    data.top_supporters.every(
      (row) =>
        !!row &&
        typeof row.full_name === "string" &&
        Number.isFinite(row.total_amount) &&
        Number.isFinite(row.rank) &&
        Number.isFinite(row.donation_count),
    ) &&
    Array.isArray(data.recent_supporters) &&
    data.recent_supporters.every(
      (row) =>
        !!row &&
        typeof row.full_name === "string" &&
        Number.isFinite(row.amount) &&
        typeof row.created_at === "string" &&
        (row.message === null || typeof row.message === "string"),
    )
  );
}
