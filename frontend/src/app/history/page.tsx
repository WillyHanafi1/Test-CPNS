"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, {
  Loading,
  ErrorPanel,
  EmptyState,
} from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { SessionInfo, dateLabel } from "@/lib/api";
export default function History() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useResource<SessionInfo[]>(
    `/exam/sessions/me?limit=20&offset=${page * 20}`,
    !!user,
  );
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/history");
  }, [authLoading, user, router]);
  return (
    <AppShell
      title="Riwayat latihan"
      description="Lihat kembali hasilmu dan pelajari pembahasan setiap percobaan."
    >
      {authLoading || loading ? (
        <Loading />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : !data?.length ? (
        <EmptyState
          title={
            page === 0
              ? "Perjalananmu dimulai dari sini"
              : "Tidak ada sesi pada halaman ini"
          }
        >
          <p>Belum ada latihan. Pilih satu paket untuk memulai.</p>
          <Link className="button" href="/catalog">
            Lihat paket soal
          </Link>
        </EmptyState>
      ) : (
        <div className="stack">
          {data.map((s) => (
            <article className="panel history-row" key={s.id}>
              <div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  {dateLabel(s.start_time)}
                </p>
                <h3>{s.package_title}</h3>
                <span
                  className={`badge ${s.status === "finished" ? "badge-green" : "badge-amber"}`}
                  style={{ marginTop: 10 }}
                >
                  {s.status === "finished"
                    ? "Selesai"
                    : s.status === "ongoing"
                      ? "Sedang dikerjakan"
                      : s.status === "processing"
                        ? "Hasil sedang diproses"
                        : "Sesi berakhir"}
                </span>
              </div>
              <div className="inline">
                {s.status === "finished" && (
                  <>
                    <div style={{ textAlign: "right", marginRight: 15 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Total skor
                      </span>
                      <strong style={{ display: "block", fontSize: 30 }}>
                        {s.total_score}
                      </strong>
                    </div>
                    <Link
                      className="button button-secondary"
                      href={`/session/${s.id}/review`}
                    >
                      Pembahasan
                    </Link>
                  </>
                )}
                <Link
                  className="button"
                  href={
                    s.status === "ongoing"
                      ? `/session/${s.id}`
                      : `/session/${s.id}/result`
                  }
                >
                  {s.status === "ongoing" ? "Lanjutkan" : "Lihat hasil"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <div
        className="inline"
        style={{ justifyContent: "center", marginTop: 24 }}
      >
        <button
          className="button button-secondary"
          disabled={page === 0 || loading}
          onClick={() => setPage((n) => n - 1)}
        >
          Sebelumnya
        </button>
        <span className="muted">Halaman {page + 1}</span>
        <button
          className="button button-secondary"
          disabled={loading || !data || data.length < 20}
          onClick={() => setPage((n) => n + 1)}
        >
          Berikutnya
        </button>
      </div>
    </AppShell>
  );
}
