"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  LayoutGrid,
  Sparkles,
  X,
} from "lucide-react";
import styles from "./home-preview.module.css";

type Segment = "TWK" | "TIU" | "TKP";

interface SampleQuestion {
  number: number;
  segment: Segment;
  topic: string;
  content: string;
  options: { label: string; content: string; score: number }[];
  discussion: string;
}

export type PreviewMode = "exam" | "review";

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    number: 1,
    segment: "TWK",
    topic: "Pancasila",
    content:
      "Musyawarah warga menghasilkan kebijakan yang turut melindungi kebutuhan kelompok minoritas. Sikap yang paling sesuai dengan pengamalan Pancasila adalah…",
    options: [
      {
        label: "A",
        content: "Mengabaikan hasil musyawarah karena prosesnya terlalu lama.",
        score: 0,
      },
      {
        label: "B",
        content:
          "Hanya menjalankan bagian yang menguntungkan kelompok mayoritas.",
        score: 0,
      },
      {
        label: "C",
        content:
          "Menerapkan keputusan bersama secara adil dan penuh tanggung jawab.",
        score: 5,
      },
      {
        label: "D",
        content: "Menunda pelaksanaan tanpa alasan yang jelas.",
        score: 0,
      },
      {
        label: "E",
        content:
          "Menyerahkan seluruh tanggung jawab hanya kepada ketua panitia.",
        score: 0,
      },
    ],
    discussion:
      "Pengamalan sila ke-4 dan ke-5 Pancasila menuntut setiap warga menghormati hasil musyawarah mufakat serta menerapkannya secara adil bagi seluruh pihak, termasuk kelompok minoritas.",
  },
  {
    number: 2,
    segment: "TIU",
    topic: "Numerik & Aljabar",
    content:
      "Jika x = 4, berapakah nilai dari (x² − 4) ÷ (√x + 1)?",
    options: [
      { label: "A", content: "2", score: 0 },
      { label: "B", content: "3", score: 0 },
      { label: "C", content: "4", score: 5 },
      { label: "D", content: "5", score: 0 },
      { label: "E", content: "6", score: 0 },
    ],
    discussion:
      "Substitusikan x = 4: pembilang x² − 4 = 16 − 4 = 12, sedangkan penyebut √4 + 1 = 2 + 1 = 3. Maka 12 ÷ 3 = 4.",
  },
  {
    number: 3,
    segment: "TKP",
    topic: "Pelayanan Publik",
    content:
      "Seorang warga datang menjelang loket ditutup dan kebingungan mengisi formulir layanan yang harus selesai hari itu. Langkah paling tepat yang Anda lakukan adalah…",
    options: [
      {
        label: "A",
        content: "Meminta warga pulang dan kembali lagi besok tanpa penjelasan.",
        score: 1,
      },
      {
        label: "B",
        content:
          "Memberikan formulir kosong dan menyuruhnya bertanya ke pengunjung lain.",
        score: 2,
      },
      {
        label: "C",
        content:
          "Menjelaskan istilah yang sulit dan memberi panduan tertulis untuk dibawa pulang.",
        score: 3,
      },
      {
        label: "D",
        content:
          "Menjelaskan langkah pengisian lalu mengarahkan ke petugas loket yang masih aktif.",
        score: 4,
      },
      {
        label: "E",
        content:
          "Mendampingi pengisian sesuai prosedur dengan ramah hingga pengajuan tuntas selama jam layanan masih memungkinkan.",
        score: 5,
      },
    ],
    discussion:
      "Pada TKP Pelayanan Publik, bobot tertinggi (5 poin) diberikan pada sikap proaktif, ramah, komunikatif, dan menuntaskan kebutuhan masyarakat selama masih sesuai prosedur dan jam layanan.",
  },
];

function sampleOutcome(q: SampleQuestion, picked?: string) {
  const max = Math.max(...q.options.map((o) => o.score));
  const selected = q.options.find((o) => o.label === picked);
  if (!selected) return { status: "blank" as const, max, selected: null };
  if (selected.score === max)
    return { status: "best" as const, max, selected };
  return {
    status: q.segment === "TKP" ? ("partial" as const) : ("wrong" as const),
    max,
    selected,
  };
}

