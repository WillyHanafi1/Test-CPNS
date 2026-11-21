"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ExamPreviewWindow,
  SAMPLE_QUESTIONS,
  type PreviewMode,
} from "@/components/HomeExamPreview";
import previewStyles from "@/components/home-preview.module.css";
import { PREVIEW_VARIANTS } from "./variants";
import styles from "./studio.module.css";

const DEMO_STATS = [
  { id: "questions", value: "764", label: "Soal SKD & pembahasan" },
  { id: "packages", value: "8", label: "Paket simulasi terbit" },
  { id: "sessions", value: "70", label: "Sesi latihan selesai" },
];

export default function HomePreviewStudio() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = Number(params.get("v") || "1");
  const activeNumber =
    Number.isInteger(requested) &&
    requested >= 1 &&
    requested <= PREVIEW_VARIANTS.length
      ? requested
      : 1;
  const variant = PREVIEW_VARIANTS[activeNumber - 1];

  const [mode, setMode] = useState<PreviewMode>("exam");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [doubts, setDoubts] = useState<Record<number, boolean>>({});

  function selectVariant(num: number) {
    const safe = Math.min(PREVIEW_VARIANTS.length, Math.max(1, num));
    router.replace(`/beranda/desain?v=${safe}`, { scroll: false });
  }

  const sharedProps = {
    mode,
    onModeChange: setMode,
    index,
    onIndexChange: setIndex,
    answers,
    onAnswer: (num: number, label: string) =>
      setAnswers((prev) => ({ ...prev, [num]: label })),
    doubts,
    onToggleDoubt: (num: number) =>
      setDoubts((prev) => ({ ...prev, [num]: !prev[num] })),
  };

  const defaultHeading = (
    <div className={styles.sectionHead}>
      <div className={styles.sectionLead}>
        <p className="eyebrow">PRATINJAU RUANG UJIAN</p>
        <h2 id="exam-preview-title">
          Coba langsung tampilannya sebelum daftar.
        </h2>
        <p className="muted">
          Pilih jawaban pada contoh soal TWK, TIU, dan TKP di bawah ini, lalu
          pindah ke mode Pembahasan untuk melihat penilaiannya.
        </p>
      </div>
      <div className={styles.modeToggle} role="group" aria-label="Mode pratinjau">
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
  );

  function renderVariant() {
    switch (variant.number) {
      case 1:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v1Window}>
              <div className={styles.v1Chrome}>
                <div className={styles.v1Dots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.v1Url}>
                  <Lock size={11} aria-hidden="true" />
                  tocpns.my.id/session/contoh-skd
                </div>
                <span className={styles.v1Pill}>Pratinjau</span>
              </div>
              <ExamPreviewWindow {...sharedProps} borderless />
            </div>
          </section>
        );

      case 2:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v2Outer}>
              <div className={styles.v2Top}>
                <span className={styles.v2Label}>
                  <span className={styles.v2Pulse} aria-hidden="true" />
                  Pratinjau interaktif · klik opsi untuk mencoba
                </span>
                <span>3 contoh soal (TWK, TIU, TKP)</span>
              </div>
              <div className={styles.v2Inner}>
                <ExamPreviewWindow {...sharedProps} borderless />
              </div>
            </div>
          </section>
        );

      case 3:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v3Frame}>
              <span className={`${styles.v3Corner} ${styles.v3TL}`} aria-hidden="true">+</span>
              <span className={`${styles.v3Corner} ${styles.v3TR}`} aria-hidden="true">+</span>
              <span className={`${styles.v3Corner} ${styles.v3BL}`} aria-hidden="true">+</span>
              <span className={`${styles.v3Corner} ${styles.v3BR}`} aria-hidden="true">+</span>
              <span className={styles.v3Badge}>Contoh interaktif · Bisa diklik</span>
              <ExamPreviewWindow {...sharedProps} />
            </div>
          </section>
        );

      case 4:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v4Stage}>
              <div className={styles.v4Header}>
                <span className={styles.v4Chip}>
                  <Eye size={13} aria-hidden="true" />
                  Kanvas pratinjau ruang ujian
                </span>
                <span>Data pratinjau lokal · tanpa login</span>
              </div>
              <ExamPreviewWindow {...sharedProps} />
            </div>
          </section>
        );

      case 5:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v5Device}>
              <div className={styles.v5Camera}>
                <span className={styles.v5CameraDot} aria-hidden="true" />
                <span>Tampilan layar simulasi TOCPNS</span>
              </div>
              <div className={styles.v5Screen}>
                <ExamPreviewWindow {...sharedProps} borderless />
              </div>
              <div className={styles.v5HomeBar} aria-hidden="true" />
            </div>
          </section>
        );

      case 6:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            <div className={styles.v6Box}>
              <div className={styles.v6Side}>
                <span className="badge">Pratinjau interaktif</span>
                <h2 id="exam-preview-title">
                  Lihat langsung ruang ujian & pembahasannya.
                </h2>
                <p className="muted">
                  Bukan sekadar tangkapan layar. Kamu bisa langsung mencoba
                  memilih jawaban A–E dan membandingkan tampilannya dengan mode
                  Pembahasan.
                </p>
                <div
                  className={styles.modeToggle}
                  role="group"
                  aria-label="Mode pratinjau"
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
                <ul className="check-list muted" style={{ fontSize: 14 }}>
                  <li>
                    <Check size={17} />
                    <span>3 contoh: TWK, TIU, dan TKP berbobot 1–5</span>
                  </li>
                  <li>
                    <Check size={17} />
                    <span>Mendukung tema terang & gelap secara otomatis</span>
                  </li>
                  <li>
                    <Check size={17} />
                    <span>Simulasi asli berisi 110 soal berdurasi 100 menit</span>
                  </li>
                </ul>
                <Link className="button button-small" href="/catalog">
                  Coba paket gratis
                  <ArrowRight size={15} />
                </Link>
              </div>
              <div className={styles.v6Screen}>
                <ExamPreviewWindow {...sharedProps} compact borderless />
              </div>
            </div>
          </section>
        );

      case 7:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            <div className={styles.sectionLead} style={{ marginBottom: 18 }}>
              <p className="eyebrow">PRATINJAU RUANG UJIAN</p>
              <h2 id="exam-preview-title">
                Coba langsung tampilannya sebelum daftar.
              </h2>
            </div>
            <div className={styles.v7Shell}>
              <div className={styles.v7TabBar}>
                <div
                  className={styles.v7Tabs}
                  role="group"
                  aria-label="Tab mode pratinjau"
                >
                  <button
                    type="button"
                    className={styles.v7Tab}
                    aria-pressed={mode === "exam"}
                    onClick={() => setMode("exam")}
                  >
                    Mode Ujian
                  </button>
                  <button
                    type="button"
                    className={styles.v7Tab}
                    aria-pressed={mode === "review"}
                    onClick={() => setMode("review")}
                  >
                    Mode Pembahasan
                  </button>
                </div>
                <span className={styles.v7Note}>
                  Contoh interaktif · 3 soal SKD (TWK, TIU, TKP)
                </span>
              </div>
              <ExamPreviewWindow {...sharedProps} borderless />
            </div>
          </section>
        );

      case 8:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v8Halo}>
              <div className={styles.v8Ribbon}>
                <span className="inline" style={{ gap: 6 }}>
                  <Sparkles size={14} aria-hidden="true" />
                  Contoh ruang ujian TOCPNS · klik opsi untuk mencoba
                </span>
                <span>Tanpa perlu login</span>
              </div>
              <div className={styles.v8Inner}>
                <ExamPreviewWindow {...sharedProps} borderless />
              </div>
            </div>
          </section>
        );

      case 9:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            {defaultHeading}
            <div className={styles.v9Shell}>
              <div className={styles.v9Inner}>
                <ExamPreviewWindow {...sharedProps} borderless />
                <div className={styles.v9Footer}>
                  <span>
                    Mode pratinjau lokal · Jawaban contoh tidak disimpan ke akun.
                  </span>
                  <Link
                    href="/catalog"
                    style={{ color: "var(--accent)", fontWeight: 600 }}
                  >
                    Siap coba 110 soal penuh? Buka paket gratis →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );

      case 10:
      default:
        return (
          <section className={styles.sectionWrap} aria-labelledby="exam-preview-title">
            <div className={styles.sectionLead} style={{ marginBottom: 20 }}>
              <p className="eyebrow">PRATINJAU RUANG UJIAN</p>
              <h2 id="exam-preview-title">
                Coba langsung tampilannya sebelum daftar.
              </h2>
              <p className="muted">
                Tampilan contoh diringkas di tengah panggung agar tetap tenang
                dan jelas terpisah dari halaman beranda.
              </p>
            </div>
            <div className={styles.v10Stage}>
              <div className={styles.v10Center}>
                <div className={styles.v10StepStrip}>
                  <div className={styles.v10Steps} aria-label="Pilih contoh soal">
                    {SAMPLE_QUESTIONS.map((item, i) => (
                      <button
                        key={item.number}
                        type="button"
                        className={styles.v10StepBtn}
                        aria-current={i === index ? "step" : undefined}
                        onClick={() => setIndex(i)}
                      >
                        0{item.number} · {item.segment}
                      </button>
                    ))}
                  </div>
                  <div
                    className={styles.modeToggle}
                    role="group"
                    aria-label="Mode pratinjau"
                  >
                    <button
                      type="button"
                      aria-pressed={mode === "exam"}
                      onClick={() => setMode("exam")}
                    >
                      Ujian
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === "review"}
                      onClick={() => setMode("review")}
                    >
                      Pembahasan
                    </button>
                  </div>
                </div>
                <ExamPreviewWindow {...sharedProps} compact borderless />
              </div>
            </div>
          </section>
        );
    }
  }

  return (
    <>
      <div className={styles.studioBar} role="region" aria-label="Studio desain bingkai pratinjau">
        <div className={styles.studioBarInner}>
          <div className={styles.studioTop}>
            <div className={styles.studioMeta}>
              <span className={styles.studioTag}>
                Studio Lokal · {String(variant.number).padStart(2, "0")}/10
              </span>
              <span className={styles.studioName}>{variant.name}</span>
              <span className={styles.studioRef}>({variant.styleRef})</span>
            </div>
            <div className="inline">
              <button
                type="button"
                className="button button-small button-secondary"
                disabled={variant.number <= 1}
                onClick={() => selectVariant(variant.number - 1)}
              >
                <ArrowLeft size={14} /> Sebelumnya
              </button>
              <button
                type="button"
                className="button button-small button-secondary"
                disabled={variant.number >= PREVIEW_VARIANTS.length}
                onClick={() => selectVariant(variant.number + 1)}
              >
                Berikutnya <ArrowRight size={14} />
              </button>
              <ThemeToggle />
              <Link className="button button-small button-secondary" href="/">
                Beranda asli
              </Link>
            </div>
          </div>
          <p className={styles.studioDesc}>{variant.description}</p>
          <nav className={styles.studioPills} aria-label="Pilih 10 variasi bingkai">
            {PREVIEW_VARIANTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.studioPill}
                aria-current={item.number === variant.number ? "page" : undefined}
                onClick={() => selectVariant(item.number)}
              >
                <span>{String(item.number).padStart(2, "0")}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <AppShell>
        <section className="hero-home">
          <div>
            <span className="badge hero-label">Ruang latihan CPNS</span>
            <h1 style={{ marginTop: 24 }}>
              Latihan terarah.
              <br />
              <span style={{ color: "var(--accent)" }}>Langkah lebih yakin.</span>
            </h1>
            <p className="muted">
              Latihan SKD dengan simulasi CAT. Lihat nilai TWK, TIU, dan TKP, lalu
              pelajari pembahasan setelah ujian.
            </p>
            <div className="inline">
              <Link className="button" href="/catalog">
                Coba paket gratis
                <ArrowRight size={17} />
              </Link>
              <Link className="button button-secondary" href="/catalog/upgrade">
                Lihat TOCPNS Pro
              </Link>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Bisa digunakan di ponsel dan komputer.
            </p>
          </div>
          <section className="hero-art" aria-labelledby="cara-berlatih">
            <div className="panel stack">
              <BookOpen aria-hidden="true" color="var(--accent)" size={30} />
              <h2 id="cara-berlatih">Cara berlatih</h2>
              <ol className="hero-steps" role="list">
                {[
                  "Pilih paket soal",
                  "Kerjakan simulasi soal dengan waktu terukur",
                  "Tinjau jawabanmu",
                ].map((text, i) => (
                  <li key={text}>
                    <span className="badge" aria-hidden="true">0{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <div className="notice hero-note">
                <CheckCircle2 aria-hidden="true" size={19} />
                <span>Minim distraksi. Latihan lebih terarah. Persiapan lebih matang.</span>
              </div>
            </div>
          </section>
        </section>

        <section
          className={previewStyles.trustStrip}
          aria-label="Ringkasan data platform (contoh)"
        >
          {DEMO_STATS.map((item) => (
            <div className={previewStyles.trustItem} key={item.id}>
              <strong className={previewStyles.trustValue}>{item.value}</strong>
              <span className={previewStyles.trustLabel}>{item.label}</span>
            </div>
          ))}
        </section>

        {renderVariant()}

        <section className="package-grid" style={{ margin: "25px 0 55px" }}>
          {[
            [
              "Simulasi CAT",
              "Pantau sisa waktu dan pindah antarsoal dengan mudah. Jawabanmu tersimpan otomatis saat berlatih.",
            ],
            [
              "Pembahasan dan evaluasi",
              "Lihat poin tiap jawaban dan topik yang perlu kamu latih lagi.",
            ],
            [
              "Akses paket Pro",
              "Kerjakan semua paket yang tersedia selama keanggotaan Pro aktif.",
            ],
          ].map(([title, description]) => (
            <article className="panel stack" key={title}>
              <Check size={21} color="var(--accent)" />
              <h2>{title}</h2>
              <p className="muted">{description}</p>
            </article>
          ))}
        </section>
      </AppShell>
    </>
  );
}
