"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, Circle, Clock3,
  Flag, Grid2X2, RotateCcw, ScanLine, X, ZoomIn,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import {
  designs, exampleAnswers, outcome, segmentNames, segments,
  type Answers, type ExamPackage, type Mode, type Question, type Segment,
} from "./model";
import styles from "./studio.module.css";

const thresholds = { TWK: 65, TIU: 80, TKP: 166 };
const modes: { id: Mode; label: string }[] = [
  { id: "ujian", label: "Ujian" },
  { id: "hasil", label: "Hasil" },
  { id: "pembahasan", label: "Pembahasan" },
];
const filters = [
  { id: "all", name: "Semua" },
  { id: "not-best", name: "Perlu ditinjau" },
  { id: "blank", name: "Kosong" },
] as const;
type Filter = (typeof filters)[number]["id"];
type Picture = { src: string; label: string };
const mathSample = [
  "Rumus sebaris: $x = \\frac{\\sqrt{b^2-4ac}}{2a}$.",
  "",
  "Rumus blok:",
  "",
  "$$",
  "\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}, \\quad \\sum_{i=1}^{n} i^3 = \\left(\\frac{n(n+1)}{2}\\right)^2, \\quad \\sqrt{a^2+b^2+c^2}",
  "$$",
].join("\n");

function Sheet({ open, title, close, children, drawer = false }: {
  open: boolean;
  title: string;
  close: () => void;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className={styles.dialog} data-drawer={drawer} aria-labelledby={titleId} onClose={close}>
      <header className={styles.dialogHead}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.iconButton} onClick={close} aria-label="Tutup">
          <X size={20} />
        </button>
      </header>
      {open && children}
    </dialog>
  );
}

const Text = memo(function Text({ children }: { children: string }) {
  return <div className={styles.richText}><MarkdownRenderer>{children}</MarkdownRenderer></div>;
});

