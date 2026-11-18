"use client";
import { Award, Crown, Heart, MessageSquareQuote, Sparkles, UsersRound } from "lucide-react";
import { useResource } from "@/lib/useResource";
import {
  DonationOverview,
  DonationPeriod,
  DonationStats,
  donationTier,
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

export function SupporterList({
  rows,
  compact = false,
}: {
  rows: TopSupporter[];
  compact?: boolean;
}) {
  if (!rows.length)
    return (
      <p className="donation-empty muted">
        Belum ada nama publik pada periode ini. Dukungan anonim tetap masuk
        total.
      </p>
    );
  return (
    <ol
      className={`donation-list donation-leaderboard${compact ? " donation-leaderboard-compact" : ""}`}
      aria-label="Peringkat pendukung"
    >
      {rows.map((row, index) => {
        const tier = donationTier(row.total_amount);
        const topRank = row.rank <= 3 ? row.rank : undefined;
        return (
          <li
            className="donation-leaderboard-card"
            data-rank={topRank}
            data-tier={tier.key}
            key={`${row.rank}-${index}`}
            value={row.rank}
          >
            <div className="donation-row">
              <span
                className="donation-rank"
                data-rank={topRank}
                aria-label={`Peringkat ${row.rank}`}
              >
                {row.rank === 1 ? (
                  <Crown size={15} aria-hidden="true" />
                ) : row.rank <= 3 ? (
                  <Award size={15} aria-hidden="true" />
                ) : null}
                <span>#{row.rank}</span>
              </span>
              <div className="donation-person">
                <div className="donation-person-header">
                  <strong>{row.full_name}</strong>
                  <span className="donation-tier-pill" data-tier={tier.key}>
                    {tier.label}
                  </span>
                </div>
                <span className="muted donation-small">
                  {row.donation_count} kali dukungan
                </span>
              </div>
              <strong className="donation-row-amount">
                {rupiah(row.total_amount)}
              </strong>
            </div>
            {row.message && (
              <div className="donation-chat-bubble donation-leaderboard-quote">
                <MessageSquareQuote
                  size={14}
                  className="donation-chat-icon"
                  aria-hidden="true"
                />
                <p className="donation-message-text">{row.message}</p>
              </div>
            )}
          </li>
        );
      })}
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
    <ul
      className={`donation-list donation-stream${compact ? " donation-stream-compact" : ""}`}
      aria-label="Dukungan terbaru"
    >
      {rows.map((row, index) => {
        const tier = donationTier(row.amount);
        return (
          <li
            className="donation-recent donation-stream-card"
            data-tier={tier.key}
            key={`${row.paid_at || row.created_at}-${index}`}
          >
            <div className="donation-row">
              <span
                className="donation-avatar"
                data-tier={tier.key}
                aria-hidden="true"
              >
                {row.amount >= 25000 ? (
                  <Sparkles size={15} />
                ) : (
                  <Heart size={15} />
                )}
              </span>
              <div className="donation-person">
                <div className="donation-person-header">
                  <strong>{row.full_name}</strong>
                  <span className="donation-tier-pill" data-tier={tier.key}>
                    {tier.label}
                  </span>
                </div>
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
            {row.message && (
              <div className="donation-chat-bubble">
                <MessageSquareQuote
                  size={14}
                  className="donation-chat-icon"
                  aria-hidden="true"
                />
                <p className="donation-message">{row.message}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
