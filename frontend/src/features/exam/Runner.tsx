"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Flag,
  LayoutGrid,
  CheckCircle2,
  CloudOff,
  Clock3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import {
  useExamStore,
  Attempt,
  flushAnswers,
  writerId,
} from "@/store/useExamStore";
import { Loading, ErrorPanel } from "@/components/AppShell";
import Modal from "@/components/Modal";
import {
  AnswerChoices,
  ExamFrame,
  ExamText,
  ImageDialog,
  QuestionActions,
  QuestionImage,
  QuestionNavigator,
  type ExamImage,
  type NavigatorItem,
} from "./ExamLayout";
import { resolveExamShortcut } from "./shortcuts";
import styles from "./exam.module.css";
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
  const [storageWarning, setStorageWarning] = useState(false);
  const [zoom, setZoom] = useState<ExamImage | null>(null);
  const submitting = useRef(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const refreshAttempt = useCallback(
    async (signal?: AbortSignal) => {
      if (!ownerId) return;
      const data = await api<Attempt>(`/exam/session/${id}/state`, { signal });
      if (signal?.aborted || submitting.current) return;
      if (data.status !== "ongoing") router.replace(`/session/${id}/result`);
      else useExamStore.getState().initialize(ownerId, data);
    },
    [id, ownerId, router],
  );
  useEffect(() => {
    const unavailable = () => setStorageWarning(true);
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (Object.keys(useExamStore.getState().pending).length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("exam-storage-unavailable", unavailable);
    window.addEventListener("beforeunload", beforeLeave);
    return () => {
      window.removeEventListener("exam-storage-unavailable", unavailable);
      window.removeEventListener("beforeunload", beforeLeave);
    };
  }, []);
  useEffect(() => {
    if (authLoading) return;
    if (!ownerId) {
      router.replace(`/login?next=${encodeURIComponent(`/session/${id}`)}`);
      return;
    }
    const controller = new AbortController();
    refreshAttempt(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(`${ownerId}:${id}`);
      });
    return () => controller.abort();
  }, [id, ownerId, authLoading, router, refreshAttempt]);
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
    const controller = new AbortController();
    const sync = () => {
      if (document.visibilityState === "visible")
        void refreshAttempt(controller.signal).catch(() => {});
    };
    document.addEventListener("visibilitychange", sync);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ownerId, loading, refreshAttempt]);
  const conflict =
    !loading && !!state.writerId && state.writerId !== writerId();
  const finish = useCallback(
    async (mode: "manual" | "deadline", submitSavedOnly = false) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      let submitted = false;
      let needsRefresh = false;
      try {
        if (mode === "manual" && !submitSavedOnly) await flushAnswers();
        const current = useExamStore.getState();
        if (current.sessionId !== id || current.ownerId !== ownerId) return;
        if (
          mode === "manual" &&
          !submitSavedOnly &&
          Object.keys(current.pending).length
        ) {
          setError(
            "Ada jawaban yang belum terkirim. Pulihkan koneksi sebelum waktu habis.",
          );
          return;
        }
        await api(`/exam/finish/${id}`, {
          method: "POST",
          body: JSON.stringify({
            mode,
            writer_id: writerId(),
            writer_epoch: current.writerEpoch,
          }),
        });
        submitted = true;
        useExamStore.setState({
          saveError: "",
          isStarted: false,
          isFinished: true,
        });
        router.replace(`/session/${id}/result`);
      } catch (e) {
        needsRefresh =
          e instanceof ApiError &&
          ["writer_conflict", "deadline_not_reached"].includes(e.code);
        if (!(e instanceof ApiError && e.code === "deadline_not_reached"))
          setError(
            e instanceof Error
              ? e.message
              : "Pengumpulan belum berhasil. Coba lagi.",
          );
      } finally {
        if (!submitted) {
          submitting.current = false;
          setBusy(false);
          if (needsRefresh) void refreshAttempt().catch(() => {});
        }
      }
    },
    [id, ownerId, refreshAttempt, router],
  );
  useEffect(() => {
    if (
      loading ||
      conflict ||
      !online ||
      !state.isStarted ||
      state.sessionId !== id ||
      state.timeLeft !== 0
    )
      return;
    const submitExpired = () => {
      if (navigator.onLine) void finish("deadline");
    };
    const first = setTimeout(submitExpired, 0);
    const retry = setInterval(submitExpired, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(retry);
    };
  }, [
    loading,
    state.timeLeft,
    state.sessionId,
    state.isStarted,
    conflict,
    online,
    id,
    finish,
  ]);
  const goTo = useCallback((index: number) => {
    useExamStore.getState().setCurrentIndex(index);
    setNav(false);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }, []);
  useEffect(() => {
    if (loading || authLoading || nav || confirm || !!zoom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const current = useExamStore.getState();
      if (
        !current.questions.length ||
        current.sessionId !== id ||
        current.ownerId !== ownerId
      )
        return;
      const action = resolveExamShortcut(event);
      if (!action) return;
      const activeQuestion = current.questions[current.currentIndex];
      if (!activeQuestion) return;

      if (action.type === "prev") {
        if (current.currentIndex > 0) {
          event.preventDefault();
          goTo(current.currentIndex - 1);
        }
        return;
      }
      if (action.type === "next") {
        if (current.currentIndex < current.questions.length - 1) {
          event.preventDefault();
          goTo(current.currentIndex + 1);
        }
        return;
      }
      if (conflict || busy || current.timeLeft === 0) return;
      if (action.type === "doubt") {
        event.preventDefault();
        current.toggleDoubt(activeQuestion.id);
        return;
      }
      if (action.type === "select") {
        const option = activeQuestion.options[action.index];
        if (!option) return;
        event.preventDefault();
        current.selectOption(activeQuestion.id, option.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, authLoading, nav, confirm, zoom, id, ownerId, conflict, busy, goTo]);
  if (loading || authLoading)
    return (
      <ExamFrame stage="Ujian">
        <Loading label="Menyiapkan lembar ujian…" />
      </ExamFrame>
    );
  if (
    !state.questions.length ||
    state.sessionId !== id ||
    state.ownerId !== ownerId
  )
    return (
      <ExamFrame stage="Ujian">
        <div className="stack">
          <ErrorPanel message={error || "Sesi tidak ditemukan."} />
          <Link className="button button-secondary" href="/history">
            Kembali ke riwayat
          </Link>
        </div>
      </ExamFrame>
    );

  const question = state.questions[state.currentIndex];
  const pending = Object.keys(state.pending).length;
  const answered = Object.keys(state.answers).length;
  const doubts = Object.values(state.doubtStatus).filter(Boolean).length;
  const total = state.questions.length;
  const confirmed = Math.max(0, answered - pending);
  const clock = `${String(Math.floor(state.timeLeft / 60)).padStart(2, "0")}:${String(state.timeLeft % 60).padStart(2, "0")}`;
  const canFinish = !busy && !conflict;
  const items: NavigatorItem[] = state.questions.map((item) => ({
    id: item.id,
    number: item.number,
    segment: item.segment,
    status: state.pending[item.id]
      ? "pending"
      : state.answers[item.id]
        ? "saved"
        : "blank",
    flagged: state.doubtStatus[item.id],
  }));

  function requestFinish() {
    if (!canFinish) return;
    setNav(false);
    if (state.timeLeft === 0) void finish("deadline");
    else setConfirm(true);
  }

  const progress = `${confirmed} dari ${total} tersimpan${doubts ? ` · ${doubts} ragu` : ""}`;
  const renderNavigator = (action?: React.ReactNode) => (
    <QuestionNavigator
      items={items}
      active={question.id}
      current={progress}
      onSelect={(questionId) =>
        goTo(state.questions.findIndex((item) => item.id === questionId))
      }
      action={action}
    />
  );

  return (
    <ExamFrame
      stage="Ujian"
      timer={
        <div
          className={styles.timer}
          data-urgent={state.timeLeft < 300}
          role="timer"
          aria-label="Sisa waktu"
        >
          <Clock3 size={18} aria-hidden="true" />
          {clock}
        </div>
      }
      action={
        <button
          type="button"
          className={`button button-small ${styles.headerAction}`}
          disabled={!canFinish}
          onClick={requestFinish}
        >
          {state.timeLeft === 0 ? "Periksa pengumpulan" : "Selesai"}
        </button>
      }
    >
      <header className={styles.context}>
        <h1>{state.title}</h1>
      </header>
      <div className={styles.workspace}>
        <div className="stack">
          {storageWarning && (
            <p className="notice notice-warning" role="status">
              Penyimpanan browser tidak tersedia. Tetap buka halaman ini sampai
              semua jawaban tersimpan ke server.
            </p>
          )}
          {error && !confirm && <ErrorPanel message={error} />}
          {state.saveAuthRequired && (
            <div className="notice notice-warning">
              <p>
                Sesi masuk berakhir. Jawaban tertunda tetap ada di tab ini.
                Waktu ujian tetap berjalan.
              </p>
              <Link
                className="button button-secondary"
                href={`/login?next=${encodeURIComponent(`/session/${id}`)}`}
              >
                Masuk kembali untuk menyimpan
              </Link>
            </div>
          )}
          {state.timeLeft === 0 ? (
            <p className="notice" role="status">
              Waktu ujian sudah habis.{" "}
              {online
                ? "Sistem sedang mengonfirmasi jawaban yang diterima."
                : "Sambungkan kembali untuk melihat status pengumpulan."}
            </p>
          ) : (
            !online && (
              <div className="notice notice-warning">
                <CloudOff size={18} aria-hidden="true" /> Koneksi terputus.
                Waktu tetap berjalan. Jawaban tertunda belum diterima server.
              </div>
            )
          )}
          {conflict && (
            <div className="notice notice-warning">
              <p>Sesi sedang digunakan di tab atau perangkat lain.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={async () => {
                  if (!ownerId) return;
                  try {
                    const attempt = await api<Attempt>(
                      `/exam/session/${id}/claim`,
                      {
                        method: "POST",
                        body: JSON.stringify({ writer_id: writerId() }),
                      },
                    );
                    state.initialize(ownerId, attempt);
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
          <article className={styles.question} aria-labelledby="exam-question">
            <header className={styles.questionMeta}>
              <h2
                className={styles.questionLabel}
                id="exam-question"
                ref={questionHeading}
                tabIndex={-1}
              >
                <strong>{question.segment}</strong> Soal {question.number} dari{" "}
                {total}
              </h2>
              <button
                type="button"
                className={`button button-small button-secondary ${styles.flag}`}
                aria-pressed={!!state.doubtStatus[question.id]}
                onClick={() => state.toggleDoubt(question.id)}
              >
                <Flag size={15} aria-hidden="true" />{" "}
                {state.doubtStatus[question.id]
                  ? "Ditandai ragu"
                  : "Tandai ragu"}
              </button>
            </header>
            <div className={styles.prompt}>
              <ExamText>{question.content}</ExamText>
              {question.image_url && (
                <QuestionImage
                  image={{
                    src: question.image_url,
                    label: `Gambar soal ${question.number}`,
                  }}
                  onZoom={setZoom}
                />
              )}
            </div>
            <AnswerChoices
              question={question}
              selected={state.answers[question.id]}
              disabled={conflict || busy || state.timeLeft === 0}
              choose={(option) => state.selectOption(question.id, option)}
              zoom={setZoom}
            />
            <p
              className={styles.saveStatus}
              data-warning={!!state.saveError}
              role="status"
            >
              {state.saveError ? (
                `${state.saveError} ${pending} jawaban belum terkirim.`
              ) : pending ? (
                `${pending} jawaban sedang disimpan…`
              ) : answered ? (
                <>
                  <CheckCircle2 size={15} aria-hidden="true" /> Semua jawaban
                  terkonfirmasi tersimpan.
                </>
              ) : (
                "Pilih satu jawaban."
              )}
            </p>
            <QuestionActions
              previous={
                state.currentIndex > 0
                  ? () => goTo(state.currentIndex - 1)
                  : undefined
              }
              next={
                state.currentIndex < total - 1
                  ? () => goTo(state.currentIndex + 1)
                  : undefined
              }
              openMap={() => setNav(true)}
              finish={
                state.currentIndex === total - 1 && canFinish
                  ? requestFinish
                  : undefined
              }
            />
            <p className={styles.shortcutHint}>
              Pintasan keyboard: <kbd>A</kbd>–<kbd>E</kbd> atau <kbd>1</kbd>–
              <kbd>5</kbd> pilih jawaban · <kbd>←</kbd>/<kbd>→</kbd> pindah soal
              · <kbd>R</kbd> tandai ragu
            </p>
          </article>
        </div>
        <aside className={styles.navigator}>
          <div className={styles.navHeading}>
            <h2>Daftar soal</h2>
            <LayoutGrid size={18} aria-hidden="true" />
          </div>
          {renderNavigator(
            <button
              type="button"
              className={`button button-secondary ${styles.mapFinish}`}
              disabled={!canFinish}
              onClick={requestFinish}
            >
              {state.timeLeft === 0 ? "Periksa pengumpulan" : "Kumpulkan ujian"}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </button>,
          )}
        </aside>
      </div>
      <Modal open={nav} title="Daftar soal" onClose={() => setNav(false)}>
        {nav && renderNavigator()}
      </Modal>
      <Modal
        open={confirm}
        title="Kumpulkan jawaban?"
        onClose={() => setConfirm(false)}
      >
        <p className="muted">
          {answered} dijawab · {total - answered} kosong · {doubts} ragu.
        </p>
        {pending > 0 && (
          <p className="notice notice-warning">
            {pending} jawaban masih menunggu konfirmasi.
          </p>
        )}
        <p>Setelah dikumpulkan, jawaban tidak dapat diubah.</p>
        <div className="inline">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setConfirm(false)}
            disabled={busy}
          >
            Lanjut mengerjakan
          </button>
          <button
            type="button"
            className="button"
            disabled={!canFinish}
            onClick={() =>
              void finish(state.timeLeft === 0 ? "deadline" : "manual")
            }
          >
            {busy ? "Mengumpulkan…" : "Ya, kumpulkan jawaban"}
          </button>
        </div>
        {pending > 0 && online && state.timeLeft > 0 && (
          <button
            type="button"
            className="button button-secondary"
            disabled={!canFinish}
            onClick={() => void finish("manual", true)}
          >
            Kumpulkan jawaban yang sudah tersimpan
          </button>
        )}
        {error && <ErrorPanel message={error} />}
      </Modal>
      <ImageDialog image={zoom} close={() => setZoom(null)} />
    </ExamFrame>
  );
}
