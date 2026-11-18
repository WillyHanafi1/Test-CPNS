"use client";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { ErrorPanel, Loading } from "@/components/AppShell";
import { useDonations } from "./DonationDisplay";

import DonationCommunity from "./DonationCommunity";

export default function DonationSection() {
  const { data, error, loading, reload } = useDonations("month", 20);
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
          pengembangan latihan. Kirim pesan atau doa semangatmu untuk sesama
          pejuang CPNS.
        </p>
        <div className="stack" style={{ gap: 12 }}>
          <Link className="button" href="/donasi?amount=5000">
            Dukung mulai Rp 5.000
            <ArrowRight size={16} />
          </Link>
          <Link className="donation-text-link" href="/donasi">
            Lihat papan dukungan & kirim pesan →
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
            {data && <DonationCommunity data={data} format="overlay" compact />}
          </>
        )}
      </div>
    </section>
  );
}
