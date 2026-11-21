"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import { Loading, ErrorPanel } from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import { useExamStore } from "@/store/useExamStore";
import {
  ExamFrame,
  ExamText,
  ImageDialog,
  QuestionActions,
  QuestionImage,
  QuestionNavigator,
  ReviewChoices,
  reviewOutcome,
  segments,
  segmentNames,
  type ExamImage,
  type ReviewQuestion,
} from "./ExamLayout";
import { resolveExamShortcut } from "./shortcuts";
import styles from "./exam.module.css";

type Result = {
  status: string;
  package_id: string;
  package_title?: string | null;
  can_repeat?: boolean;
  revision_id?: string | null;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  is_passed: boolean;
  passing_grades?: Record<string, number>;
  answers?: Record<string, string>;
};

type Review = {
  revision_id?: string | null;
  package_title: string;
  questions: ReviewQuestion[];
};

const filters = [
  ["all", "Semua"],
  ["needs-review", "Perlu ditinjau"],
  ["wrong", "Salah"],
  ["blank", "Kosong"],
  ["partial", "TKP belum maksimal"],
] as const;
type ReviewFilter = (typeof filters)[number][0];

function matchFilter(question: ReviewQuestion, filter: ReviewFilter) {
  const { status } = reviewOutcome(question);
  return (
    filter === "all" ||
    (filter === "needs-review" ? status !== "best" : status === filter)
  );
}

export function ResultView({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;
  const pending = useExamStore(
    (state) =>
      state.ownerId === ownerId &&
      state.sessionId === id &&
      Object.keys(state.pending).length > 0,
  );
  const unsubmittedCount = useExamStore((state) =>
    state.ownerId === ownerId && state.sessionId === id
      ? state.unsubmittedCount
      : 0,
  );
  const attemptTitle = useExamStore((state) =>
    state.ownerId === ownerId && state.sessionId === id ? state.title : "",
  );
  const { data, error, loading, reload } = useResource<Result>(
    `/exam/result/${id}${pending ? "?include_answers=true" : ""}`,
    !!user,
  );
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (ownerId && data?.answers)
      useExamStore.getState().recordSubmission(ownerId, id, data.answers);
  }, [data?.answers, id, ownerId]);
  useEffect(() => {
    if (!authLoading && !user)
      router.replace(
        `/login?next=${encodeURIComponent(`/session/${id}/result`)}`,
      );
  }, [user, authLoading, id, router]);
  useEffect(() => {
    if (data?.status !== "processing" || slow) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 60000) {
        setSlow(true);
        clearInterval(timer);
      } else reload();
    }, 2500);
    return () => clearInterval(timer);
  }, [data?.status, reload, slow]);

  const waiting = authLoading || !user || (!data && loading);
  const done =
    data?.status === "finished" || data?.status === "already finished";
  const reviewUrl = `/session/${id}/review`;
  const title = data?.package_title || attemptTitle;
  return (
    <ExamFrame
      stage="Hasil"
      action={
        <Link
          className={`button button-small ${styles.headerAction}`}
          href="/history"
        >
          Riwayat
        </Link>
      }
    >
      <header className={styles.resultHeading}>
        <h1>Hasil latihan</h1>
        {title && <p>{title}</p>}
      </header>
      <div className="stack">
        {unsubmittedCount > 0 && (
          <p className="notice notice-warning" role="status">
            {unsubmittedCount} pilihan terakhir dari tab ini belum tercatat saat
            ujian dikumpulkan. Hasil dihitung dari jawaban yang diterima server.
          </p>
        )}
        {waiting ? (
          <Loading label="Memuat hasil latihan…" />
        ) : error ? (
          <ErrorPanel message={error} retry={reload} />
        ) : done && data ? (
          <>
            <section className={styles.resultHero} aria-label="Ringkasan nilai">
              <div>
                <p>Skor total</p>
                <strong>{data.total_score}</strong>
              </div>
              <span
                className={`badge ${data.is_passed ? "badge-green" : "badge-amber"}`}
              >
                {data.is_passed
                  ? "Mencapai ambang latihan"
                  : "Belum mencapai ambang latihan"}
              </span>
            </section>
            <div className={styles.scoreCards}>
              {segments.map((segment) => {
                const value = {
                  TWK: data.score_twk,
                  TIU: data.score_tiu,
                  TKP: data.score_tkp,
                }[segment];
                const target =
                  data.passing_grades?.[segment] ??
                  { TWK: 65, TIU: 80, TKP: 166 }[segment];
                return (
                  <section className={styles.scoreCard} key={segment}>
                    <h2>
                      {segment} · {segmentNames[segment]}
                    </h2>
                    <strong>{value}</strong>
                    <p data-met={value >= target}>Ambang latihan {target}</p>
                  </section>
                );
              })}
            </div>
            <div className="inline">
              <Link className="button" href={reviewUrl}>
                <BookOpen size={17} aria-hidden="true" /> Buka pembahasan
              </Link>
              <Link
                className="button button-secondary"
                href={`${reviewUrl}?filter=needs-review`}
              >
                Bahas yang perlu ditinjau{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {data.can_repeat && (
                <Link
                  className="button button-secondary"
                  href={`/catalog/${data.package_id}`}
                >
                  <RotateCcw size={16} aria-hidden="true" /> Ulangi ujian
                </Link>
              )}
            </div>
            <nav className={styles.resultLinks} aria-label="Lanjutan latihan">
              {!data.can_repeat && (
                <Link href={`/catalog/${data.package_id}`}>
                  Kembali ke paket
                </Link>
              )}
              <Link
                href={`/leaderboard?package_id=${encodeURIComponent(data.package_id)}${data.revision_id ? `&revision_id=${encodeURIComponent(data.revision_id)}` : ""}`}
              >
                Peringkat paket
              </Link>
              <Link href="/analytics">Perkembangan belajar</Link>
              <Link href="/history">Semua riwayat</Link>
            </nav>
            <p className="muted">
              Ambang ini berlaku untuk simulasi. Untuk seleksi resmi, ikuti
              aturan tahun dan formasi yang kamu lamar.
            </p>
          </>
        ) : (
          <section className="panel stack">
            <h2>
              {data?.status === "ongoing"
                ? "Ujian belum dikumpulkan"
                : "Jawaban sudah dikumpulkan"}
            </h2>
            <p className="muted">
              {data?.status === "ongoing"
                ? "Kembali ke sesi untuk melanjutkan ujian."
                : slow
                  ? "Pemrosesan membutuhkan waktu lebih lama. Jawaban tetap tersimpan dan hasil bisa diperiksa dari riwayat."
                  : "Nilai sedang dihitung. Hasil akan muncul otomatis."}
            </p>
            <div className="inline">
              {data?.status === "ongoing" ? (
                <Link className="button" href={`/session/${id}`}>
                  Kembali ke ujian
                </Link>
              ) : (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setSlow(false);
                    reload();
                  }}
                >
                  Periksa hasil
                </button>
              )}
              <Link className="button button-secondary" href="/history">
                Riwayat latihan
              </Link>
            </div>
          </section>
        )}
      </div>
    </ExamFrame>
  );
}

