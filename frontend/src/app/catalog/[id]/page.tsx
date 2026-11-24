"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  Sparkles,
} from "lucide-react";
import AppShell, { ErrorPanel, Loading } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { api, ApiError, dateLabel, type PackageInfo } from "@/lib/api";
import { writerId } from "@/store/useExamStore";
import styles from "@/features/exam/exam.module.css";

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    data: pack,
    error,
    loading,
    reload,
  } = useResource<PackageInfo>(`/packages/${id}`);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [activeSession, setActiveSession] = useState<string | null>(null);

  async function start() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/catalog/${id}`)}`);
      return;
    }
    setStarting(true);
    setStartError("");
    setActiveSession(null);
    try {
      const data = await api<{ session_id: string }>(
        `/exam/start/${id}?writer_id=${encodeURIComponent(writerId())}`,
        { method: "POST" },
      );
      router.push(`/session/${encodeURIComponent(data.session_id)}`);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.code === "active_session" ? e.detail : null;
      if (
        detail &&
        typeof detail === "object" &&
        "session_id" in detail &&
        typeof detail.session_id === "string"
      ) {
        setActiveSession(detail.session_id);
      }
      setStartError(
        e instanceof Error ? e.message : "Belum dapat memulai latihan.",
      );
      setStarting(false);
    }
  }

  if (loading || authLoading)
    return (
      <AppShell>
        <Loading label="Menyiapkan paket…" />
      </AppShell>
    );
  if (error || !pack)
    return (
      <AppShell>
        <ErrorPanel
          message={error || "Paket tidak ditemukan."}
          retry={reload}
        />
      </AppShell>
    );

  const session = pack.session_id && `/session/${pack.session_id}`;
  const continuing = !!session && pack.user_status === "ongoing";
  const processing = !!session && pack.user_status === "processing";
  const finished = !!session && pack.user_status === "finished";
  const used =
    pack.access_reason === "already_completed" || (pack.is_weekly && finished);
  const availability =
    pack.access_reason === "upcoming"
      ? "Tryout belum dibuka."
      : pack.access_reason === "expired"
        ? "Jadwal tryout sudah berakhir."
        : pack.access_reason === "unavailable"
          ? "Paket ini sedang tidak tersedia."
          : !pack.is_ready
            ? "Paket sedang dipersiapkan. Silakan pilih paket lain."
            : null;

  let primary;
  if (continuing) {
    primary = (
      <Link className="button" href={session}>
        Lanjutkan ujian <ArrowRight size={16} aria-hidden="true" />
      </Link>
    );
  } else if (processing || (used && session)) {
    primary = (
      <Link className="button" href={`${session}/result`}>
        {processing ? "Periksa hasil" : "Lihat hasil latihan"}{" "}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    );
  } else if (availability || used) {
    primary = (
      <p className="notice">
        {availability ??
          "Percobaan tryout ini sudah digunakan. Lihat hasilnya di riwayat latihan."}
      </p>
    );
  } else if (user && pack.is_premium && !user.is_pro) {
    primary = (
      <Link className="button" href="/catalog/upgrade">
        Upgrade ke Pro <ArrowRight size={16} aria-hidden="true" />
      </Link>
    );
  } else {
    primary = (
      <button
        type="button"
        className="button"
        disabled={starting}
        onClick={start}
      >
        {starting
          ? "Menyiapkan sesi…"
          : !user
            ? "Masuk untuk mulai"
            : finished
              ? "Mulai ujian ulang"
              : "Mulai ujian"}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <AppShell>
      <Link className="inline muted" href="/catalog">
        <ArrowLeft size={16} aria-hidden="true" /> Semua paket
      </Link>
      <div className={`stack ${styles.prepareCard}`}>
        <div className="inline">
          <span className="badge">
            {pack.is_weekly ? "Tryout terjadwal" : "Simulasi SKD"}
          </span>
          <span className={`badge ${pack.is_premium ? "" : "badge-green"}`}>
            {pack.is_premium
              ? user?.is_pro
                ? "Termasuk Pro"
                : "Paket Pro"
              : "Gratis"}
          </span>
        </div>
        <h1>{pack.title}</h1>
        {pack.description && <p className="muted">{pack.description}</p>}
        <div className={styles.prepareStats}>
          <span>
            <FileText size={17} aria-hidden="true" /> {pack.question_count} soal
          </span>
          <span>
            <Clock3 size={17} aria-hidden="true" /> {pack.duration_minutes}{" "}
            menit
          </span>
          <span>
            <BookOpen size={17} aria-hidden="true" /> TWK, TIU, TKP
          </span>
        </div>
        <p className="muted">
          <Sparkles size={17} aria-hidden="true" className="inline-block" />{" "}
          Latihan SKD dengan soal penalaran (HOTS) dan pembahasan.
        </p>
        {pack.is_weekly && (
          <p className="muted">
            Satu percobaan per peserta.{" "}
            {pack.start_at && `Dibuka ${dateLabel(pack.start_at)}.`}{" "}
            {pack.end_at && `Berakhir ${dateLabel(pack.end_at)}.`}
          </p>
        )}
        {continuing ? (
          <p className="muted">
            Lanjutkan dari sesi yang sudah dimulai. Waktu tetap mengikuti
            tenggat sesi itu.
          </p>
        ) : processing ? (
          <p className="muted">
            Jawaban sudah dikumpulkan. Hasil akan tersedia setelah penilaian
            selesai.
          </p>
        ) : (
          !used &&
          !availability && (
            <div className="stack">
              <h2>Sebelum mulai</h2>
              <p className="muted">
                Timer dimulai saat ujian dibuka dan tetap berjalan jika halaman
                ditutup atau koneksi terputus. Hanya jawaban yang diterima
                server sebelum tenggat yang dinilai.
              </p>
              <p className="muted">
                Kamu bisa lompat nomor dan menandai soal yang masih ragu. Hasil
                dan pembahasan tersedia setelah ujian selesai.
              </p>
            </div>
          )
        )}
        {startError && <ErrorPanel message={startError} />}
        {activeSession && (
          <Link
            className="button button-secondary"
            href={`/session/${encodeURIComponent(activeSession)}`}
          >
            Lanjutkan ujian yang aktif
          </Link>
        )}
        <div className="inline">
          {primary}
          {finished && !used && (
            <Link
              className="button button-secondary"
              href={`${session}/result`}
            >
              Lihat hasil sebelumnya
            </Link>
          )}
        </div>
      </div>
      <div className="inline">
        <Link
          className="muted"
          href={`/leaderboard?package_id=${encodeURIComponent(pack.id)}`}
        >
          Lihat peringkat paket ini
        </Link>
      </div>
      <p className="muted mt-3 text-sm">
        Acuan simulasi kebutuhan umum adalah KepmenPANRB Nomor 321 Tahun 2024.
        Periksa aturan resmi sesuai tahun dan formasi yang kamu lamar.
      </p>
    </AppShell>
  );
}
