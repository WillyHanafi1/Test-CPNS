"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  Clock3,
  Flag,
  LayoutGrid,
  X,
  ZoomIn,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Modal from "@/components/Modal";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import type { Option, Question } from "@/store/useExamStore";
import styles from "./exam.module.css";

export const segments = ["TWK", "TIU", "TKP"] as const;
export const segmentNames = {
  TWK: "Wawasan Kebangsaan",
  TIU: "Intelegensia Umum",
  TKP: "Karakteristik Pribadi",
};

export function ExamFrame({
  stage,
  children,
  timer,
  action,
}: {
  stage: "Ujian" | "Hasil" | "Pembahasan";
  children: ReactNode;
  timer?: ReactNode;
  action?: ReactNode;
}) {
  const brand = (
    <>
      <span className={styles.brandIcon}>
        <BookOpen size={19} aria-hidden="true" />
      </span>
      <strong>TOCPNS</strong>
    </>
  );
  return (
    <div className={styles.screen}>
      <a className="skip-link" href="#main-content">
        Langsung ke konten
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            {stage === "Ujian" ? (
              <span className={styles.brand}>{brand}</span>
            ) : (
              <Link
                className={styles.brand}
                href="/catalog"
                aria-label="TOCPNS, paket soal"
              >
                {brand}
              </Link>
            )}
            <span className={styles.stage}>{stage}</span>
          </div>
          {timer}
          <div className={styles.headerActions}>
            <ThemeToggle />
            {action}
          </div>
        </div>
      </header>
      <main className={styles.main} id="main-content">
        {children}
      </main>
    </div>
  );
}

type Status = "blank" | "saved" | "pending" | "best" | "wrong" | "partial";
export type NavigatorItem = Pick<Question, "id" | "number" | "segment"> & {
  status: Status;
  flagged?: boolean;
};

const statuses = {
  blank: { label: "Kosong", Icon: null },
  saved: { label: "Tersimpan", Icon: Check },
  pending: { label: "Menunggu simpan", Icon: Clock3 },
  best: { label: "Poin maksimal", Icon: Check },
  wrong: { label: "Salah", Icon: X },
  partial: { label: "Poin sebagian", Icon: Circle },
};