function Diagram({ picture, enlarge, small = false }: {
  picture: Picture;
  enlarge?: (picture: Picture) => void;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className={styles.mediaFallback}>Gambar belum dapat dimuat.</p>
  ) : (
    <div className={styles.diagram} data-small={small}>
      {/* Source diagrams have varying aspect ratios and may be hosted by the package. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={picture.src} alt={picture.label} onError={() => setFailed(true)} />
      {enlarge && <button type="button" className={styles.iconButton} onClick={() => enlarge(picture)} aria-label={`Perbesar ${picture.label.toLowerCase()}`} title="Perbesar gambar">
        <ZoomIn size={18} />
      </button>}
    </div>
  );
}

function QuestionMap({ questions, current, answers, flags, review, grouped, rail, jump }: {
  questions: Question[];
  current: number;
  answers: Answers;
  flags: Set<number>;
  review: boolean;
  grouped: boolean;
  rail: boolean;
  jump: (number: number) => void;
}) {
  const section = questions.find((item) => item.number === current)?.segment ?? questions[0]?.segment ?? "TWK";
  const [tab, setTab] = useState<Segment | null>(null);
  const shown = tab ?? section;
  const sources = grouped ? segments : [shown];
  const active = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const groups = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrapper = rail ? track.current : groups.current;
    if (!active.current || !wrapper) return;
    const viewport = wrapper.getBoundingClientRect();
    const button = active.current.getBoundingClientRect();
    if (rail) {
      wrapper.scrollLeft += button.left - viewport.left - (viewport.width - button.width) / 2;
    } else if (button.top < viewport.top || button.bottom > viewport.bottom) {
      wrapper.scrollTop += button.top - viewport.top - (viewport.height - button.height) / 2;
    }
  }, [current, rail, shown]);

  return <nav aria-label="Navigator soal">
    {!grouped && <div className={styles.segmentTabs} aria-label="Segmen soal">
      {segments.map((item) => <button key={item} type="button" aria-pressed={shown === item} onClick={() => setTab(item)}>{item}</button>)}
    </div>}
    <div className={styles.mapGroups} data-rail={rail} ref={groups}>
      {sources.map((segment) => {
        const entries = questions.filter((item) => item.segment === segment);
        if (entries.length === 0) return null;
        return <section key={segment} aria-label={segmentNames[segment]} className={styles.mapGroup}>
          {grouped && <h3>{segment} <span>{entries.length}</span></h3>}
          <div className={styles.mapGrid} data-rail={rail} ref={rail ? track : undefined}>
            {entries.map((item) => {
              const status = outcome(item, answers);
              const marked = flags.has(item.number);
              const kind = !status.selection ? "blank" : !review ? "answered" : status.best ? "correct" : status.score ? "partial" : "wrong";
              const label = { blank: "kosong", answered: "dijawab", correct: "bobot maksimal", partial: "bobot sebagian", wrong: "salah" }[kind];
              const selected = item.number === current;
              return <button type="button" key={item.number} ref={selected ? active : undefined} data-kind={kind}
                aria-current={selected ? "step" : undefined} aria-label={`Soal ${item.number}, ${label}${marked ? ", ditandai ragu" : ""}`}
                title={`Soal ${item.number}, ${label}${marked ? ", ragu" : ""}`}
                onClick={() => { setTab(null); jump(item.number); }}>
                {item.number}
                {marked && <Flag className={styles.tileFlag} size={10} aria-hidden="true" />}
                {kind === "wrong" ? <X className={styles.tileMark} size={10} aria-hidden="true" />
                  : kind === "partial" ? <Circle className={styles.tileMark} size={8} aria-hidden="true" />
                  : kind !== "blank" && <Check className={styles.tileMark} size={10} aria-hidden="true" />}
              </button>;
            })}
          </div>
        </section>;
      })}
      {!questions.some((item) => sources.includes(item.segment)) && <p className={styles.emptySmall}>Tidak ada soal untuk filter ini.</p>}
    </div>
    <div className={styles.legend} aria-label="Keterangan status soal">
      <span><Check size={14} /> {review ? "Maksimal" : "Dijawab"}</span>
      {review ? <><span><X size={14} /> Salah</span><span><Circle size={12} /> Bobot sebagian</span></> : <span><Flag size={13} /> Ragu</span>}
      <span><i /> Kosong</span><span><i data-current /> Aktif</span>
    </div>
  </nav>;
}

function AnswersList({ question, selected, review, layout, disabled, choose, enlarge }: {
  question: Question;
  selected?: string;
  review: boolean;
  layout: string;
  disabled: boolean;
  choose: (label: string) => void;
  enlarge: (picture: Picture) => void;
}) {
  const max = Math.max(...question.options.map((option) => option.score));
  const hasDiagram = question.image || question.options.some((option) => option.image);
  const figural = hasDiagram && question.options.every((option) => (option.text ?? "").length < 45);
  const label = `Pilihan jawaban soal ${question.number}`;
  const list = question.options.map((option) => {
    const checked = option.label === selected;
    const best = option.score === max;
    const state = !review ? (checked ? "selected" : "idle") :
      best ? "best" : checked ? (question.segment === "TKP" ? "partial" : "incorrect") : "idle";
    const picture = option.image ? { src: option.image, label: `Gambar opsi ${option.label}` } : null;
    const body = <>
      <span className={styles.letter}>{option.label}</span>
      <div className={styles.optionBody}>
        {option.text && <Text>{option.text}</Text>}
        {picture && <Diagram key={picture.src} picture={picture} small />}
        {review && (best || checked) && <div className={styles.optionLabels}>
          {best && <span><Check size={14} /> {question.segment === "TKP" ? "Bobot tertinggi" : "Jawaban benar"}</span>}
          {checked && <span>{state === "incorrect" && <X size={14} />} Pilihan kamu</span>}
        </div>}
      </div>
      {review && (question.segment === "TKP" || checked || best) && <span className={styles.points}>{option.score} poin</span>}
    </>;
    return <div key={option.label} className={styles.option} data-state={state} data-image={!!picture}>
      {review ? <div className={styles.optionHit}>{body}</div> : <label className={styles.optionHit}>
        <input type="radio" name={`soal-${question.number}`} value={option.label} checked={checked} disabled={disabled} onChange={() => choose(option.label)} />
        {body}
      </label>}
      {picture && <button type="button" className={styles.optionZoom} onClick={() => enlarge(picture)} aria-label={`Perbesar gambar opsi ${option.label}`} title="Perbesar gambar">
        <ZoomIn size={18} />
      </button>}
    </div>;
  });
  return <fieldset className={styles.answerSet}>
    <legend className={styles.srOnly}>{label}</legend>
    <div className={styles.options} data-layout={layout === "figural" ? (figural ? "rows" : "vertical") : layout}>{list}</div>
  </fieldset>;
}

function Results({ questions, answers, openReview }: {
  questions: Question[];
  answers: Answers;
  openReview: (filter: Filter) => void;
}) {
  const points = questions.map((question) => ({ ...outcome(question, answers), segment: question.segment }));
  const scores = segments.map((segment) => {
    const matches = points.filter((point) => point.segment === segment);
    return { segment, score: matches.reduce((total, point) => total + point.score, 0), max: matches.reduce((total, point) => total + point.max, 0) };
  });
  const total = scores.reduce((acc, entry) => acc + entry.score, 0);
  const max = scores.reduce((acc, entry) => acc + entry.max, 0);
  const blank = points.filter((entry) => !entry.selection).length;
  const best = points.filter((entry) => entry.best).length;
  const passed = scores.every(({ segment, score }) => score >= thresholds[segment]);
  return <section className={styles.results} aria-labelledby="studio-results">
    <div className={styles.resultHero}>
      <div>
        <p>Hasil latihan</p>
        <h2 id="studio-results">{total} <span>/ {max}</span></h2>
        <div className={styles.resultStatus} data-passed={passed}>{passed ? "Mencapai ambang latihan" : "Belum mencapai ambang latihan"}</div>
      </div>
      <div className={styles.resultCounts}>
        <span><strong>{best}</strong> Bobot maksimal</span>
        <span><strong>{questions.length - best - blank}</strong> Di bawah maksimal</span>
        <span><strong>{blank}</strong> Kosong</span>
      </div>
    </div>
    <div className={styles.scoreGrid}>
      {scores.map(({ segment, score, max }) => <article key={segment} className={styles.scoreCard}>
        <p>{segment} · {segmentNames[segment]}</p>
        <h3>{score}<span> / {max}</span></h3>
        <progress max={max} value={score} aria-label={`Skor ${segment}`} />
        <p>Ambang latihan {thresholds[segment]}</p>
      </article>)}
    </div>
    <div className={styles.resultActions}>
      <button type="button" className={styles.primary} onClick={() => openReview("not-best")}><BookOpen size={18} /> Bahas yang belum maksimal</button>
      <button type="button" className={styles.secondary} onClick={() => openReview("all")}>Lihat semua pembahasan <ArrowRight size={18} /></button>
    </div>
  </section>;
}

export default function ExamStudio({ pack, initialDesign, initialMode, initialQuestion }: {
  pack: ExamPackage;
  initialDesign: string;
  initialMode: Mode;
  initialQuestion?: number;
}) {
  const [designId, setDesignId] = useState(initialDesign);
  const [mode, setMode] = useState(initialMode);
  const [current, setCurrent] = useState(initialQuestion ?? pack.questions[0].number);
  const [answers, setAnswers] = useState(() => exampleAnswers(pack.questions));
  const [flags, setFlags] = useState(() => new Set([12, 35, 58]));
  const [filter, setFilter] = useState<Filter>("all");
  const [font, setFont] = useState("default");
  const [seconds, setSeconds] = useState(52 * 60 + 24);
  const [sheet, setSheet] = useState<"map" | "finish" | "math" | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const design = designs.find((item) => item.id === designId) ?? designs[0];
  const review = mode === "pembahasan";
  const question = pack.questions.find((item) => item.number === current) ?? pack.questions[0];
  const count = Object.keys(answers).length;
  const total = pack.questions.length;
  const marked = flags.has(question.number);
  const remaining = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const grouped = ["classic", "sand", "sage"].includes(design.style);
  const rail = design.navigator === "bottom" || design.navigator === "top";
  const source = review ? pack.questions.filter((item) => filter === "all" ||
    (filter === "blank" ? !answers[item.number] : !!answers[item.number] && !outcome(item, answers).best)) : pack.questions;
  const index = source.findIndex((item) => item.number === question.number);
  const status = outcome(question, answers);
  const { math, long, figural } = useMemo(() => {
    const math = pack.questions.find((item) => item.text.includes("$"));
    const length = (item: Question) => item.options.reduce((sum, option) => sum + (option.text?.length ?? 0), item.text.length);
    const long = pack.questions.reduce((a, b) => length(b) > length(a) ? b : a);
    const figural = pack.questions.find((item) => item.options.some((option) => option.image)) ?? pack.questions.find((item) => item.image);
    return { math, long, figural };
  }, [pack.questions]);

  useEffect(() => {
    if (mode !== "ujian") return;
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastTick) / 1000);
      if (elapsed < 1) return;
      lastTick += elapsed * 1000;
      setSeconds((previous) => Math.max(0, previous - elapsed));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode]);

  function writeUrl(nextDesign: string, nextMode: Mode, number: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("desain", nextDesign);
    url.searchParams.set("mode", nextMode);
    url.searchParams.set("soal", String(number));
    window.history.replaceState(null, "", url);
  }

  function pickDesign(id: string) {
    setDesignId(id);
    writeUrl(id, mode, current);
  }

  function changeMode(next: Mode) {
    setMode(next);
    setFilter("all");
    writeUrl(designId, next, current);
  }

  function jump(number: number) {
    setCurrent(number);
    setSheet(null);
    writeUrl(designId, mode === "hasil" ? "ujian" : mode, number);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  }

  function applyFilter(next: Filter, fromResults = false) {
    const first = pack.questions.find((item) => next === "all" ||
      (next === "blank" ? !answers[item.number] : !!answers[item.number] && !outcome(item, answers).best));
    setFilter(next);
    if (fromResults) setMode("pembahasan");
    if (first) setCurrent(first.number);
    writeUrl(designId, "pembahasan", first?.number ?? current);
  }

  function openSample(number: number) {
    setFilter("all");
    jump(number);
  }

  function toggleFlag() {
    setFlags((previous) => {
      const next = new Set(previous);
      if (next.has(question.number)) next.delete(question.number);
      else next.add(question.number);
      return next;
    });
  }

  const map = (drawer = false) => <QuestionMap key={`${design.id}-${review}-${filter}-${drawer}-${question.segment}`} questions={source} current={current}
    answers={answers} flags={flags} review={review} grouped={drawer || grouped} rail={!drawer && rail} jump={jump} />;
  const discussion = review && source.length > 0 && <article className={styles.discussion} aria-labelledby="studio-discussion">
    <span className={styles.discussionIcon}><BookOpen size={19} /></span>
    <div>
      <h3 id="studio-discussion">Pembahasan</h3>
      {question.topic && <p className={styles.muted}>{question.topic}</p>}
      <Text>{question.explanation || "Pembahasan belum tersedia untuk soal ini."}</Text>
    </div>
  </article>;

  return <div className={styles.studio} data-style={design.style} data-font={font}>
    <a href="#studio-preview" className={styles.skip}>Langsung ke preview</a>
    <header className={styles.topbar}>
      <div className={styles.width}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}><ScanLine size={23} aria-hidden="true" /></span>
          <div><strong>TOCPNS</strong><span>Studio ujian</span></div>
        </div>
        <div className={styles.topTools}>
          <span className={styles.local}>Preview lokal</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
    <main className={styles.width}>
      <section className={styles.controlPanel} aria-labelledby="studio-title">
        <div className={styles.intro}>
          <div><h1 id="studio-title">Studio desain ujian</h1><p>{pack.title} <span>·</span> {total} soal{pack.demo ? " sintetis" : ""}</p></div>
          <div className={styles.fontControl}><label htmlFor="studio-font">Ukuran teks</label>
            <select id="studio-font" value={font} onChange={(event) => setFont(event.target.value)}>
              <option value="default">Bawaan desain</option>
              <option value="16">16 px</option><option value="18">18 px</option><option value="20">20 px</option>
            </select>
          </div>
        </div>
        <div className={styles.designs} role="group" aria-label="Pilih desain">
          {designs.map((item) => <button type="button" key={item.id} aria-pressed={designId === item.id} onClick={() => pickDesign(item.id)}>
            <span className={styles.miniLayout} data-nav={item.navigator} aria-hidden="true"><i /><i /></span>
            {item.name}
          </button>)}
        </div>
        <div className={styles.designSelect}>
          <label htmlFor="studio-design">Desain</label>
          <select id="studio-design" value={designId} onChange={(event) => pickDesign(event.target.value)}>
            {designs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className={styles.designInfo}>
          <p>{design.caption}</p>
          <div className={styles.samples} aria-label="Contoh untuk diuji">
            <span>Lompat ke</span>
            {math && <button type="button" onClick={() => { if (mode === "hasil") changeMode("ujian"); openSample(math.number); }}>LaTeX</button>}
            <button type="button" onClick={() => { if (mode === "hasil") changeMode("ujian"); openSample(long.number); }}>Teks panjang</button>
            {figural && <button type="button" onClick={() => { if (mode === "hasil") changeMode("ujian"); openSample(figural.number); }}>Figural</button>}
            <button type="button" onClick={() => setSheet("math")}>Uji rumus blok</button>
          </div>
        </div>
      </section>
      <section className={styles.preview} id="studio-preview" aria-label={`Pratinjau ${design.name}`}>
        <header className={styles.previewHeader}>
          <div className={styles.switches} role="group" aria-label="Layar preview">
            {modes.map(({ id, label }) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => changeMode(id)}>{label}</button>)}
          </div>
          {mode === "ujian" ? <div className={styles.timer} data-urgent={seconds < 300} role="timer" aria-label="Sisa waktu contoh">
            <Clock3 size={18} aria-hidden="true" /><span>{remaining}</span>
          </div> : <span className={styles.sessionLabel}>Sesi contoh</span>}
        </header>

        {mode === "hasil" ? <Results questions={pack.questions} answers={answers} openReview={(next) => applyFilter(next, true)} /> : <>
          {review && <div className={styles.reviewBar}>
            <div className={styles.filters} role="group" aria-label="Filter pembahasan">
              {filters.map(({ id, name }) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => applyFilter(id)}>{name}</button>)}
            </div>
            <p>{source.length} soal</p>
          </div>}
          <div className={styles.workspace} data-nav={design.navigator} data-aside={review && design.review === "aside"}>
            {source.length ? <article className={styles.question} aria-labelledby="studio-question">
              <div className={styles.questionMeta}>
                <div><span className={styles.segment}>{question.segment}</span><span className={styles.muted}>Soal {question.number} dari {total}</span></div>
                {review ? <span className={styles.reviewScore} data-best={status.best}>{status.score} / {status.max} poin</span> :
                  <button type="button" className={styles.flag} aria-pressed={marked} onClick={toggleFlag}>
                    <Flag size={16} aria-hidden="true" /> {marked ? "Ditandai ragu" : "Tandai ragu"}
                  </button>}
              </div>
              <div className={styles.questionBody}>
                <div className={styles.prompt}>
                  <h2 id="studio-question" ref={heading} tabIndex={-1} className={styles.srHeading}>Soal {question.number} · {segmentNames[question.segment]}</h2>
                  <Text>{question.text}</Text>
                  {question.image && <Diagram key={question.image} picture={{ src: question.image, label: `Diagram soal ${question.number}` }} enlarge={setPicture} />}
                </div>
                <AnswersList key={question.number} question={question} selected={answers[question.number]} review={review} layout={design.options}
                  disabled={seconds === 0} choose={(label) => setAnswers((previous) => ({ ...previous, [question.number]: label }))} enlarge={setPicture} />
              </div>
              {review && design.review === "below" && discussion}
              <footer className={styles.questionFooter}>
                <button type="button" className={styles.secondary} disabled={index <= 0} onClick={() => jump(source[index - 1].number)}>
                  <ArrowLeft size={17} /> <span>Sebelumnya</span>
                </button>
                <button type="button" className={styles.mapTrigger} onClick={() => setSheet("map")}><Grid2X2 size={17} /> <span>Daftar soal</span></button>
                {index >= source.length - 1 && !review ?
                  <button type="button" className={styles.primary} onClick={() => setSheet("finish")}>Kumpulkan</button> :
                  <button type="button" className={styles.primary} disabled={index === -1 || index >= source.length - 1} onClick={() => jump(source[index + 1].number)}><span>Berikutnya</span> <ArrowRight size={17} /></button>}
              </footer>
            </article> : <article className={styles.question}><h2>Tidak ada soal untuk filter ini</h2><button type="button" className={styles.secondary} onClick={() => applyFilter("all")}>Tampilkan semua soal</button></article>}
            {design.navigator !== "drawer" && <aside className={styles.navigator} aria-label="Panel daftar soal">
              <div className={styles.navHead}><div><h2>Daftar soal</h2><p>{review ? `${source.length} soal dalam filter` : `${count} dari ${total} dijawab`}</p></div>
                <Grid2X2 size={19} aria-hidden="true" />
              </div>
              {!review && <progress aria-label="Kemajuan menjawab" max={total} value={count} />}
              {map()}
              {mode === "ujian" && !rail && <button type="button" className={styles.submitLink} onClick={() => setSheet("finish")}>Kumpulkan ujian <ArrowRight size={16} /></button>}
            </aside>}
            {design.review === "aside" && review && <aside className={styles.discussionAside}>{discussion}</aside>}
          </div>
          {mode === "ujian" && <div className={styles.previewFoot}>
            <span><Check size={16} /> {count} dijawab <span>·</span> {flags.size} ragu</span>
            <div><button type="button" onClick={() => { setAnswers({}); setFlags(new Set()); setSeconds(100 * 60); }}><RotateCcw size={15} /> Kosongkan</button>
              <button type="button" onClick={() => setSheet("finish")}>Kumpulkan ujian <ArrowRight size={16} /></button></div>
          </div>}
        </>}
      </section>
      <footer className={styles.studioFooter}>Jawaban dan nilai di studio hanya untuk preview. <a href="#studio-title">Kembali ke desain <ArrowDown size={14} /></a></footer>
    </main>
    <Sheet open={sheet === "map"} title="Daftar soal" close={() => setSheet(null)} drawer>
      {map(true)}
    </Sheet>
    <Sheet open={sheet === "finish"} title="Kumpulkan latihan contoh?" close={() => setSheet(null)}>
      <p className={styles.muted}>{count} dijawab, {total - count} kosong, dan {flags.size} ditandai ragu.</p>
      <div className={styles.sheetActions}>
        <button type="button" className={styles.secondary} onClick={() => setSheet(null)}>Lanjut mengerjakan</button>
        <button type="button" className={styles.primary} onClick={() => { setSheet(null); changeMode("hasil"); }}>Lihat hasil</button>
      </div>
    </Sheet>
    <Sheet open={sheet === "math"} title="Pratinjau LaTeX" close={() => setSheet(null)}>
      <div className={styles.mathSample}><Text>{mathSample}</Text></div>
    </Sheet>
    <Sheet open={!!picture} title={picture?.label ?? "Gambar soal"} close={() => setPicture(null)}>
      {picture && <Diagram key={picture.src} picture={picture} />}
    </Sheet>
  </div>;
}
