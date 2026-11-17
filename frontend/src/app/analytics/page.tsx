"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { SessionInfo } from "@/lib/api";
export default function Progress() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<SessionInfo[]>(
    "/exam/sessions/me",
    !!user,
  );
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/analytics");
  }, [authLoading, user, router]);
  const finished = (data || []).filter((s) => s.status === "finished");
  return (
    <AppShell
      title="Perkembangan latihan"
      description="Nilai asli dari latihan yang sudah selesai, tanpa prediksi kelulusan."
    >
      {loading || authLoading ? (
        <Loading />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : (
        <section className="panel stack">
          <h2>{finished.length} latihan selesai pada riwayat terbaru</h2>
          {finished.slice(0, 10).map((s) => (
            <div className="history-row" key={s.id}>
              <div>
                <strong>{s.package_title}</strong>
                <p className="muted">
                  TWK {s.score_twk} · TIU {s.score_tiu} · TKP {s.score_tkp}
                </p>
              </div>
              <Link
                className="button button-secondary"
                href={`/session/${s.id}/review`}
              >
                Pelajari pembahasan
              </Link>
            </div>
          ))}
          {!finished.length && (
            <p className="muted">
              Selesaikan latihan pertama untuk mulai melihat perkembangan.
            </p>
          )}
          <Link className="button" href="/history">
            Semua riwayat
          </Link>
        </section>
      )}
    </AppShell>
  );
}