export function ExamPreviewWindow({
  mode,
  onModeChange,
  index,
  onIndexChange,
  answers,
  onAnswer,
  doubts,
  onToggleDoubt,
  compact = false,
  borderless = false,
  hideFrameHeader = false,
}: {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  index: number;
  onIndexChange: (index: number) => void;
  answers: Record<number, string>;
  onAnswer: (questionNumber: number, label: string) => void;
  doubts: Record<number, boolean>;
  onToggleDoubt: (questionNumber: number) => void;
  compact?: boolean;
  borderless?: boolean;
  hideFrameHeader?: boolean;
}) {
  const q = SAMPLE_QUESTIONS[index];
  const picked = answers[q.number];
  const isDoubt = !!doubts[q.number];
  const outcome = sampleOutcome(q, picked);
  const answeredCount = Object.keys(answers).length;
  const isTkp = q.segment === "TKP";

  return (
    <div
      className={styles.frame}
      style={
        borderless
          ? { border: 0, borderRadius: 0, boxShadow: "none" }
          : undefined
      }
    >
      {!hideFrameHeader && (
        <div className={styles.frameHeader}>
          <div className={styles.frameBrand}>
            <span className={styles.frameBrandIcon}>
              <BookOpen size={16} aria-hidden="true" />
            </span>
            <span>TOCPNS</span>
            <span className={styles.frameStage}>
              · Preview {mode === "exam" ? "Ujian" : "Pembahasan"}
            </span>
          </div>
          {mode === "exam" && (
            <span className={styles.frameTimer} aria-label="Contoh timer ujian">
              <Clock3 size={15} aria-hidden="true" />
              99:42
            </span>
          )}
          <span className={styles.frameBadge}>Simulasi SKD</span>
        </div>
      )}

      <div
        className={styles.mobileTabs}
        style={compact ? { display: "flex" } : undefined}
        aria-label="Pilih contoh soal"
      >
        {SAMPLE_QUESTIONS.map((item, i) => (
          <button
            key={item.number}
            type="button"
            aria-current={i === index ? "step" : undefined}
            onClick={() => onIndexChange(i)}
          >
            {item.number} · {item.segment}
          </button>
        ))}
      </div>

      <div
        className={styles.frameBody}
        style={compact ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}
      >
        <article className={styles.questionCard}>
          <div className={styles.questionMeta}>
            <span className={styles.questionTitle}>
              <span className={styles.segmentPill}>{q.segment}</span>
              Soal {q.number} dari {SAMPLE_QUESTIONS.length} · {q.topic}
            </span>
            {mode === "exam" ? (
              <button
                type="button"
                className="button button-small button-secondary"
                aria-pressed={isDoubt}
                onClick={() => onToggleDoubt(q.number)}
              >
                <Flag size={14} aria-hidden="true" />
                {isDoubt ? "Ditandai ragu" : "Tandai ragu"}
              </button>
            ) : (
              <span
                className={`badge ${outcome.status === "best" ? "badge-green" : "badge-amber"}`}
              >
                {outcome.selected
                  ? `${outcome.selected.score} / ${outcome.max} poin`
                  : `Belum dijawab · maks ${outcome.max} poin`}
              </span>
            )}
          </div>

          <p className={styles.questionText}>{q.content}</p>

          <ul className={styles.options} aria-label={`Pilihan soal ${q.number}`}>
            {q.options.map((option) => {
              const isSelected = picked === option.label;
              const isBest = option.score === outcome.max;
              let state: string | undefined;
              if (mode === "exam") {
                if (isSelected) state = "selected";
              } else {
                if (isBest) state = "best";
                else if (isSelected) state = isTkp ? "partial" : "wrong";
              }
              return (
                <li key={option.label}>
                  <button
                    type="button"
                    className={styles.optionBtn}
                    data-state={state}
                    disabled={mode === "review"}
                    aria-pressed={mode === "exam" ? isSelected : undefined}
                    onClick={() => onAnswer(q.number, option.label)}
                  >
                    <span className={styles.letter}>{option.label}</span>
                    <span className={styles.optionBody}>
                      <span>{option.content}</span>
                      {mode === "review" && (isBest || isSelected) && (
                        <span className={styles.optionTags}>
                          {isBest && (
                            <span className={styles.optionTagBest}>
                              <Check size={13} aria-hidden="true" />
                              {isTkp ? "Bobot tertinggi" : "Jawaban benar"}
                            </span>
                          )}
                          {isSelected && (
                            <span className={styles.optionTagPicked}>
                              {!isBest && !isTkp && (
                                <X size={13} aria-hidden="true" />
                              )}
                              Pilihan kamu
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    {mode === "review" && (isTkp || isBest || isSelected) && (
                      <span className={styles.optionPoints}>
                        {option.score} poin
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {mode === "review" ? (
            <div className={styles.discussionBox}>
              <BookOpen
                size={18}
                color="var(--accent)"
                aria-hidden="true"
                style={{ marginTop: 2 }}
              />
              <div>
                <h3>Pembahasan soal</h3>
                <p>{q.discussion}</p>
              </div>
            </div>
          ) : (
            <div className={styles.statusRow}>
              {picked ? (
                <span className={styles.statusSaved}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Pilihan {picked} tersimpan di preview.
                </span>
              ) : (
                <span>Klik salah satu opsi A–E untuk mencoba.</span>
              )}
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => onModeChange("review")}
              >
                Lihat pembahasan
              </button>
            </div>
          )}

          <div className={styles.cardActions}>
            <button
              type="button"
              className="button button-small button-secondary"
              disabled={index === 0}
              onClick={() => onIndexChange(Math.max(0, index - 1))}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Sebelumnya
            </button>
            {index < SAMPLE_QUESTIONS.length - 1 ? (
              <button
                type="button"
                className="button button-small"
                onClick={() =>
                  onIndexChange(Math.min(SAMPLE_QUESTIONS.length - 1, index + 1))
                }
              >
                Soal berikutnya
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : mode === "exam" ? (
              <button
                type="button"
                className="button button-small"
                onClick={() => onModeChange("review")}
              >
                Cek pembahasan
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <Link className="button button-small" href="/catalog">
                Coba paket asli
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        </article>

        {!compact && (
          <aside className={styles.navCard} aria-label="Peta soal preview">
            <div className={styles.navHead}>
              <span>Daftar soal</span>
              <LayoutGrid size={16} aria-hidden="true" />
            </div>
            <p className={styles.navSub}>
              {answeredCount} dari {SAMPLE_QUESTIONS.length} contoh dijawab
            </p>
            <div className={styles.navTiles}>
              {SAMPLE_QUESTIONS.map((item, i) => {
                const tileOutcome = sampleOutcome(item, answers[item.number]);
                const status =
                  mode === "exam"
                    ? answers[item.number]
                      ? "saved"
                      : "blank"
                    : tileOutcome.status;
                return (
                  <button
                    key={item.number}
                    type="button"
                    className={styles.navTile}
                    aria-current={i === index ? "step" : undefined}
                    data-status={status}
                    data-doubt={mode === "exam" && !!doubts[item.number]}
                    onClick={() => onIndexChange(i)}
                  >
                    <strong>{item.number}</strong>
                    <span>{item.segment}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.navLegend}>
              {mode === "exam"
                ? "Hijau: dijawab · Kuning: ragu · Garis: soal aktif"
                : "Hijau: poin maksimal · Merah: salah · Kuning: sebagian"}
            </p>
            <div className={styles.navCta}>
              <p>
                Simulasi penuh terdiri dari 110 soal TWK, TIU, dan TKP dengan
                durasi 100 menit.
              </p>
              <Link className="button button-small" href="/catalog">
                Mulai paket gratis
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function HomeExamPreview() {
  const [mode, setMode] = useState<PreviewMode>("exam");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [doubts, setDoubts] = useState<Record<number, boolean>>({});

  return (
    <section
      className={styles.previewSection}
      aria-labelledby="exam-preview-title"
    >
      <div className={styles.previewHead}>
        <div className={styles.previewLead}>
          <p className="eyebrow">PREVIEW RUANG UJIAN</p>
          <h2 id="exam-preview-title">
            Coba langsung tampilannya sebelum daftar.
          </h2>
          <p className="muted">
            Pilih jawaban pada contoh soal TWK, TIU, dan TKP di bawah ini, lalu
            pindah ke mode Pembahasan untuk melihat penilaiannya.
          </p>
        </div>
        <div
          className={styles.modeSwitch}
          role="group"
          aria-label="Mode preview"
        >
          <button
            type="button"
            aria-pressed={mode === "exam"}
            onClick={() => setMode("exam")}
          >
            Mode Ujian
          </button>
          <button
            type="button"
            aria-pressed={mode === "review"}
            onClick={() => setMode("review")}
          >
            Mode Pembahasan
          </button>
        </div>
      </div>

      <div className={styles.haloFrame}>
        <div className={styles.haloRibbon}>
          <span className="inline" style={{ gap: 6 }}>
            <Sparkles size={14} aria-hidden="true" />
            Preview ruang ujian TOCPNS · klik opsi untuk mencoba
          </span>
          <span>Tanpa perlu login</span>
        </div>
        <div className={styles.haloInner}>
          <ExamPreviewWindow
            mode={mode}
            onModeChange={setMode}
            index={index}
            onIndexChange={setIndex}
            answers={answers}
            onAnswer={(num, label) =>
              setAnswers((prev) => ({ ...prev, [num]: label }))
            }
            doubts={doubts}
            onToggleDoubt={(num) =>
              setDoubts((prev) => ({ ...prev, [num]: !prev[num] }))
            }
            borderless
          />
        </div>
      </div>
    </section>
  );
}
