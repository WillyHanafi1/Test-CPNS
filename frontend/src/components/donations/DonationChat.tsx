"use client";
import Link from "next/link";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Pin,
  X,
} from "lucide-react";
import {
  rupiah,
  type RecentSupporter,
  type TopSupporter,
} from "@/lib/donations";

const time = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
const day = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));

function PinnedMessage({ top, period }: { top: TopSupporter; period: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (!top.message?.trim()) return null;
  if (hidden)
    return (
      <button
        type="button"
        className="dc-pin-restore"
        onClick={() => setHidden(false)}
      >
        <Pin size={13} /> Tampilkan pesan pendukung teratas
      </button>
    );
  return (
    <aside className="dc-pin" aria-label="Pesan pendukung teratas">
      <div>
        <span>
          <Pin size={13} /> PENDUKUNG TERATAS · {period}
        </span>
        <button
          type="button"
          aria-label="Sembunyikan pesan pin"
          onClick={() => setHidden(true)}
        >
          <X size={15} />
        </button>
      </div>
      <strong>
        {top.full_name}
        <small>{rupiah(top.total_amount)} total dukungan</small>
      </strong>
      <p className={expanded ? "" : "dc-pin-clamp"}>{top.message}</p>
      <button
        className="dc-pin-expand"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Ringkas pesan" : "Buka pesan"}
      </button>
    </aside>
  );
}

export default function DonationChat({
  rows,
  top,
  period,
  pinned = true,
  compact = false,
  demo = false,
}: {
  rows: RecentSupporter[];
  top?: TopSupporter;
  period: string;
  pinned?: boolean;
  compact?: boolean;
  demo?: boolean;
}) {
  const ordered = [...rows].sort(
    (a, b) =>
      Date.parse(a.paid_at || a.created_at) -
      Date.parse(b.paid_at || b.created_at),
  );
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [atLatest, setAtLatest] = useState(true);
  const latest = ordered.at(-1);
  const latestKey = latest
    ? `${latest.paid_at || latest.created_at}-${latest.full_name}-${latest.message}`
    : "empty";
  useLayoutEffect(() => {
    const followLatest = () => {
      if (panel.current && following.current)
        panel.current.scrollTop = panel.current.scrollHeight;
    };
    followLatest();
    const frame = window.requestAnimationFrame(followLatest);
    const observer = new ResizeObserver(followLatest);
    if (panel.current) observer.observe(panel.current);
    if (content.current) observer.observe(content.current);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [latestKey, rows.length]);
  function goLatest() {
    if (panel.current) panel.current.scrollTop = panel.current.scrollHeight;
    following.current = true;
    setAtLatest(true);
  }
  return (
    <section
      className={`dc-chat${compact ? " dc-chat-compact" : ""}`}
      aria-label="Pesan dan dukungan terbaru"
    >
      <div className="dc-chat-heading">
        <div>
          <MessageCircle size={17} />
          <h3>Pesan & doa</h3>
        </div>
        <span>{demo ? "CONTOH" : "TERBARU"}</span>
      </div>
      {pinned && top && (
        <PinnedMessage
          key={`${period}-${top.full_name}`}
          top={top}
          period={period}
        />
      )}
      <div
        className="dc-chat-history"
        ref={panel}
        tabIndex={0}
        role="log"
        aria-label="Riwayat pesan dukungan"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={(event) => {
          const element = event.currentTarget;
          const nearBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            70;
          following.current = nearBottom;
          setAtLatest(nearBottom);
        }}
      >
        <div ref={content} className="dc-chat-content">
          {!ordered.length ? (
            <div className="dc-chat-empty">
              <MessageCircle size={27} />
              <strong>Belum ada pesan di periode ini.</strong>
              <span>Pesan dari dukungan berhasil akan muncul di sini.</span>
            </div>
          ) : (
            ordered.map((row, index) => {
              const date = row.paid_at || row.created_at;
              const previous = ordered[index - 1];
              const showDay =
                !previous ||
                day(date) !== day(previous.paid_at || previous.created_at);
              return (
                <Fragment key={`${date}-${row.full_name}-${index}`}>
                  {showDay && (
                    <div className="dc-chat-day">
                      <span>{day(date)}</span>
                    </div>
                  )}
                  <article
                    className="dc-chat-message"
                    data-anonymous={row.is_anonymous || undefined}
                  >
                    <span className="dc-chat-avatar" aria-hidden="true">
                      {row.is_anonymous ? (
                        <Heart size={13} />
                      ) : (
                        row.full_name[0]
                      )}
                    </span>
                    <div>
                      <div className="dc-chat-meta">
                        <strong>{row.full_name}</strong>
                        <time
                          dateTime={date}
                          title={`${day(date)} ${time(date)} WIB`}
                        >
                          {time(date)}
                        </time>
                      </div>
                      <span className="dc-chat-gift">
                        mendukung <strong>{rupiah(row.amount)}</strong>
                      </span>
                      <p>
                        {row.message || "Mengirim dukungan tanpa pesan. 🤍"}
                      </p>
                    </div>
                  </article>
                </Fragment>
              );
            })
          )}
        </div>
      </div>
      {!atLatest && ordered.length > 0 && (
        <button type="button" className="dc-chat-latest" onClick={goLatest}>
          <ArrowDown size={14} /> Ke pesan terbaru
        </button>
      )}
      <div className="dc-chat-footer">
        <span>
          <span className="dc-status-dot" />{" "}
          {demo ? "Simulasi pesan · WIB" : "Diperbarui berkala · WIB"}
        </span>
        <Link href="/donasi#donation-form">
          Titip pesan <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
}