export function QuestionNavigator({
  items,
  active,
  current,
  review,
  onSelect,
  action,
}: {
  items: NavigatorItem[];
  active: string;
  current: string;
  review?: boolean;
  onSelect: (id: string) => void;
  action?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const activeTile = useRef<HTMLButtonElement>(null);
  const groups = [
    ...new Set([...segments, ...items.map((item) => item.segment)]),
  ];
  const legend: Status[] = review
    ? ["best", "wrong", "partial", "blank"]
    : ["saved", "pending", "blank"];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!scroller.current?.clientHeight || !activeTile.current) return;
      const container = scroller.current;
      const view = container.getBoundingClientRect();
      const tile = activeTile.current.getBoundingClientRect();
      if (tile.top < view.top || tile.bottom > view.bottom) {
        container.scrollTop +=
          tile.top - view.top - (view.height - tile.height) / 2;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [active, items.length]);

  const saved = items.filter((item) => item.status === "saved").length;
  return (
    <nav className={styles.navigatorContent} aria-label="Navigator soal">
      <p className={styles.navProgress}>{current}</p>
      {!review && (
        <progress
          className={styles.progress}
          max={items.length}
          value={saved}
          aria-label="Jawaban tersimpan"
        />
      )}
      <div className={styles.map} ref={scroller}>
        {groups.map((segment) => {
          const segmentItems = items.filter((item) => item.segment === segment);
          if (!segmentItems.length) return null;
          return (
            <section key={segment} aria-label={segment}>
              <h3>
                {segment} <span>{segmentItems.length}</span>
              </h3>
              <div className={styles.tiles}>
                {segmentItems.map((item) => {
                  const { label, Icon } = statuses[item.status];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      ref={active === item.id ? activeTile : undefined}
                      data-status={item.status}
                      aria-current={active === item.id ? "step" : undefined}
                      aria-label={`Soal ${item.number}, ${label.toLowerCase()}${item.flagged ? ", ditandai ragu" : ""}`}
                      onClick={() => onSelect(item.id)}
                    >
                      {item.number}
                      {Icon && (
                        <Icon
                          className={styles.tileStatus}
                          size={10}
                          aria-hidden="true"
                        />
                      )}
                      {item.flagged && (
                        <Flag
                          className={styles.tileFlag}
                          size={10}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div className={styles.legend} aria-label="Keterangan status">
        {legend.map((key) => {
          const { Icon, label } = statuses[key];
          return (
            <span key={key}>
              {Icon ? <Icon size={12} aria-hidden="true" /> : <i />} {label}
            </span>
          );
        })}
        {!review && (
          <span>
            <Flag size={12} aria-hidden="true" /> Ragu
          </span>
        )}
        <span>
          <i data-current /> Aktif
        </span>
      </div>
      {action}
    </nav>
  );
}

export function ExamText({ children }: { children: string }) {
  return (
    <div className={styles.text}>
      <MarkdownRenderer>{children}</MarkdownRenderer>
    </div>
  );
}

export type ExamImage = { src: string; label: string };

export function QuestionImage({
  image,
  onZoom,
  small = false,
}: {
  image: ExamImage;
  onZoom?: (image: ExamImage) => void;
  small?: boolean;
}) {
  return (
    <div className={styles.diagram} data-small={small}>
      {/* Question diagrams can be supplied by the package at varying aspect ratios. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.label} />
      {onZoom && (
        <button
          type="button"
          className={styles.zoom}
          onClick={() => onZoom(image)}
          aria-label={`Perbesar ${image.label.toLowerCase()}`}
          title="Perbesar gambar"
        >
          <ZoomIn size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ImageDialog({
  image,
  close,
}: {
  image: ExamImage | null;
  close: () => void;
}) {
  return (
    <Modal open={!!image} title={image?.label ?? "Gambar soal"} onClose={close}>
      {image && <QuestionImage image={image} />}
    </Modal>
  );
}

export type ReviewQuestion = Omit<Question, "options"> & {
  options: (Option & { score: number })[];
  discussion?: string;
  selected_option_id: string | null;
};

export function reviewOutcome(question: ReviewQuestion) {
  const selected = question.options.find(
    (option) => option.id === question.selected_option_id,
  );
  const max = Math.max(0, ...question.options.map((option) => option.score));
  const status: Status = !selected
    ? "blank"
    : max > 0 && selected.score === max
      ? "best"
      : question.segment === "TKP"
        ? "partial"
        : "wrong";
  return { selected, max, status };
}

function OptionContent({
  option,
  image,
}: {
  option: Option;
  image: ExamImage | null;
}) {
  return (
    <div className={styles.optionContent}>
      {option.content && <ExamText>{option.content}</ExamText>}
      {image && <QuestionImage image={image} small />}
    </div>
  );
}

export function AnswerChoices(props: {
  question: Question;
  selected?: string;
  disabled: boolean;
  choose: (id: string) => void;
  zoom: (image: ExamImage) => void;
}) {
  const { question, selected, disabled, choose, zoom } = props;
  return (
    <fieldset className={styles.options}>
      <legend className="sr-only">
        Pilih satu jawaban untuk soal {question.number}
      </legend>
      {question.options.map((option) => {
        const image = option.image_url
          ? { src: option.image_url, label: `Gambar opsi ${option.label}` }
          : null;
        return (
          <div
            className={styles.option}
            data-state={selected === option.id ? "selected" : undefined}
            key={option.id}
          >
            <label className={styles.optionHit}>
              <input
                type="radio"
                name={`answer-${question.id}`}
                value={option.id}
                checked={selected === option.id}
                disabled={disabled}
                onChange={() => choose(option.id)}
              />
              <span className={styles.letter}>{option.label}</span>
              <OptionContent option={option} image={image} />
            </label>
            {image && (
              <button
                type="button"
                className={styles.optionZoom}
                onClick={() => zoom(image)}
                aria-label={`Perbesar gambar opsi ${option.label}`}
              >
                <ZoomIn size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

export function ReviewChoices({
  question,
  zoom,
}: {
  question: ReviewQuestion;
  zoom: (image: ExamImage) => void;
}) {
  const { selected, max } = reviewOutcome(question);
  const tkp = question.segment === "TKP";
  return (
    <ul className={styles.options} aria-label={`Opsi soal ${question.number}`}>
      {question.options.map((option) => {
        const best = option.score === max && max > 0;
        const picked = selected?.id === option.id;
        const image = option.image_url
          ? { src: option.image_url, label: `Gambar opsi ${option.label}` }
          : null;
        return (
          <li
            className={styles.option}
            data-state={
              best ? "best" : picked ? (tkp ? "partial" : "wrong") : undefined
            }
            key={option.id}
          >
            <div className={styles.optionHit}>
              <span className={styles.letter}>{option.label}</span>
              <div className={styles.optionContent}>
                <OptionContent option={option} image={image} />
                {(best || picked) && (
                  <p className={styles.optionLabels}>
                    {best && (
                      <span>
                        <Check size={14} aria-hidden="true" />
                        {tkp ? "Bobot tertinggi" : "Jawaban benar"}
                      </span>
                    )}
                    {picked && (
                      <span>
                        {!best && !tkp && <X size={14} aria-hidden="true" />}
                        Pilihan kamu
                      </span>
                    )}
                  </p>
                )}
              </div>
              {(tkp || best || picked) && (
                <span className={styles.points}>{option.score} poin</span>
              )}
            </div>
            {image && (
              <button
                type="button"
                className={styles.optionZoom}
                onClick={() => zoom(image)}
                aria-label={`Perbesar gambar opsi ${option.label}`}
              >
                <ZoomIn size={17} aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function QuestionActions({
  previous,
  next,
  openMap,
  finish,
}: {
  previous?: () => void;
  next?: () => void;
  openMap: () => void;
  finish?: () => void;
}) {
  return (
    <footer className={styles.actions}>
      <button
        type="button"
        className="button button-secondary"
        onClick={previous}
        disabled={!previous}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Sebelumnya
      </button>
      <button
        type="button"
        className={`button button-secondary ${styles.openMap}`}
        onClick={openMap}
      >
        <LayoutGrid size={16} aria-hidden="true" /> Daftar soal
      </button>
      {finish ? (
        <button type="button" className="button" onClick={finish}>
          Selesai
        </button>
      ) : (
        <button
          type="button"
          className="button"
          onClick={next}
          disabled={!next}
        >
          Berikutnya <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </footer>
  );
}
