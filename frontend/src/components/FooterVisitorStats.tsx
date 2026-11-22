"use client";

import { useResource } from "@/lib/useResource";
import { formatCount } from "@/lib/home-stats";

interface PublicVisitorSummary {
  online_now: number;
  today_visitors: number;
  month_visitors: number;
  total_visitors: number;
}

export default function FooterVisitorStats() {
  const { data } = useResource<PublicVisitorSummary>("/public/visitors");

  if (!data) return null;

  const online = Math.max(0, data.online_now || 0);
  const today = Math.max(0, data.today_visitors || 0);
  const month = Math.max(0, data.month_visitors || 0);
  const total = Math.max(0, data.total_visitors || 0);

  if (online === 0 && today === 0 && month === 0 && total === 0) {
    return null;
  }

  return (
    <div
      className="footer-visitors"
      aria-label="Statistik pengunjung situs"
    >
      <span className="footer-visitors-live">
        <span className="footer-live-dot" aria-hidden="true" />
        <strong>{formatCount(online)}</strong> online
      </span>
      <span className="footer-visitors-sep" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{formatCount(today)}</strong> hari ini
      </span>
      <span className="footer-visitors-sep" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{formatCount(month)}</strong> bulan ini
      </span>
      <span className="footer-visitors-sep" aria-hidden="true">
        ·
      </span>
      <span>
        <strong>{formatCount(total)}</strong> total
      </span>
    </div>
  );
}