export function ReviewView({
  id,
  initialFilter,
  initialQuestion,
}: {
  id: string;
  initialFilter?: string;
  initialQuestion?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<Review>(
    `/exam/session/${id}/review`,
    !!user,
  );
  const [filter, setFilter] = useState<ReviewFilter>(
    () => filters.find(([key]) => key === initialFilter)?.[0] ?? "all",
  );
  const [active, setActive] = useState(initialQuestion);
  const [mapOpen, setMapOpen] = useState(false);
  const [reportQuestion, setReportQuestion] = useState<ReviewQuestion | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState<ExamImage | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!authLoading && !user) {
      const next = `/session/${id}/review${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user, authLoading, id, router]);

  const questions = data?.questions ?? [];
  const counts: Record<ReviewFilter, number> = {
    all: questions.length,
    "needs-review": 0,
    wrong: 0,
    blank: 0,
    partial: 0,
  };
  for (const question of questions) {
    const { status: outcome } = reviewOutcome(question);
    if (outcome !== "best") counts["needs-review"] += 1;
    if (outcome === "wrong") counts.wrong += 1;
    else if (outcome === "blank") counts.blank += 1;
    else if (outcome === "partial") counts.partial += 1;
  }
  const items = questions.filter((question) => matchFilter(question, filter));
  const q = items.find((question) => question.id === active) ?? items[0];
  const index = items.findIndex((question) => question.id === q?.id);
  const status = q && reviewOutcome(q);

  const goTo = useCallback((questionId: string) => {
    setActive(questionId);
    setMapOpen(false);
    requestAnimationFrame(() => heading.current?.focus());
  }, []);

  useEffect(() => {
    if (authLoading || !user || loading || mapOpen || !!reportQuestion || !!zoom)
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveExamShortcut(event);
      if (!action) return;
      if (action.type === "prev" && index > 0) {
        event.preventDefault();
        goTo(items[index - 1].id);
      } else if (action.type === "next" && index >= 0 && index < items.length - 1) {
        event.preventDefault();
        goTo(items[index + 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    authLoading,
    user,
    loading,
    mapOpen,
    reportQuestion,
    zoom,
    index,
    items,
    goTo,
  ]);

  function openReport(question: ReviewQuestion) {
    setReportQuestion(question);
    setMessage("");
    setSent(false);
    setSendError("");
  }

  const navigator = q && (
    <QuestionNavigator
      items={items.map((question) => ({
        id: question.id,
        number: question.number,
        segment: question.segment,
        status: reviewOutcome(question).status,
      }))}
      active={q.id}
      current={`${items.length} dari ${questions.length} soal`}
      onSelect={goTo}
      review
    />
  );

  return (
    <ExamFrame
      stage="Pembahasan"
      action={
        <Link
          className={`button button-small ${styles.headerAction}`}
          href={`/session/${id}/result`}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Kembali ke hasil
        </Link>
      }
    >
      <header className={styles.context}>
        <h1>Pembahasan</h1>
        {data?.package_title && <p>{data.package_title}</p>}
      </header>
      {authLoading || !user || loading ? (
        <Loading label="Memuat pembahasan…" />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : (
        <>
          <div className={styles.reviewBar}>
            <div
              className="filters"
              role="group"
              aria-label="Filter pembahasan"
            >
              {filters.map(([key, name]) => (
                <button
                  type="button"
                  className="filter"
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {name}
                  <span className={styles.filterCount}>{counts[key]}</span>
                </button>
              ))}
            </div>
            <p className="muted">{items.length} soal</p>
          </div>
          {q && status ? (
            <div className={styles.workspace}>
              <article
                className={styles.question}
                aria-labelledby="review-question"
              >
                <header className={styles.questionMeta}>
                  <h2
                    className={styles.questionLabel}
                    id="review-question"
                    ref={heading}
                    tabIndex={-1}
                  >
                    <strong>{q.segment}</strong> Soal {q.number} dari{" "}
                    {questions.length}
                  </h2>
                  <span
                    className={styles.reviewPoints}
                    data-status={status.status}
                  >
                    {!status.selected ? "Belum dijawab · " : ""}
                    {status.selected?.score ?? 0} / {status.max} poin
                  </span>
                </header>
                <div className={styles.prompt}>
                  <ExamText>{q.content}</ExamText>
                  {q.image_url && (
                    <QuestionImage
                      image={{
                        src: q.image_url,
                        label: `Gambar soal ${q.number}`,
                      }}
                      onZoom={setZoom}
                    />
                  )}
                </div>
                <ReviewChoices question={q} zoom={setZoom} />
                <section
                  className={styles.discussion}
                  aria-labelledby="discussion-title"
                >
                  <span className={styles.discussionIcon}>
                    <BookOpen size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 id="discussion-title">Pembahasan soal</h3>
                    <ExamText>
                      {q.discussion ||
                        "Pembahasan belum tersedia untuk soal ini."}
                    </ExamText>
                  </div>
                </section>
                <p className={styles.saveStatus}>
                  <button
                    type="button"
                    className="button button-small button-secondary"
                    onClick={() => openReport(q)}
                  >
                    Laporkan masalah soal
                  </button>
                </p>
                <QuestionActions
                  previous={
                    index > 0 ? () => goTo(items[index - 1].id) : undefined
                  }
                  next={
                    index < items.length - 1
                      ? () => goTo(items[index + 1].id)
                      : undefined
                  }
                  openMap={() => setMapOpen(true)}
                />
              </article>
              <aside className={styles.navigator}>
                <div className={styles.navHeading}>
                  <h2>Daftar soal</h2>
                  <LayoutGrid size={18} aria-hidden="true" />
                </div>
                {navigator}
              </aside>
            </div>
          ) : (
            <section className="panel stack">
              <h2>Tidak ada soal untuk filter ini</h2>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setFilter("all")}
              >
                Tampilkan semua soal
              </button>
            </section>
          )}
        </>
      )}
      <Modal
        open={mapOpen}
        title="Daftar soal"
        onClose={() => setMapOpen(false)}
      >
        {mapOpen && navigator}
      </Modal>
      <Modal
        open={!!reportQuestion}
        title="Laporkan masalah soal"
        onClose={() => setReportQuestion(null)}
      >
        {sent ? (
          <p className="notice">
            Laporan terkirim. Terima kasih sudah membantu perbaikan soal.
          </p>
        ) : (
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!reportQuestion) return;
              setSending(true);
              setSendError("");
              try {
                await api("/user/feedback", {
                  method: "POST",
                  body: JSON.stringify({
                    category: "correction",
                    content: `Soal ${reportQuestion.number}: ${message}`,
                    path_context: `/session/${id}/review?question=${reportQuestion.id}${data?.revision_id ? `&revision=${data.revision_id}` : ""}`,
                  }),
                });
                setSent(true);
              } catch (e) {
                setSendError(
                  e instanceof Error ? e.message : "Laporan belum terkirim.",
                );
              } finally {
                setSending(false);
              }
            }}
          >
            <p className="muted">
              Konteks sesi dan soal {reportQuestion?.number} akan disertakan.
            </p>
            <label className="field">
              Apa yang perlu diperiksa?
              <textarea
                className="input"
                minLength={10}
                maxLength={3000}
                required
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            {sendError && <ErrorPanel message={sendError} />}
            <button type="submit" className="button" disabled={sending}>
              {sending ? "Mengirim…" : "Kirim laporan"}
            </button>
          </form>
        )}
      </Modal>
      <ImageDialog image={zoom} close={() => setZoom(null)} />
    </ExamFrame>
  );
}
