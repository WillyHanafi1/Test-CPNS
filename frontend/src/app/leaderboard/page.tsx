"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell, {
  Loading,
  ErrorPanel,
  EmptyState,
} from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { PackageInfo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
function Ranking() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const packages = useResource<PackageInfo[]>("/packages?limit=100");
  const [chosen, setChosen] = useState(params.get("package_id") || "");
  const id = chosen || packages.data?.[0]?.id;
  const revision =
    chosen === params.get("package_id") ? params.get("revision_id") : null;
  const ranking = useResource<{
    notice: string;
    current_user: { rank: number; score: number } | null;
    total_participants: number;
    rows: {
      rank: number;
      name: string;
      score: number;
      twk: number;
      tiu: number;
      tkp: number;
    }[];
  }>(
    `/exam/ranking/${id}${revision ? "?revision_id=" + encodeURIComponent(revision) : ""}`,
    !!id && !!user,
  );
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/leaderboard");
  }, [user, authLoading, router]);
  return (
    <AppShell
      title="Peringkat latihan"
      description="Bandingkan percobaan terbaik pada versi paket yang sama."
    >
      {packages.loading || authLoading ? (
        <Loading />
      ) : packages.error ? (
        <ErrorPanel message={packages.error} retry={packages.reload} />
      ) : (
        <div className="stack">
          <label className="field" style={{ maxWidth: 600 }}>
            Paket latihan
            <select
              className="input"
              value={id || ""}
              onChange={(e) => setChosen(e.target.value)}
            >
              {chosen && !packages.data?.some((p) => p.id === chosen) && (
                <option value={chosen}>Paket dari hasil latihan</option>
              )}
              {packages.data?.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          {ranking.loading ? (
            <Loading />
          ) : ranking.error ? (
            <ErrorPanel message={ranking.error} retry={ranking.reload} />
          ) : (
            <section className="panel stack">
              <p className="muted">{ranking.data?.notice}</p>
              {ranking.data?.current_user && (
                <div className="notice">
                  <strong>Peringkatmu #{ranking.data.current_user.rank}</strong>
                  <p>
                    {ranking.data.current_user.score} poin dari{" "}
                    {ranking.data.total_participants} peserta pada versi ini.
                  </p>
                </div>
              )}
              {!ranking.data?.rows.length ? (
                <EmptyState title="Belum ada hasil pada versi ini." />
              ) : (
                ranking.data.rows.map((row) => (
                  <div className="history-row" key={row.rank}>
                    <div className="inline">
                      <span className="badge badge-neutral">{row.rank}</span>
                      <strong>{row.name}</strong>
                    </div>
                    <p className="muted">
                      TWK {row.twk} · TIU {row.tiu} · TKP {row.tkp}
                    </p>
                    <strong>{row.score}</strong>
                  </div>
                ))
              )}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
export default function Leaderboard() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <Loading />
        </AppShell>
      }
    >
      <Ranking />
    </Suspense>
  );
}
