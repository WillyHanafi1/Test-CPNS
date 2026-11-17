"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import AppShell, { Loading, ErrorPanel, Scores } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { SessionInfo, dateLabel } from "@/lib/api";
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<SessionInfo[]>(
    "/exam/sessions/me",
    !!user,
  );
  const stats = useResource<{ total_sessions: number }>(
    "/exam/sessions/me/stats",
    !!user,
  );
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/dashboard");
  }, [authLoading, user, router]);
  if (authLoading || !user)
    return (
      <AppShell>
        <Loading />
      </AppShell>
    );
  const active = data?.find((s) => s.status === "ongoing");
  const latest = data?.find((s) => s.status === "finished");
  return (
    <AppShell
      title={`Halo, ${user.full_name?.split(" ")[0] || "teman belajar"}.`}
      description="Satu latihan, satu pemahaman baru. Lanjutkan dari langkah terakhirmu."
      action={
        <Link
          href="/account"
          className={`badge ${user.is_pro ? "badge-green" : "badge-neutral"}`}
        >
          {user.is_pro ? "Pro aktif" : "Akun gratis"}
        </Link>
      }
    >
      {error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : loading ? (
        <Loading />
      ) : (
        <div className="stack">
          <section className="feature-card between">
            <div>
              <p className="eyebrow">LANGKAH BERIKUTNYA</p>
              <h2>
                {active
                  ? "Latihanmu menunggu untuk dilanjutkan."
                  : latest
                    ? "Nilai sudah ada. Saatnya memahami jawaban."
                    : "Mulai latihan pertamamu."}
              </h2>
              <p className="muted" style={{ margin: "12px 0 0" }}>
                {active
                  ? active.package_title
                  : latest
                    ? latest.package_title
                    : "Pilih paket gratis untuk mengenal simulasi CAT."}
              </p>
            </div>
            <Link
              className="button"
              href={
                active
                  ? `/session/${active.id}`
                  : latest
                    ? `/session/${latest.id}/review`
                    : "/catalog"
              }
            >
              {active
                ? "Lanjutkan"
                : latest
                  ? "Pelajari pembahasan"
                  : "Pilih paket"}
              <ArrowRight size={16} />
            </Link>
          </section>
          <div className="two-column">
            <section className="panel">
              <div className="between">
                <h2>Hasil terakhir</h2>
                <Link className="muted" href="/history">
                  Semua riwayat →
                </Link>
              </div>
              {latest ? (
                <>
                  <p className="muted" style={{ marginTop: 12 }}>
                    {latest.package_title} · {dateLabel(latest.start_time)}
                  </p>
                  <Scores scores={latest} />
                  <Link
                    className="button button-secondary"
                    href={`/session/${latest.id}/result`}
                  >
                    Lihat hasil lengkap
                  </Link>
                </>
              ) : (
                <div className="empty-state">
                  <BookOpen size={27} />
                  <p>Hasil akan muncul setelah latihan pertama selesai.</p>
                </div>
              )}
            </section>
            <aside className="panel stack">
              <h2>Perjalanan latihan</h2>
              <div>
                <strong style={{ fontSize: 36 }}>
                  {stats.data?.total_sessions ?? "—"}
                </strong>
                <p className="muted">latihan selesai</p>
              </div>
              <p className="muted">
                Pembahasan tersedia untuk setiap sesi yang selesai. Mulai dari
                jawaban yang belum tepat.
              </p>
              <Link className="button button-secondary" href="/catalog">
                Temukan paket berikutnya
              </Link>
              {user.is_pro && (
                <p className="muted inline" style={{ fontSize: 13 }}>
                  <Check size={16} />
                  Aktif{" "}
                  {user.pro_expires_at
                    ? `sampai ${dateLabel(user.pro_expires_at)}`
                    : "tanpa batas waktu"}
                </p>
              )}
            </aside>
          </div>
        </div>
      )}
    </AppShell>
  );
}
