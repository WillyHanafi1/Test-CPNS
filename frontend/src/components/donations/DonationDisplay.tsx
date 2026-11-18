"use client";
import { Heart, UsersRound } from "lucide-react";
import { useResource } from "@/lib/useResource";
import {
  DonationOverview,
  DonationPeriod,
  DonationStats,
  RecentSupporter,
  TopSupporter,
  rupiah,
  validDonationOverview,
} from "@/lib/donations";

export function useDonations(period: DonationPeriod = "month", limit = 10) {
  const state = useResource<DonationOverview>(
    `/transactions/donations/overview?period=${period}&limit=${limit}`,
  );
  const valid = state.data && validDonationOverview(state.data);
  return {
    ...state,
    data: valid ? state.data : null,
    error:
      state.error ||
      (state.data && !valid
        ? "Data dukungan belum dapat ditampilkan. Silakan coba lagi."
        : ""),
  };
}

export function DonationProgress({
  stats,
  periodLabel,
}: {
  stats: DonationStats;
  periodLabel: string;
}) {
  return (
    <div className="donation-progress-block">
      <p className="eyebrow">DUKUNGAN · {periodLabel}</p>
      <div className="donation-metrics">
        <div>
          <strong className="donation-total">
            {rupiah(stats.total_amount)}
          </strong>
          <p className="muted donation-small">
            {stats.target_amount > 0
              ? `dari target operasional ${rupiah(stats.target_amount)}`
              : "total dukungan terkonfirmasi"}
          </p>
        </div>
        <span className="donation-supporter-count">
          <UsersRound size={17} aria-hidden="true" />
          {stats.supporter_count.toLocaleString("id-ID")} pendukung
        </span>
      </div>
      {stats.target_amount > 0 && (
        <progress
          className="donation-progress"
          max={stats.target_amount}
          value={Math.min(stats.total_amount, stats.target_amount)}
          aria-label={`Dukungan ${periodLabel}`}
          aria-valuetext={`${rupiah(stats.total_amount)} dari ${rupiah(stats.target_amount)}`}
        />
      )}
      <p className="muted donation-small">
        {stats.donation_count.toLocaleString("id-ID")} dukungan berhasil ·
        Termasuk dukungan anonim
      </p>
    </div>
  );
}

export function SupporterList({ rows }: { rows: TopSupporter[] }) {
  if (!rows.length)
    return (
      <p className="donation-empty muted">
        Belum ada nama publik pada periode ini. Dukungan anonim tetap masuk
        total.
      </p>
    );
  return (
    <ol className="donation-list" aria-label="Peringkat pendukung">
      {rows.map((row, index) => (
        <li
          className="donation-row"
          key={`${row.rank}-${index}`}
          value={row.rank}
        >
          <span className="donation-rank" aria-label={`Peringkat ${row.rank}`}>
            {row.rank}
          </span>
          <div className="donation-person">
            <strong>{row.full_name}</strong>
            <span className="muted donation-small">
              {row.donation_count} kali dukungan
            </span>
          </div>
          <strong className="donation-row-amount">
            {rupiah(row.total_amount)}
          </strong>
        </li>
      ))}
    </ol>
  );
}

export function RecentList({
  rows,
  compact = false,
}: {
  rows: RecentSupporter[];
  compact?: boolean;
}) {
  if (!rows.length)
    return (
      <p className="donation-empty muted">
        Dukungan yang sudah berhasil akan tampil di sini.
      </p>
    );
  return (
    <ul className="donation-list" aria-label="Dukungan terbaru">
      {rows.map((row, index) => (
        <li
          className="donation-recent"
          key={`${row.paid_at || row.created_at}-${index}`}
        >
          <div className="donation-row">
            <span className="donation-avatar" aria-hidden="true">
              <Heart size={16} />
            </span>
            <div className="donation-person">
              <strong>{row.full_name}</strong>
              <time
                className="muted donation-small"
                dateTime={row.paid_at || row.created_at}
              >
                {new Date(row.paid_at || row.created_at).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Jakarta",
                  },
                )}
              </time>
            </div>
            <strong className="donation-row-amount">
              {rupiah(row.amount)}
            </strong>
          </div>
          {!compact && row.message && (
            <p className="donation-message">{row.message}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
