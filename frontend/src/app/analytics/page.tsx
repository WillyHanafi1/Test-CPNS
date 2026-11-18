"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, {
  Loading,
  ErrorPanel,
  EmptyState,
} from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { SessionInfo, dateLabel } from "@/lib/api";

type TopicMastery = {
  segment: string;
  sub_category: string;
  total_answered: number;
  points: number;
  maximum: number;
  correct_count: number;
  mastery_percentage: number;
};

export default function Progress() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [segmentFilter, setSegmentFilter] = useState("Semua");

  const sessions = useResource<SessionInfo[]>(
    "/exam/sessions/me?limit=20",
    !!user,
  );
  const mastery = useResource<TopicMastery[]>("/user/me/mastery", !!user);
  const weakPoints = useResource<TopicMastery[]>(
    "/user/me/weak-points",
    !!user,
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/analytics");
  }, [authLoading, user, router]);

  const finished = (sessions.data || []).filter((s) => s.status === "finished");
  const chronological = [...finished].slice(0, 10).reverse();

  const bestScore = finished.length
    ? Math.max(...finished.map((s) => s.total_score))
    : 0;
  const avgTotal = finished.length
    ? Math.round(
        finished.reduce((acc, s) => acc + s.total_score, 0) / finished.length,
      )
    : 0;
  const avgTwk = finished.length
    ? Math.round(
        finished.reduce((acc, s) => acc + s.score_twk, 0) / finished.length,
      )
    : 0;
  const avgTiu = finished.length
    ? Math.round(
        finished.reduce((acc, s) => acc + s.score_tiu, 0) / finished.length,
      )
    : 0;
  const avgTkp = finished.length
    ? Math.round(
        finished.reduce((acc, s) => acc + s.score_tkp, 0) / finished.length,
      )
    : 0;
  const passedCount = finished.filter((s) => s.is_passed).length;

  const topics = (mastery.data || []).filter(
    (t) => segmentFilter === "Semua" || t.segment === segmentFilter,
  );

  return (
    <AppShell
      title="Perkembangan & penguasaan topik"
      description="Ringkasan nilai asli dan penguasaan sub-materi dari latihan yang sudah selesai."
      action={
        <div className="inline">
          <Link className="button button-small button-secondary" href="/history">
            Semua riwayat
          </Link>
          <Link
            className="button button-small button-secondary"
            href="/leaderboard"
          >
            Peringkat
          </Link>
        </div>
      }
    >
      {authLoading || sessions.loading ? (
        <Loading />
      ) : sessions.error ? (
        <ErrorPanel message={sessions.error} retry={sessions.reload} />
      ) : !finished.length ? (
        <EmptyState title="Belum ada latihan yang selesai">
          <p>
            Selesaikan satu paket latihan untuk melihat tren skor dan analisis
            penguasaan sub-topikmu di sini.
          </p>
          <Link className="button" href="/catalog">
            Pilih paket soal
          </Link>
        </EmptyState>
      ) : (
        <div className="stack">
          <section className="operations-grid">
            <div className="panel stack" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                LATIHAN SELESAI
              </span>
              <strong className="metric-value">{finished.length}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                sesi terbaru tercatat
              </span>
            </div>
            <div className="panel stack" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                SKOR TERBAIK
              </span>
              <strong className="metric-value">{bestScore}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                dari 550 poin maksimal
              </span>
            </div>
            <div className="panel stack" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                RATA-RATA SKOR
              </span>
              <strong className="metric-value">{avgTotal}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                TWK {avgTwk} · TIU {avgTiu} · TKP {avgTkp}
              </span>
            </div>
            <div className="panel stack" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                MEMENUHI AMBANG LATIHAN
              </span>
              <strong className="metric-value">
                {passedCount} / {finished.length}
              </strong>
              <span className="muted" style={{ fontSize: 13 }}>
                acuan TWK 65 · TIU 80 · TKP 166
              </span>
            </div>
          </section>

          <div className="two-column">
            <section className="panel stack">
              <div className="between">
                <div>
                  <h2>Tren {chronological.length} sesi terakhir</h2>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Urutan dari sesi lebih awal ke sesi terbaru.
                  </p>
                </div>
                <Link className="muted" href="/history">
                  Riwayat lengkap →
                </Link>
              </div>
              <div className="stack" style={{ gap: 16 }}>
                {chronological.map((s) => {
                  const pct = Math.min(
                    100,
                    Math.max(4, Math.round((s.total_score / 550) * 100)),
                  );
                  return (
                    <div
                      key={s.id}
                      className="stack"
                      style={{
                        gap: 8,
                        paddingBottom: 14,
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <div className="between">
                        <div>
                          <strong>{s.package_title}</strong>
                          <p className="muted" style={{ fontSize: 12 }}>
                            {dateLabel(s.start_time)} · TWK {s.score_twk} · TIU{" "}
                            {s.score_tiu} · TKP {s.score_tkp}
                          </p>
                        </div>
                        <div className="inline">
                          <span
                            className={`badge ${s.is_passed ? "badge-green" : "badge-amber"}`}
                          >
                            {s.total_score} poin
                          </span>
                          <Link
                            className="button button-small button-secondary"
                            href={`/session/${s.id}/review`}
                          >
                            Pembahasan
                          </Link>
                        </div>
                      </div>
                      <progress
                        className="donation-progress"
                        style={{ margin: 0 }}
                        value={pct}
                        max={100}
                        aria-label={`Skor ${s.package_title}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="panel stack">
              <div>
                <p className="eyebrow">FOKUS BELAJAR BERIKUTNYA</p>
                <h2>Sub-topik yang perlu diperkuat</h2>
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Diurutkan dari persentase perolehan poin terendah agar kamu
                  tahu bagian mana yang sebaiknya dipelajari ulang.
                </p>
              </div>
              {weakPoints.loading ? (
                <Loading label="Menganalisis sub-topik…" />
              ) : !weakPoints.data?.length ? (
                <p className="muted">
                  Data sub-topik akan muncul setelah jawaban sesi tercatat.
                </p>
              ) : (
                <div className="stack" style={{ gap: 14 }}>
                  {weakPoints.data.map((w) => (
                    <div
                      key={`${w.segment}:${w.sub_category}`}
                      className="panel stack"
                      style={{ padding: 16, gap: 8 }}
                    >
                      <div className="between">
                        <span className="badge">{w.segment}</span>
                        <strong>{w.mastery_percentage}% poin</strong>
                      </div>
                      <strong>{w.sub_category}</strong>
                      <p className="muted" style={{ fontSize: 13 }}>
                        {w.points} dari {w.maximum} poin maksimal ({w.total_answered}{" "}
                        soal dijawab)
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Link className="button button-secondary" href="/catalog">
                Latih paket soal lagi
              </Link>
            </aside>
          </div>

          <section className="panel stack">
            <div className="between" style={{ flexWrap: "wrap" }}>
              <div>
                <h2>Penguasaan per sub-topik</h2>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Dihitung dari poin jawaban aktual dibandingkan poin maksimal
                  pada setiap sub-materi.
                </p>
              </div>
              <div
                className="filters"
                style={{ margin: 0 }}
                aria-label="Filter segmen materi"
              >
                {["Semua", "TWK", "TIU", "TKP"].map((seg) => (
                  <button
                    type="button"
                    key={seg}
                    className="filter"
                    aria-pressed={segmentFilter === seg}
                    onClick={() => setSegmentFilter(seg)}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            {mastery.loading ? (
              <Loading label="Memuat penguasaan topik…" />
            ) : mastery.error ? (
              <ErrorPanel message={mastery.error} retry={mastery.reload} />
            ) : !topics.length ? (
              <p className="muted">Belum ada data pada kategori ini.</p>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {topics.map((t) => (
                  <div
                    key={`${t.segment}:${t.sub_category}`}
                    className="history-row"
                    style={{
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <div className="inline">
                        <span className="badge badge-neutral">{t.segment}</span>
                        <strong>{t.sub_category}</strong>
                      </div>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {t.points} / {t.maximum} poin · {t.total_answered} soal
                        dijawab
                      </p>
                    </div>
                    <span
                      className={`badge ${t.mastery_percentage >= 70 ? "badge-green" : "badge-amber"}`}
                    >
                      {t.mastery_percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
