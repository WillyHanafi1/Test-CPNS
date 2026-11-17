"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Flag,
  LayoutGrid,
  CheckCircle2,
  CloudOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  useExamStore,
  Attempt,
  flushAnswers,
  writerId,
} from "@/store/useExamStore";
import { Loading, ErrorPanel } from "@/components/AppShell";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import Modal from "@/components/Modal";
import ThemeToggle from "@/components/ThemeToggle";
export default function Runner({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const state = useExamStore();
  const ownerId = user?.id;
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== `${ownerId}:${id}`;
  const [error, setError] = useState("");
  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (!ownerId) {
      router.replace(`/login?next=${encodeURIComponent(`/session/${id}`)}`);
      return;
    }
    const controller = new AbortController();
    api<Attempt>(`/exam/session/${id}/state`, { signal: controller.signal })
      .then((data) => {
        if (data.status !== "ongoing") {
          router.replace(`/session/${id}/result`);
          return;
        }
        useExamStore.getState().initialize(ownerId, data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(`${ownerId}:${id}`);
      });
    return () => controller.abort();
  }, [id, ownerId, authLoading, router]);
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => useExamStore.getState().tick(), 1000);
    return () => clearInterval(t);
  }, [loading]);
  useEffect(() => {
    if (
      loading ||
      !ownerId ||
      state.ownerId !== ownerId ||
      state.sessionId !== id
    )
      return;
    const sync = () => {
      setOnline(navigator.onLine);
      void flushAnswers();
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const t = setInterval(sync, 3000);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [loading, ownerId, state.ownerId, state.sessionId, id]);
  useEffect(() => {
    if (!loading) void flushAnswers();
  }, [state.pending, loading]);
  useEffect(() => {
    if (loading || !ownerId) return;
    const sync = () => {
      if (document.visibilityState === "visible")
        api<Attempt>(`/exam/session/${id}/state`)
          .then((d) => {
            if (d.status !== "ongoing") router.replace(`/session/${id}/result`);
            else useExamStore.getState().initialize(ownerId, d);
          })
          .catch(() => {});
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [id, ownerId, loading, router]);
  const conflict =
    !loading && !!state.writerId && state.writerId !== writerId();
  const finish = useCallback(
    async (timeout = false) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      await flushAnswers();
      if (!timeout && Object.keys(useExamStore.getState().pending).length) {
        setError(
          "Ada jawaban yang belum terkirim. Pulihkan koneksi dan coba lagi sebelum waktu habis.",
        );
        submitting.current = false;
        setBusy(false);
        return;
      }
      try {
        await api(`/exam/finish/${id}`, { method: "POST" });
        useExamStore.setState({
          pending: {},
          saveError: "",
          isStarted: false,
          isFinished: true,
        });
        router.replace(`/session/${id}/result`);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Pengumpulan belum berhasil. Coba lagi.",
        );
        submitting.current = false;
        setBusy(false);
      }
    },
    [id, router],
  );
  useEffect(() => {
    if (
      !loading &&
      !conflict &&
      state.sessionId === id &&
      state.timeLeft === 0 &&
      !error
    ) {
      const timer = setTimeout(() => void finish(true), 0);
      return () => clearTimeout(timer);
    }
  }, [loading, state.timeLeft, state.sessionId, conflict, id, error, finish]);
  if (loading || authLoading)
    return (
      <div className="app-surface">
        <Loading label="Menyiapkan lembar ujian…" />
      </div>
    );
  if (!state.questions.length || state.sessionId !== id)
    return (
      <div className="app-surface">
        <main className="app-main">
          <ErrorPanel message={error || "Sesi tidak ditemukan."} />
          <Link className="button" href="/history">
            Kembali ke riwayat
          </Link>
        </main>
      </div>
    );
  const q = state.questions[state.currentIndex];
  const pending = Object.keys(state.pending).length;
  const answered = Object.keys(state.answers).length;
  const doubts = Object.values(state.doubtStatus).filter(Boolean).length;
  const clock = `${Math.floor(state.timeLeft / 60)
    .toString()
    .padStart(2, "0")}:${(state.timeLeft % 60).toString().padStart(2, "0")}`;
  const navigatorPanel = (
    <div className="stack">
      <p className="muted">
        {answered}/{state.questions.length} dijawab · {doubts} ragu
      </p>
      <div className="question-grid">
        {state.questions.map((question, i) => (
          <button
            key={question.id}
            aria-label={`Soal ${question.number}, ${state.answers[question.id] ? "dijawab" : "belum dijawab"}${state.doubtStatus[question.id] ? ", ragu-ragu" : ""}`}
            aria-current={i === state.currentIndex}
            data-answered={!!state.answers[question.id]}
            data-doubt={!!state.doubtStatus[question.id]}
            onClick={() => {
              state.setCurrentIndex(i);
              setNav(false);
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            {question.number}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Hijau: dijawab · Kuning: ragu · Indigo: soal aktif
      </p>
    </div>
  );
  return (
    <div className="app-surface">
      <header className="app-header">
        <div className="app-header-inner" style={{ maxWidth: 1440 }}>
          <div className="brand">
            <BookOpen size={20} />
            <span className="exam-brand-label">TOCPNS</span>
          </div>
          <div
            role="timer"
            aria-label="Sisa waktu"
            style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: 22,
              fontWeight: 650,
              color: state.timeLeft < 300 ? "var(--danger)" : undefined,
            }}
          >
            {clock}
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <button
              className="button button-small"
              disabled={busy || conflict}
              onClick={() => setConfirm(true)}
            >
              Selesai
            </button>
          </div>
        </div>
      </header>
      <main className="exam-layout">
        <div className="exam-reading stack">
          {error && <ErrorPanel message={error} />}{" "}
          {state.saveAuthRequired && (
            <div className="notice notice-warning">
              <p>
                Sesi masuk berakhir. Jawaban tertunda tetap ada di tab ini;
                waktu ujian tetap berjalan.
              </p>
              <Link
                className="button button-secondary"
                href={`/login?next=${encodeURIComponent(`/session/${id}`)}`}
              >
                Masuk kembali untuk menyimpan
              </Link>
            </div>
          )}
          {!online && (
            <div className="notice notice-warning">
              <CloudOff size={18} />
              Koneksi terputus. Waktu tetap berjalan; jawaban tertunda belum
              diterima server.
            </div>
          )}
          {conflict && (
            <div className="notice notice-warning">
              <p>Sesi sedang digunakan di tab/perangkat lain.</p>
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    const d = await api<Attempt>(`/exam/session/${id}/claim`, {
                      method: "POST",
                      body: JSON.stringify({ writer_id: writerId() }),
                    });
                    state.initialize(user!.id, d);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Belum dapat mengambil alih.",
                    );
                  }
                }}
              >
                Lanjutkan di sini
              </button>
            </div>
          )}
          <section className="panel">
            <div className="between">
              <span className="badge">
                Soal {q.number} · {q.segment}
              </span>
              <button
                className="button button-small button-secondary"
                aria-pressed={!!state.doubtStatus[q.id]}
                onClick={() => state.toggleDoubt(q.id)}
              >
                <Flag size={15} />
                {state.doubtStatus[q.id] ? "Ditandai ragu" : "Ragu-ragu"}
              </button>
            </div>
            <div className="question-content">
              <MarkdownRenderer>{q.content}</MarkdownRenderer>
              {q.image_url && (
                <button
                  aria-label="Perbesar gambar soal"
                  onClick={() => setZoom(q.image_url!)}
                >
                  <img
                    className="diagram-image"
                    src={q.image_url}
                    alt={`Diagram soal ${q.number}`}
                  />
                </button>
              )}
            </div>
            <fieldset
              disabled={conflict || busy || state.timeLeft === 0}
              className="answer-options"
            >
              <legend className="sr-only">Pilih satu jawaban</legend>
              {q.options.map((o) => (
                <label
                  className="answer-option"
                  key={o.id}
                  data-selected={state.answers[q.id] === o.id}
                >
                  <input
                    type="radio"
                    name={`answer-${q.id}`}
                    value={o.id}
                    checked={state.answers[q.id] === o.id}
                    onChange={() => state.selectOption(q.id, o.id)}
                    style={{ marginTop: 8, accentColor: "var(--accent-solid)" }}
                  />
                  <span className="answer-letter">{o.label}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <MarkdownRenderer>{o.content}</MarkdownRenderer>
                    {o.image_url && (
                      <img
                        className="diagram-image"
                        src={o.image_url}
                        alt={`Gambar pilihan ${o.label}`}
                      />
                    )}
                  </div>
                </label>
              ))}
            </fieldset>
            <div className="save-status" role="status">
              {state.saveError ? (
                <span style={{ color: "var(--warning)" }}>
                  {state.saveError} {pending} jawaban belum terkirim.
                </span>
              ) : pending ? (
                `${pending} jawaban sedang disimpan…`
              ) : (
                <span className="inline" style={{ gap: 6 }}>
                  <CheckCircle2 size={15} />
                  {answered
                    ? "Jawaban terkonfirmasi tersimpan."
                    : "Pilih jawaban untuk memulai."}
                </span>
              )}
            </div>
          </section>
          <div className="exam-actions">
            <button
              className="button button-secondary"
              disabled={state.currentIndex === 0}
              onClick={() => state.setCurrentIndex(state.currentIndex - 1)}
            >
              Sebelumnya
            </button>
            <button
              className="button button-secondary"
              onClick={() => setNav(true)}
              aria-label="Buka daftar soal"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className="button"
              disabled={state.currentIndex === state.questions.length - 1}
              onClick={() => state.setCurrentIndex(state.currentIndex + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
        <aside className="panel exam-navigator">
          <h2 style={{ marginBottom: 20 }}>Daftar soal</h2>
          {navigatorPanel}
        </aside>
      </main>
      <Modal open={nav} title="Daftar soal" onClose={() => setNav(false)}>
        {navigatorPanel}
      </Modal>
      <Modal
        open={confirm}
        title="Kumpulkan jawaban?"
        onClose={() => setConfirm(false)}
      >
        <p className="muted">
          {answered} dijawab · {state.questions.length - answered} kosong ·{" "}
          {doubts} ragu-ragu.
        </p>
        {pending > 0 && (
          <div className="notice notice-warning">
            {pending} jawaban masih menunggu konfirmasi.
          </div>
        )}
        <p>Setelah dikumpulkan, jawaban tidak dapat diubah.</p>
        <button
          className="button"
          disabled={busy || conflict}
          onClick={() => void finish()}
        >
          {busy ? "Mengumpulkan…" : "Ya, kumpulkan jawaban"}
        </button>
        {error && <ErrorPanel message={error} />}
      </Modal>
      <Modal open={!!zoom} title="Gambar soal" onClose={() => setZoom(null)}>
        {zoom && (
          <img
            className="diagram-image"
            src={zoom}
            alt="Diagram soal diperbesar"
          />
        )}
      </Modal>
    </div>
  );
}
