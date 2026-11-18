"use client";
import { Heart, Repeat2, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { rupiah, type DonationOverview } from "@/lib/donations";
import type { DonationDesignId } from "@/lib/donation-designs";
import DonationLeaderboard from "./DonationLeaderboard";
import DonationChat from "./DonationChat";

function Stats({ data }: { data: DonationOverview }) {
  const { stats } = data;
  const percentage = stats.target_amount
    ? Math.round((stats.total_amount / stats.target_amount) * 100)
    : 0;
  return (
    <section className="dc-stats" aria-label="Statistik donasi">
      <div className="dc-stat-total">
        <span>Total dukungan · {data.period_label}</span>
        <strong className="donation-total">{rupiah(stats.total_amount)}</strong>
        {stats.target_amount > 0 ? (
          <>
            <div className="dc-goal-label">
              <span>Target {rupiah(stats.target_amount)}</span>
              <strong>{percentage}%</strong>
            </div>
            <progress
              className="donation-progress"
              max={stats.target_amount}
              value={Math.min(stats.total_amount, stats.target_amount)}
              aria-label={`Dukungan ${data.period_label}`}
              aria-valuetext={`${percentage}% · ${rupiah(stats.total_amount)} dari ${rupiah(stats.target_amount)}`}
            />
          </>
        ) : (
          <small>Termasuk dukungan anonim</small>
        )}
      </div>
      <div className="dc-stat-counts">
        <div>
          <UsersRound size={17} />
          <strong>{stats.supporter_count}</strong>
          <span>pendukung</span>
        </div>
        <div>
          <Repeat2 size={17} />
          <strong>{stats.donation_count}</strong>
          <span>dukungan berhasil</span>
        </div>
      </div>
    </section>
  );
}
export default function DonationCommunity({
  data,
  format = "overlay",
  compact = false,
  pinned = true,
  demo = false,
  controls,
}: {
  data: DonationOverview;
  format?: DonationDesignId;
  compact?: boolean;
  pinned?: boolean;
  demo?: boolean;
  controls?: ReactNode;
}) {
  return (
    <div
      className={`donation-community${compact ? " dc-compact" : ""}`}
      data-community-format={format}
    >
      {controls && <div className="dc-controls">{controls}</div>}
      <Stats data={data} />
      <div className="dc-board-chat">
        <section className="dc-board" aria-label="Papan dukungan">
          <div className="dc-board-heading">
            <div>
              <span className="dc-section-kicker">
                <Trophy size={14} /> PAPAN DUKUNGAN
              </span>
              <h2>
                {data.period === "month"
                  ? "Pendukung bulan ini"
                  : "Pendukung sepanjang waktu"}
              </h2>
            </div>
            <span className="dc-board-period">{data.period_label}</span>
          </div>
          <DonationLeaderboard
            rows={data.top_supporters}
            format={format}
            compact={compact}
          />
          <p className="dc-board-note">
            <Heart size={13} /> Total per akun · semua dukungan sama berartinya
          </p>
        </section>
        <DonationChat
          key={data.period_label}
          rows={data.recent_supporters}
          top={data.top_supporters[0]}
          period={data.period_label}
          pinned={pinned}
          compact={compact}
          demo={demo}
        />
      </div>
    </div>
  );
}
