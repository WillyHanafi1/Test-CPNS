"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell, { Loading, ErrorPanel, Scores } from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import Modal from "@/components/Modal";
import { useExamStore } from "@/store/useExamStore";
type Result = {
  status: string;
  package_id: string;
  revision_id?: string | null;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  is_passed: boolean;
  passing_grades?: Record<string, number>;
  answers?: Record<string, string>;
};
type ReviewOption = {
  id: string;
  label: string;
  content: string;
  image_url?: string;
  score: number;
};
type ReviewQuestion = {
  id: string;
  number: number;
  content: string;
  image_url?: string;
  discussion?: string;
  segment: string;
  selected_option_id: string | null;
  options: ReviewOption[];
};
type Review = {
  session_id: string;
  revision_id?: string | null;
  package_title: string;
  questions: ReviewQuestion[];
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
};
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
    const t = setInterval(() => {
      if (Date.now() - started > 60000) {
        setSlow(true);
        clearInterval(t);
      } else reload();
    }, 2500);
    return () => clearInterval(t);
  }, [data?.status, reload, slow]);
  const done =
    data?.status === "finished" || data?.status === "already finished";
  return (
    <AppShell
      title="Hasil latihan"
      description="Pahami hasilmu, lalu tentukan langkah belajar berikutnya."
    >
      {unsubmittedCount > 0 && (
        <p className="notice notice-warning" role="status">
          {unsubmittedCount} pilihan terakhir dari tab ini belum tercatat saat
          ujian dikumpulkan. Hasil dihitung dari jawaban yang diterima server.
        </p>
      )}
      {authLoading || (!data && loading) ? (
        <Loading label="Memuat hasil latihan…" />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : !done ? (
        <section className="panel stack">
          <h2>
            {data?.status === "ongoing"
              ? "Ujian belum dikumpulkan."
              : "Jawaban sudah dikumpulkan."}
          </h2>
          <p className="muted">
            {data?.status === "ongoing"
              ? "Kembali ke sesi untuk melanjutkan atau mengumpulkan jawaban."
              : slow
                ? "Pemrosesan membutuhkan waktu lebih lama. Jawaban tetap tersimpan; kamu dapat memeriksa kembali melalui riwayat."
                : "Hasil sedang dihitung. Halaman ini akan diperbarui otomatis."}
          </p>
          <div className="inline">
            {data?.status === "ongoing" ? (
              <Link className="button" href={`/session/${id}`}>
                Kembali ke ujian
              </Link>
            ) : (
              <button
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
      ) : (
        data && (
          <div className="two-column">
            <section className="panel stack">
              <span
                className={`badge ${data.is_passed ? "badge-green" : "badge-amber"}`}
              >
                {data.is_passed
                  ? "Memenuhi ambang batas latihan"
                  : "Masih ada bagian yang perlu dilatih"}
              </span>
              <Scores scores={data} />
              <p className="muted">
                Hasil ini menggambarkan performa simulasi, bukan keputusan
                kelulusan seleksi resmi.
              </p>
              <Link className="button" href={`/session/${id}/review`}>
                Pelajari pembahasan →
              </Link>
            </section>
            <aside className="panel stack">
              <h2>Langkah berikutnya</h2>
              <p className="muted">
                Mulai dari jawaban yang salah, kosong, atau belum memperoleh
                poin maksimal. Pahami alasannya sebelum latihan berikutnya.
              </p>
              <p className="muted" style={{ fontSize: 13 }}>
                Acuan latihan:{" "}
                {Object.entries(
                  data.passing_grades || { TWK: 65, TIU: 80, TKP: 166 },
                )
                  .map(([key, value]) => `${key} ${value}`)
                  .join(" · ")}
                . Periksa ketentuan seleksi resmi yang berlaku untuk
                kebutuhanmu.
              </p>
              <Link
                className="button button-secondary"
                href={`/catalog/${data.package_id}`}
              >
                Latihan kembali
              </Link>
              <Link className="muted" href="/analytics">
                Lihat perkembangan & penguasaan topik →
              </Link>
              <Link
                className="muted"
                href={`/leaderboard?package_id=${encodeURIComponent(data.package_id)}${data.revision_id ? `&revision_id=${encodeURIComponent(data.revision_id)}` : ""}`}
              >
                Peringkat latihan paket ini →
              </Link>
              <Link className="muted" href="/history">
                Lihat semua riwayat
              </Link>
            </aside>
          </div>
        )
      )}
    </AppShell>
  );
}
export function ReviewView({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<Review>(
    `/exam/session/${id}/review`,
    !!user,
  );
  const [filter, setFilter] = useState("Semua");
  const [index, setIndex] = useState(0);
  const [report, setReport] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => {
    if (!authLoading && !user)
      router.replace(
        `/login?next=${encodeURIComponent(`/session/${id}/review`)}`,
      );
  }, [user, authLoading, id, router]);
  const items = (data?.questions || []).filter((q) => {
    const selected = q.options.find((o) => o.id === q.selected_option_id);
    const max = Math.max(...q.options.map((o) => o.score));
    return (
      filter === "Semua" ||
      (filter === "Kosong"
        ? !selected
        : filter === "Salah"
          ? q.segment !== "TKP" && !!selected && selected.score < max
          : q.segment === "TKP" && !!selected && selected.score < max)
    );
  });
  const q = items[Math.min(index, Math.max(0, items.length - 1))];
  const max = q ? Math.max(...q.options.map((o) => o.score)) : 0;
  return (
    <AppShell
      title="Pembahasan"
      description={data?.package_title}
      action={
        <Link
          className="button button-secondary"
          href={`/session/${id}/result`}
        >
          Kembali ke hasil
        </Link>
      }
    >
      {authLoading || loading ? (
        <Loading />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : (
        <>
          <div className="filters" aria-label="Filter pembahasan">
            {["Semua", "Salah", "Kosong", "TKP belum maksimal"].map((f) => (
              <button
                className="filter"
                key={f}
                aria-pressed={filter === f}
                onClick={() => {
                  setFilter(f);
                  setIndex(0);
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {!q ? (
            <div className="empty-state panel">
              <h2>Tidak ada soal pada pilihan ini.</h2>
              <p>Coba filter lain untuk melihat pembahasan.</p>
            </div>
          ) : (
            <div className="two-column">
              <article className="panel stack">
                <div className="between">
                  <span className="badge">
                    Soal {q.number} · {q.segment}
                  </span>
                  <span className="muted">
                    {index + 1} dari {items.length}
                  </span>
                </div>
                <div className="question-content" style={{ margin: "4px 0" }}>
                  <MarkdownRenderer>{q.content}</MarkdownRenderer>
                  {q.image_url && (
                    <button
                      aria-label="Perbesar gambar soal"
                      onClick={() => setZoom(q.image_url!)}
                    >
                      <img
                        className="diagram-image"
                        src={q.image_url}
                        alt="Diagram soal"
                      />
                    </button>
                  )}
                </div>
                <div className="answer-options">
                  {q.options.map((o) => (
                    <div
                      className="answer-option"
                      data-result={
                        o.score === max && max > 0
                          ? "best"
                          : o.id === q.selected_option_id
                            ? "selected"
                            : undefined
                      }
                      style={{
                        cursor: "default",
                      }}
                      key={o.id}
                    >
                      <span className="answer-letter">{o.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <MarkdownRenderer>{o.content}</MarkdownRenderer>
                        {o.image_url && (
                          <img
                            className="diagram-image"
                            src={o.image_url}
                            alt={`Gambar opsi ${o.label}`}
                          />
                        )}
                        <div className="inline" style={{ marginTop: 9 }}>
                          <span className="badge badge-neutral">
                            {o.score} poin
                          </span>
                          {o.id === q.selected_option_id && (
                            <span className="badge">Pilihanmu</span>
                          )}
                          {o.score === max && max > 0 && (
                            <span className="badge badge-green">
                              Poin maksimal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <section>
                  <h2 style={{ marginBottom: 15 }}>Alasan dan pembahasan</h2>
                  <div className="discussion">
                    <MarkdownRenderer>
                      {q.discussion ||
                        "Pembahasan belum tersedia untuk soal ini."}
                    </MarkdownRenderer>
                  </div>
                </section>
                <div className="exam-actions">
                  <button
                    className="button button-secondary"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => i - 1)}
                  >
                    Sebelumnya
                  </button>
                  <button
                    className="button"
                    disabled={index === items.length - 1}
                    onClick={() => {
                      setIndex((i) => i + 1);
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                  >
                    Berikutnya
                  </button>
                </div>
              </article>
              <aside className="panel stack">
                <h2>Pelajari satu per satu.</h2>
                <p className="muted">
                  Perhatikan alasan pemilihan jawaban dan perbedaan poin setiap
                  opsi. Gunakan filter untuk menentukan fokus belajarmu.
                </p>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setReport(true);
                    setSent(false);
                    setSendError("");
                    setMessage("");
                  }}
                >
                  Laporkan masalah soal
                </button>
                <Link className="muted" href="/history">
                  Kembali ke riwayat
                </Link>
              </aside>
            </div>
          )}
        </>
      )}
      <Modal
        open={report}
        title="Laporkan masalah soal"
        onClose={() => setReport(false)}
      >
        {sent ? (
          <p className="notice">
            Laporan terkirim. Terima kasih sudah membantu perbaikan konten.
          </p>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setSending(true);
              setSendError("");
              try {
                await api("/user/feedback", {
                  method: "POST",
                  body: JSON.stringify({
                    category: "correction",
                    content: `Soal ${q?.number}: ${message}`,
                    path_context: `/session/${id}/review?question=${q?.id}${data?.revision_id ? `&revision=${data.revision_id}` : ""}`,
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
              Konteks sesi dan soal {q?.number} akan disertakan.
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
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            {sendError && <ErrorPanel message={sendError} />}
            <button className="button" disabled={sending}>
              {sending ? "Mengirim…" : "Kirim laporan"}
            </button>
          </form>
        )}
      </Modal>
      <Modal open={!!zoom} title="Gambar soal" onClose={() => setZoom(null)}>
        {zoom && (
          <img className="diagram-image" src={zoom} alt="Diagram diperbesar" />
        )}
      </Modal>
    </AppShell>
  );
}
