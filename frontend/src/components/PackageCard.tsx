"use client";
import Link from "next/link";
import { ArrowUpRight, Clock3, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PackageInfo } from "@/lib/api";
export function PackageCard(p: PackageInfo) {
  const { user } = useAuth();
  const ongoing = p.user_status === "ongoing";
  const completed = p.user_status === "finished";
  const href =
    ongoing && p.session_id
      ? `/session/${p.session_id}`
      : completed && p.session_id
        ? `/session/${p.session_id}/result`
        : `/catalog/${p.id}`;
  return (
    <article className="panel package-item">
      <div className="between">
        <span className="eyebrow" style={{ margin: 0 }}>
          {p.is_weekly ? "TRYOUT TERJADWAL" : "SIMULASI SKD"}
        </span>
        <span className={`badge ${!p.is_premium ? "badge-green" : ""}`}>
          {p.is_premium
            ? user?.is_pro
              ? "Termasuk keanggotaan"
              : "Termasuk Pro"
            : "Gratis"}
        </span>
      </div>
      <h3>{p.title}</h3>
      <div className="inline muted">
        <span className="inline" style={{ gap: 5 }}>
          <FileText size={14} />
          {p.question_count} soal
        </span>
        <span className="inline" style={{ gap: 5 }}>
          <Clock3 size={14} />
          {p.duration_minutes} menit
        </span>
      </div>
      <footer>
        <span className="muted">
          {ongoing
            ? "Sedang dikerjakan"
            : completed
              ? "Selesai"
              : p.access_reason === "upcoming"
                ? "Belum dibuka"
                : p.access_reason === "expired"
                  ? "Jadwal berakhir"
                  : p.is_ready
                    ? "Siap dikerjakan"
                    : "Sedang dipersiapkan"}
        </span>
        <Link className="button button-small button-secondary" href={href}>
          {ongoing ? "Lanjutkan" : completed ? "Lihat hasil" : "Lihat paket"}
          <ArrowUpRight size={14} />
        </Link>
      </footer>
    </article>
  );
}
