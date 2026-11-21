"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { useResource } from "@/lib/useResource";
import { api, dateLabel } from "@/lib/api";
import { ErrorPanel, Loading } from "@/components/AppShell";
import Modal from "@/components/Modal";
import { AdminBadge, AdminPageHeader } from "@/components/admin";
import {
  formatDateTimeJakarta,
  formatTimeJakarta,
} from "@/lib/admin-format";
import type {
  AdminInfrastructureHealth,
  AdminInfrastructureJob,
} from "@/types/admin";

function formatHeartbeat(seconds: number | null | undefined): {
  status: string;
  tone: "success" | "warning" | "neutral";
  detail: string;
} {
  if (seconds === null || seconds === undefined) {
    return {
      status: "Belum terpantau",
      tone: "neutral",
      detail: "Aktifkan worker dan Beat pada rilis ini.",
    };
  }
  if (seconds < 150) {
    return {
      status: "Terhubung",
      tone: "success",
      detail: `Kabar terakhir ${seconds} detik lalu`,
    };
  }
  return {
    status: "Perlu diperiksa",
    tone: "warning",
    detail: `Kabar terakhir ${seconds} detik lalu`,
  };
}

export default function Operations() {
  const health = useResource<AdminInfrastructureHealth>(
    "/admin/analytics/infrastructure",
  );
  const queue = useResource<{ items: AdminInfrastructureJob[] }>(
    "/admin/analytics/infrastructure/queue",
  );
  const [selected, setSelected] = useState<AdminInfrastructureJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const reloadHealth = health.reload;
  const reloadQueue = queue.reload;

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        reloadHealth();
        reloadQueue();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [reloadHealth, reloadQueue]);

  const workerInfo = formatHeartbeat(
    health.data?.worker_heartbeat_age_seconds,
  );
  const paymentWorkerInfo = formatHeartbeat(
    health.data?.payment_worker_heartbeat_age_seconds,
  );
  const backupAgeHours = health.data?.host?.backup?.database?.age_hours;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operasi"
        title="Kesehatan layanan"
        subtitle="Periksa antrean skoring, worker, webhook pembayaran, dan status backup dari satu tempat."
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-50"
            disabled={health.refreshing}
            onClick={() => {
              health.reload();
              queue.reload();
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${health.refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {health.refreshing ? "Memperbarui…" : "Perbarui"}
          </button>
        }
      />

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {health.loading ? (
        <Loading />
      ) : health.error ? (
        <ErrorPanel message={health.error} retry={health.reload} />
      ) : (
        health.data && (
          <>
            <section className="panel stack">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline">
                  {health.data.issues.length ? (
                    <Activity size={21} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={21} aria-hidden="true" />
                  )}
                  <h2>
                    {health.data.issues.length
                      ? "Ada yang perlu diperiksa"
                      : "Layanan berjalan baik"}
                  </h2>
                </div>
                <AdminBadge
                  tone={health.data.issues.length ? "warning" : "success"}
                  dot
                >
                  {health.data.issues.length
                    ? `${health.data.issues.length} perhatian`
                    : "Sehat"}
                </AdminBadge>
              </div>
              <p className="muted text-xs">
                Diperbarui {formatTimeJakarta(health.data.observed_at)} ·
                pemeriksaan otomatis setiap 30 detik saat halaman terbuka.
                {health.data.last_acknowledged_answer_at
                  ? ` · Jawaban terakhir tersimpan ${formatDateTimeJakarta(health.data.last_acknowledged_answer_at)}.`
                  : ""}
              </p>
              {health.data.issues.map((issue) => (
                <p className="notice notice-warning" key={issue.code}>
                  {issue.message}
                  {issue.count && issue.count > 1 ? ` (${issue.count})` : ""}
                </p>
              ))}
            </section>

            <div className="operations-grid">
              <section className="panel stack">
                <span className="muted text-xs">Hasil menunggu</span>
                <strong className="metric-value">
                  {health.data.scoring.pending || 0}
                </strong>
                <span className="muted text-xs">
                  {health.data.oldest_pending_seconds > 0
                    ? `Terlama ${Math.ceil(health.data.oldest_pending_seconds / 60)} menit`
                    : "Tidak ada antrean tertahan"}
                  {(health.data.overdue_ongoing_sessions ?? 0) > 0
                    ? ` · ${health.data.overdue_ongoing_sessions} sesi lewat tenggat`
                    : ""}
                </span>
              </section>

              <section className="panel stack">
                <span className="muted text-xs">Pembayaran perlu ditinjau</span>
                <strong className="metric-value">
                  {health.data.payment_events.review || 0}
                </strong>
                <Link
                  href="/admin/transactions"
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Buka transaksi →
                </Link>
              </section>

              <section className="panel stack">
                <div className="flex items-center justify-between gap-2">
                  <span className="muted text-xs">Worker &amp; penjadwal</span>
                  <AdminBadge tone={workerInfo.tone} dot>
                    {workerInfo.status}
                  </AdminBadge>
                </div>
                <strong className="text-base">{workerInfo.status}</strong>
                <span className="muted text-xs">
                  {workerInfo.detail}
                  {health.data.payment_worker_heartbeat_age_seconds !==
                    undefined && (
                    <>
                      {" · "}Pembayaran: {paymentWorkerInfo.status}
                    </>
                  )}
                </span>
              </section>

              <section className="panel stack">
                <span className="muted text-xs">Backup penting</span>
                <strong className="text-base">
                  {health.data.host?.backup?.database?.destination ===
                  "supabase"
                    ? "Supabase privat"
                    : health.data.host?.backup?.database
                      ? "Fallback lokal"
                      : "Belum terpantau"}
                </strong>
                <span className="muted text-xs">
                  {health.data.host
                    ? `${health.data.host.disk_free_gib} GB disk tersedia${
                        typeof backupAgeHours === "number"
                          ? ` · Backup ${backupAgeHours} jam lalu`
                          : ""
                      }`
                    : "Aktifkan timer operasi untuk status server dan backup."}
                </span>
              </section>
            </div>
          </>
        )
      )}

      <section className="panel stack">
        <h2>Pekerjaan yang belum selesai</h2>
        {queue.loading ? (
          <Loading />
        ) : queue.error ? (
          <ErrorPanel message={queue.error} retry={queue.reload} />
        ) : !queue.data?.items.length ? (
          <p className="muted text-sm">Tidak ada pekerjaan tertahan.</p>
        ) : (
          queue.data.items.map((job) => (
            <div className="history-row" key={job.id}>
              <div>
                <strong>
                  {job.kind === "scoring"
                    ? "Hasil latihan"
                    : "Notifikasi pembayaran"}
                </strong>
                <p className="muted text-xs">
                  {dateLabel(job.created_at)} · {job.attempts} kali diperiksa
                </p>
                <AdminBadge
                  tone={
                    job.status === "failed"
                      ? "danger"
                      : job.status === "review"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {job.status === "review"
                    ? "Perlu ditinjau"
                    : job.status === "failed"
                      ? "Terhenti"
                      : "Menunggu"}
                </AdminBadge>
                {job.last_error && (
                  <details className="mt-1.5">
                    <summary className="muted text-xs cursor-pointer">
                      Detail pemeriksaan
                    </summary>
                    <code className="text-xs">{job.last_error}</code>
                  </details>
                )}
              </div>
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => {
                  setError("");
                  setSelected(job);
                }}
              >
                Periksa ulang
              </button>
            </div>
          ))
        )}
      </section>

      <Modal
        open={!!selected}
        title="Periksa ulang pekerjaan?"
        onClose={() => !busy && setSelected(null)}
      >
        <p>
          Pekerjaan yang sama akan dijadwalkan ulang. Hasil dan akses Pro yang
          sudah diberikan tetap dilindungi dari pemrosesan ganda.
        </p>
        {error && <ErrorPanel message={error} />}
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={async () => {
            if (!selected) return;
            setBusy(true);
            setError("");
            try {
              const result = await api<{ message: string }>(
                `/admin/analytics/infrastructure/retry/${selected.kind}/${selected.id}`,
                { method: "POST" },
              );
              setNotice(result.message);
              setSelected(null);
              health.reload();
              queue.reload();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Pemeriksaan belum dapat dimulai.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Menjadwalkan…" : "Jadwalkan pemeriksaan"}
        </button>
      </Modal>
    </div>
  );
}
