"use client";
import { useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Crown,
  Heart,
  Medal,
  Quote,
  Trophy,
} from "lucide-react";
import type { DonationDesignId } from "@/lib/donation-designs";
import { rupiah, type TopSupporter } from "@/lib/donations";

function Avatar({
  row,
  large = false,
}: {
  row: TopSupporter;
  large?: boolean;
}) {
  return (
    <span
      className={`lb-avatar${large ? " lb-avatar-large" : ""}`}
      aria-hidden="true"
    >
      {row.is_anonymous ? (
        <Heart size={15} />
      ) : (
        row.full_name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
      )}
    </span>
  );
}
function Rank({ row }: { row: TopSupporter }) {
  return (
    <span
      className="lb-rank"
      data-rank={row.rank}
      aria-label={`Peringkat ${row.rank}`}
    >
      {row.rank === 1 ? (
        <Crown size={15} aria-hidden="true" />
      ) : row.rank <= 3 ? (
        <Medal size={14} aria-hidden="true" />
      ) : null}
      <span>{String(row.rank).padStart(2, "0")}</span>
    </span>
  );
}
function Identity({ row }: { row: TopSupporter }) {
  return (
    <span className="lb-identity">
      <strong>{row.full_name}</strong>
      <small>{row.donation_count} kali dukungan</small>
    </span>
  );
}
function Amount({ row }: { row: TopSupporter }) {
  return <strong className="lb-amount">{rupiah(row.total_amount)}</strong>;
}
function Tail({ rows }: { rows: TopSupporter[] }) {
  if (!rows.length) return null;
  return (
    <ol className="lb-tail" aria-label="Peringkat lanjutan">
      {rows.map((row, index) => (
        <li
          className="lb-entry"
          data-rank={row.rank}
          key={index}
          value={row.rank}
        >
          <Rank row={row} />
          <Identity row={row} />
          <Amount row={row} />
        </li>
      ))}
    </ol>
  );
}
function DonorQuote({ row }: { row: TopSupporter }) {
  return (
    <p className="lb-quote">
      <Quote size={15} aria-hidden="true" />
      {row.message ||
        "Ikut merawat ruang latihan ini, tanpa meninggalkan pesan."}
    </p>
  );
}
function Podium({ rows }: { rows: TopSupporter[] }) {
  return (
    <>
      <ol className="lb-podium" aria-label="Tiga pendukung teratas">
        {rows.slice(0, 3).map((row, index) => (
          <li
            className="lb-entry"
            data-rank={row.rank}
            key={index}
            value={row.rank}
          >
            <div className="lb-podium-person">
              <Rank row={row} />
              <Avatar row={row} large />
              <strong>{row.full_name}</strong>
              <Amount row={row} />
              <small>{row.donation_count} kali dukungan</small>
            </div>
            <div className="lb-podium-step" aria-hidden="true">
              {row.rank === 1 && <Trophy size={23} />}
              <span>{row.rank}</span>
            </div>
          </li>
        ))}
      </ol>
      <Tail rows={rows.slice(3)} />
    </>
  );
}
function Spotlight({ rows }: { rows: TopSupporter[] }) {
  return (
    <>
      <div className="lb-spotlight">
        <article className="lb-champion lb-entry" data-rank={rows[0].rank}>
          <span className="lb-caption">
            <Crown size={14} /> PENDUKUNG TERATAS
          </span>
          <Avatar row={rows[0]} large />
          <Identity row={rows[0]} />
          <Amount row={rows[0]} />
          <DonorQuote row={rows[0]} />
        </article>
        <div className="lb-challengers">
          {rows.slice(1, 3).map((row, index) => (
            <article className="lb-entry" data-rank={row.rank} key={index}>
              <Rank row={row} />
              <Avatar row={row} />
              <Identity row={row} />
              <Amount row={row} />
            </article>
          ))}
        </div>
      </div>
      <Tail rows={rows.slice(3)} />
    </>
  );
}
function Tracks({ rows }: { rows: TopSupporter[] }) {
  return (
    <ol className="lb-tracks" aria-label="Peringkat menurut total dukungan">
      {rows.map((row, index) => (
        <li
          className="lb-entry"
          data-rank={row.rank}
          key={index}
          value={row.rank}
        >
          <Rank row={row} />
          <div className="lb-track-data">
            <div>
              <Identity row={row} />
              <Amount row={row} />
            </div>
            <div className="lb-track" aria-hidden="true">
              <span
                style={{
                  width: `${Math.max(1, (row.total_amount / (rows[0].total_amount || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
function Mosaic({ rows }: { rows: TopSupporter[] }) {
  return (
    <ol className="lb-mosaic" aria-label="Mosaik peringkat pendukung">
      {rows.map((row, index) => (
        <li
          className="lb-entry"
          data-rank={row.rank}
          key={index}
          value={row.rank}
        >
          <Rank row={row} />
          <Avatar row={row} large={row.rank === 1} />
          <Identity row={row} />
          <Amount row={row} />
          {row.rank === 1 && <DonorQuote row={row} />}
        </li>
      ))}
    </ol>
  );
}
function StreamOverlay({ rows }: { rows: TopSupporter[] }) {
  return (
    <ol className="lb-stream-overlay" aria-label="Peringkat donatur dan pesan">
      {rows.map((row, index) => (
        <li
          className="lb-entry"
          data-rank={row.rank}
          data-anonymous={row.is_anonymous || undefined}
          key={index}
          value={row.rank}
        >
          <span
            className="lb-overlay-number"
            aria-label={`Peringkat ${row.rank}`}
          >
            {row.rank === 1 ? <Crown size={31} aria-hidden="true" /> : row.rank}
          </span>
          <div className="lb-stream-main">
            <div className="lb-stream-heading">
              <Avatar row={row} />
              <Identity row={row} />
              <Amount row={row} />
            </div>
            {row.message?.trim() ? (
              <div className="lb-stream-message">
                <Quote size={14} aria-hidden="true" />
                <p>{row.message}</p>
              </div>
            ) : (
              <p className="lb-stream-no-message">
                Mengirim dukungan tanpa pesan.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
function Columns({ rows }: { rows: TopSupporter[] }) {
  const midpoint = Math.ceil(rows.length / 2);
  return (
    <div className="lb-columns">
      {[rows.slice(0, midpoint), rows.slice(midpoint)].map((group, i) => (
        <div key={i}>
          <span className="lb-caption">
            POSISI {group[0]?.rank || "—"}–{group.at(-1)?.rank || "—"}
          </span>
          <ol aria-label={`Jalur peringkat ${i + 1}`}>
            {group.map((row, index) => (
              <li
                className="lb-entry"
                data-rank={row.rank}
                key={index}
                value={row.rank}
              >
                <span className="lb-column-number">
                  {String(row.rank).padStart(2, "0")}
                </span>
                <Identity row={row} />
                <Amount row={row} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
function Ladder({ rows }: { rows: TopSupporter[] }) {
  return (
    <>
      <ol className="lb-ladder" aria-label="Tangga peringkat">
        {rows.slice(0, 5).map((row, i) => (
          <li
            className="lb-entry"
            style={{ "--step": i } as CSSProperties}
            data-rank={row.rank}
            key={i}
            value={row.rank}
          >
            <span className="lb-ladder-marker">
              <Rank row={row} />
            </span>
            <div>
              <Avatar row={row} />
              <Identity row={row} />
              <Amount row={row} />
            </div>
          </li>
        ))}
      </ol>
      <Tail rows={rows.slice(5)} />
    </>
  );
}
function Orbit({ rows }: { rows: TopSupporter[] }) {
  return (
    <>
      <div
        className="lb-orbit-grid"
        role="list"
        aria-label="Lingkaran peringkat"
      >
        <div className="lb-orbit-line" aria-hidden="true" />
        <article
          className="lb-entry lb-orbit-center"
          data-rank={rows[0].rank}
          role="listitem"
        >
          <Rank row={rows[0]} />
          <Avatar row={rows[0]} large />
          <Identity row={rows[0]} />
          <Amount row={rows[0]} />
        </article>
        {rows.slice(1, 5).map((row, i) => (
          <article
            className="lb-entry lb-orbit-node"
            data-rank={row.rank}
            data-slot={i}
            key={i}
            role="listitem"
          >
            <Rank row={row} />
            <Avatar row={row} />
            <strong>{row.full_name}</strong>
            <Amount row={row} />
          </article>
        ))}
      </div>
      <Tail rows={rows.slice(5)} />
    </>
  );
}
function Carousel({ rows }: { rows: TopSupporter[] }) {
  const scroller = useRef<HTMLOListElement>(null);
  const [position, setPosition] = useState(0);
  function move(direction: number) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({
      left: direction * (element.clientWidth * 0.75 + 14),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div className="lb-carousel">
      <ol
        className="lb-carousel-track"
        ref={scroller}
        aria-label="Galeri peringkat, geser horizontal"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          setPosition(
            element.scrollLeft <= 1
              ? 0
              : element.scrollLeft >=
                  element.scrollWidth - element.clientWidth - 2
                ? 2
                : 1,
          );
        }}
      >
        {rows.map((row, index) => (
          <li
            className="lb-entry"
            data-rank={row.rank}
            key={index}
            value={row.rank}
          >
            <Rank row={row} />
            <Avatar row={row} large />
            <Identity row={row} />
            <Amount row={row} />
            <DonorQuote row={row} />
          </li>
        ))}
      </ol>
      <div className="lb-carousel-controls">
        <span>{rows.length} pendukung · geser untuk melihat</span>
        <button
          type="button"
          disabled={position === 0}
          onClick={() => move(-1)}
          aria-label="Pendukung sebelumnya"
        >
          <ArrowLeft size={17} />
        </button>
        <button
          type="button"
          disabled={position === 2 || rows.length < 2}
          onClick={() => move(1)}
          aria-label="Pendukung berikutnya"
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
function Accordion({ rows }: { rows: TopSupporter[] }) {
  const [openRank, setOpenRank] = useState<number | null>(0);
  return (
    <div
      className="lb-accordion"
      role="list"
      aria-label="Peringkat dengan rincian"
    >
      {rows.map((row, index) => (
        <article
          role="listitem"
          className="lb-entry"
          data-rank={row.rank}
          data-open={openRank === index}
          key={index}
        >
          <button
            type="button"
            aria-expanded={openRank === index}
            onClick={() => setOpenRank(openRank === index ? null : index)}
          >
            <Rank row={row} />
            <strong>{row.full_name}</strong>
            <Amount row={row} />
            <ChevronDown size={16} />
          </button>
          {openRank === index && (
            <div className="lb-accordion-detail">
              <Avatar row={row} large />
              <div>
                <span>
                  {row.donation_count} kali dukungan · terima kasih sudah ikut
                  merawat
                </span>
                <DonorQuote row={row} />
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

const layouts = {
  podium: Podium,
  spotlight: Spotlight,
  bars: Tracks,
  mosaic: Mosaic,
  overlay: StreamOverlay,
  columns: Columns,
  ladder: Ladder,
  orbit: Orbit,
  carousel: Carousel,
  accordion: Accordion,
};
export default function DonationLeaderboard({
  rows,
  format = "overlay",
  compact = false,
}: {
  rows: TopSupporter[];
  format?: DonationDesignId;
  compact?: boolean;
}) {
  const ordered = [...rows]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, compact ? 5 : 10);
  const Layout = layouts[format];
  return (
    <div
      className={`donation-leaderboard-formats${compact ? " lb-compact" : ""}`}
      data-format={format}
    >
      {!ordered.length ? (
        <div className="lb-empty">
          <Heart size={28} aria-hidden="true" />
          <h3>Ruang untuk pendukung pertama.</h3>
          <p>
            Belum ada dukungan pada periode ini. Donatur anonim juga akan tampil
            sesuai peringkatnya.
          </p>
        </div>
      ) : (
        <Layout key={format} rows={ordered} />
      )}
    </div>
  );
}
