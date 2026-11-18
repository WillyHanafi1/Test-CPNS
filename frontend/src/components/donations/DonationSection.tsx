"use client";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { ErrorPanel, Loading } from "@/components/AppShell";
import {
  DonationProgress,
  RecentList,
  SupporterList,
  useDonations,
} from "./DonationDisplay";

export default function DonationSection() {
  const { data, error, loading, reload } = useDonations("month", 3);
  return (
    <section className="donation-home" aria-labelledby="donation-home-title">
      <div className="donation-home-intro">
        <span className="donation-symbol">
          <Heart size={24} aria-hidden="true" />
        </span>
        <p className="eyebrow">DARI KOMUNITAS, UNTUK KOMUNITAS</p>
        <h2 id="donation-home-title">Ruang latihan ini tumbuh bersama.</h2>
        <p className="muted">
          Dukungan sukarela membantu biaya server, perawatan platform, dan
          pengembangan latihan. Sedikit dari banyak orang bisa berarti banyak.
        </p>
        <div className="stack" style={{ gap: 12 }}>
          <Link className="button" href="/donasi?amount=5000">
            Dukung mulai Rp 5.000
            <ArrowRight size={16} />
          </Link>
          <Link className="donation-text-link" href="/donasi">
            Lihat papan dukungan →
          </Link>
        </div>
        <p className="muted donation-small">
          Tetap bisa belajar tanpa berdonasi.
        </p>
      </div>
      <div className="donation-home-data">
        {loading ? (
          <Loading label="Memuat dukungan komunitas…" />
        ) : (
          <>
            {error && <ErrorPanel message={error} retry={reload} />}
            {data && (
              <>
                <DonationProgress
                  stats={data.stats}
                  periodLabel={data.period_label}
                />
                <div className="donation-preview-lists">
                  <div>
                    <h3>Pendukung bulan ini</h3>
                    <SupporterList rows={data.top_supporters} />
                  </div>
                  <div>
                    <h3>Dukungan terbaru</h3>
                    <RecentList compact rows={data.recent_supporters} />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
