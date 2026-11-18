"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Check, Clock3, FileText, ArrowRight } from "lucide-react";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { api, PackageInfo, dateLabel } from "@/lib/api";
export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    data: p,
    error,
    loading,
    reload,
  } = useResource<PackageInfo>(`/packages/${id}`);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  async function start() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/catalog/${id}`)}`);
      return;
    }
    setStarting(true);
    setStartError("");
    try {
      let writer = sessionStorage.getItem("exam_writer");
      if (!writer) {
        writer = crypto.randomUUID();
        sessionStorage.setItem("exam_writer", writer);
      }
      const data = await api<{ session_id: string }>(
        `/exam/start/${id}?writer_id=${writer}`,
        { method: "POST" },
      );
      router.push(`/session/${data.session_id}`);
    } catch (e) {
      setStartError(
        e instanceof Error ? e.message : "Belum dapat memulai latihan.",
      );
      setStarting(false);
    }
  }
  return (
    <AppShell>
      {loading ? (
        <Loading />
      ) : error || !p ? (
        <ErrorPanel
          message={error || "Paket tidak ditemukan."}
          retry={reload}
        />
      ) : (
        <>
          <Link className="muted" href="/catalog">
            ← Semua paket
          </Link>
          <div className="page-heading" style={{ marginTop: 24 }}>
            <div>
              <span className="badge">
                {p.is_weekly ? "Tryout terjadwal" : "Simulasi SKD"}
              </span>
              <h1 style={{ marginTop: 16 }}>{p.title}</h1>
            </div>
          </div>
          <div className="two-column">
            <section className="panel stack">
              <h2>Latihan dengan fokus.</h2>
              <p className="muted">
                Kerjakan soal sesuai waktu yang tersedia. Setelah selesai, lihat
                nilai TWK, TIU, dan TKP, lalu pelajari pembahasannya.
              </p>
              <ul className="check-list">
                {[
                  "Timer dimulai setelah menekan Mulai ujian.",
                  "Jawaban tersimpan setelah mendapat konfirmasi server.",
                  "Waktu tetap berjalan jika halaman ditutup atau koneksi terputus.",
                  "Jawaban yang belum terkirim sebelum waktu habis tidak ikut dinilai.",
                  "Pembahasan tersedia sesudah ujian selesai.",
                ].map((t) => (
                  <li key={t}>
                    <Check size={18} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ fontSize: 13 }}>
                Simulasi adalah sarana latihan. Hasilnya bukan keputusan
                kelulusan seleksi resmi.
              </p>
            </section>
            <aside className="panel stack">
              <span className={`badge ${!p.is_premium ? "badge-green" : ""}`}>
                {p.is_premium
                  ? user?.is_pro
                    ? "Termasuk keanggotaan"
                    : "Termasuk Pro"
                  : "Paket gratis"}
              </span>
              <h2>Persiapan ujian</h2>
              {p.is_weekly && (
                <p className="muted">
                  Satu percobaan per peserta.{" "}
                  {p.start_at && `Dibuka ${dateLabel(p.start_at)}.`}{" "}
                  {p.end_at && `Berakhir ${dateLabel(p.end_at)}.`}
                </p>
              )}
              <div className="between">
                <span className="inline muted">
                  <FileText size={17} />
                  Jumlah soal
                </span>
                <strong>{p.question_count}</strong>
              </div>
              <div className="between">
                <span className="inline muted">
                  <Clock3 size={17} />
                  Durasi
                </span>
                <strong>{p.duration_minutes} menit</strong>
              </div>
              {startError && <ErrorPanel message={startError} />}
              {p.user_status === "ongoing" && p.session_id ? (
                <Link className="button" href={`/session/${p.session_id}`}>
                  Lanjutkan ujian
                  <ArrowRight size={16} />
                </Link>
              ) : ["upcoming", "expired", "already_completed"].includes(
                  p.access_reason || "",
                ) ? (
                <div className="notice">
                  {p.access_reason === "upcoming"
                    ? "Tryout belum dibuka. Kembali sesuai jadwal."
                    : p.access_reason === "already_completed"
                      ? "Percobaan tryout ini sudah digunakan. Hasil dan pembahasan tetap tersedia."
                      : "Jadwal tryout sudah berakhir."}
                </div>
              ) : !p.is_ready ? (
                <div className="notice notice-warning">
                  Paket sedang dipersiapkan. Silakan pilih paket lain.
                </div>
              ) : user && p.is_premium && !user.is_pro ? (
                <Link className="button" href="/catalog/upgrade">
                  Lihat keanggotaan Pro
                </Link>
              ) : (
                <button className="button" disabled={starting} onClick={start}>
                  {starting
                    ? "Menyiapkan sesi…"
                    : !user
                      ? "Masuk untuk mulai"
                      : "Mulai ujian"}
                  <ArrowRight size={16} />
                </button>
              )}
              {p.user_status === "finished" && p.session_id && (
                <Link
                  className="button button-secondary"
                  href={`/session/${p.session_id}/result`}
                >
                  Lihat hasil sebelumnya
                </Link>
              )}
              <Link
                className="muted"
                style={{ fontSize: 13 }}
                href={`/leaderboard?package_id=${encodeURIComponent(p.id)}`}
              >
                Lihat peringkat paket ini →
              </Link>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
