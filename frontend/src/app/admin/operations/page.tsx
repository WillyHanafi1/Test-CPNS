"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { useResource } from "@/lib/useResource";
import { api, dateLabel } from "@/lib/api";
import { ErrorPanel, Loading } from "@/components/AppShell";
import Modal from "@/components/Modal";

type Health = {
  status: string;
  observed_at: string;
  scoring: Record<string, number>;
  payment_events: Record<string, number>;
  worker_heartbeat_age_seconds: number | null;
  oldest_pending_seconds: number;
  issues: { code: string; message: string; count?: number }[];
  host?: {
    disk_free_gib: number;
    backup?: Record<string, { destination?: string; age_hours?: number }>;
  } | null;
};
type Job = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  created_at: string;
  last_error: string | null;
};

export default function Operations() {
  const health = useResource<Health>("/admin/analytics/infrastructure");
  const queue = useResource<{ items: Job[] }>(
    "/admin/analytics/infrastructure/queue",
  );
  const [selected, setSelected] = useState<Job | null>(null);
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
  return (
    <div className="stack">
      <div className="between page-heading">
        <div>
          <p className="eyebrow">OPERASI</p>
          <h1>Kesehatan layanan</h1>
          <p className="muted">
            Periksa antrean, pembayaran, dan backup dari satu tempat.
          </p>
        </div>
        <button
          className="button button-secondary"
          disabled={health.refreshing}
          onClick={() => {
            health.reload();
            queue.reload();
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {health.refreshing ? "Memperbarui…" : "Perbarui"}
        </button>
      </div>
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
              <p className="muted">
                Diperbarui{" "}
                {new Date(health.data.observed_at).toLocaleTimeString("id-ID")}{" "}
                · pemeriksaan otomatis setiap 30 detik saat halaman terbuka.
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
                <span className="muted">Hasil menunggu</span>
                <strong className="metric-value">
                  {health.data.scoring.pending || 0}
                </strong>
                <span className="muted">
                  {health.data.oldest_pending_seconds > 0
                    ? `Terlama ${Math.ceil(health.data.oldest_pending_seconds / 60)} menit`
                    : "Tidak ada antrean tertahan"}
                </span>
              </section>
              <section className="panel stack">
                <span className="muted">Pembayaran perlu ditinjau</span>
                <strong className="metric-value">
                  {health.data.payment_events.review || 0}
                </strong>
                <Link href="/admin/transactions">Buka transaksi →</Link>
              </section>
              <section className="panel stack">
                <span className="muted">Worker dan penjadwal</span>
                <strong>
                  {health.data.worker_heartbeat_age_seconds === null
                    ? "Belum terpantau"
                    : health.data.worker_heartbeat_age_seconds < 150
                      ? "Terhubung"
                      : "Perlu diperiksa"}
                </strong>
                <span className="muted">
                  {health.data.worker_heartbeat_age_seconds === null
                    ? "Aktifkan worker dan Beat pada rilis ini."
                    : `Kabar terakhir ${health.data.worker_heartbeat_age_seconds} detik lalu`}
                </span>
              </section>
              <section className="panel stack">
                <span className="muted">Backup penting</span>
                <strong>
                  {health.data.host?.backup?.database?.destination ===
                  "supabase"
                    ? "Supabase privat"
                    : health.data.host?.backup?.database
                      ? "Fallback lokal"
                      : "Belum terpantau"}
                </strong>
                <span className="muted">
                  {health.data.host
                    ? `${health.data.host.disk_free_gib} GB disk tersedia`
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
          <p className="muted">Tidak ada pekerjaan tertahan.</p>
        ) : (
          queue.data.items.map((job) => (
            <div className="history-row" key={job.id}>
              <div>
                <strong>
                  {job.kind === "scoring"
                    ? "Hasil latihan"
                    : "Notifikasi pembayaran"}
                </strong>
                <p className="muted">
                  {dateLabel(job.created_at)} · {job.attempts} kali diperiksa
                </p>
                <span className="badge badge-neutral">
                  {job.status === "review"
                    ? "Perlu ditinjau"
                    : job.status === "failed"
                      ? "Terhenti"
                      : "Menunggu"}
                </span>
                {job.last_error && (
                  <details>
                    <summary className="muted">Detail pemeriksaan</summary>
                    <code>{job.last_error}</code>
                  </details>
                )}
              </div>
              <button
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
