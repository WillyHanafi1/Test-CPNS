import Link from "next/link";
import { ArrowRight, Check, BookOpen, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import HomeTrustStrip from "@/components/HomeTrustStrip";
import HomeExamPreview from "@/components/HomeExamPreview";
import HomeProPrice from "@/components/HomeProPrice";
export default function Home() {
  return (
    <AppShell>
      <section className="hero-home">
        <div>
          <span className="badge hero-label">Ruang latihan CPNS</span>
          <h1 style={{ marginTop: 24 }}>
            Latihan terarah.
            <br />
            <span style={{ color: "var(--accent)" }}>Langkah lebih yakin.</span>
          </h1>
          <p className="muted">
            Latihan SKD dengan simulasi CAT. Lihat nilai TWK, TIU, dan TKP, lalu
            pelajari pembahasan setelah ujian.
          </p>
          <div className="inline">
            <Link className="button" href="/catalog">
              Coba paket gratis
              <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/catalog/upgrade">
              Lihat TOCPNS Pro
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Bisa digunakan di ponsel dan komputer.
          </p>
        </div>
        <section className="hero-art" aria-labelledby="cara-berlatih">
          <div className="panel stack">
            <BookOpen aria-hidden="true" color="var(--accent)" size={30} />
            <h2 id="cara-berlatih">Cara berlatih</h2>
            <ol className="hero-steps" role="list">
              {[
                "Pilih paket soal",
                "Kerjakan simulasi soal dengan waktu terukur",
                "Tinjau jawabanmu",
              ].map((text, i) => (
                <li key={text}>
                  <span className="badge" aria-hidden="true">0{i + 1}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <div className="notice hero-note">
              <CheckCircle2 aria-hidden="true" size={19} />
              <span>Minim distraksi. Latihan lebih terarah. Persiapan lebih matang.</span>
            </div>
          </div>
        </section>
      </section>

      <HomeTrustStrip />

      <div className="home-section">
        <HomeExamPreview />
      </div>

      <section className="home-section">
        <div className="package-grid">
          {[
            [
              "Simulasi CAT",
              "Pantau sisa waktu dan pindah antarsoal dengan mudah. Jawabanmu tersimpan otomatis saat berlatih.",
            ],
            [
              "Pembahasan dan evaluasi",
              "Lihat poin tiap jawaban dan topik yang perlu kamu latih lagi.",
            ],
            [
              "Akses paket Pro",
              "Kerjakan semua paket soal yang tersedia selama Paket Pro aktif.",
            ],
          ].map(([title, description]) => (
            <article className="panel stack" key={title}>
              <Check size={21} color="var(--accent)" />
              <h2>{title}</h2>
              <p className="muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section stack">
        <h2>Paket gratis dan Pro</h2>
        <div className="two-column" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article className="panel stack">
            <div className="between">
              <span className="badge badge-neutral">Gratis</span>
              <strong>Rp0</strong>
            </div>
            <h3>Coba simulasi SKD</h3>
            <ul className="check-list muted">
              <li>
                <Check size={18} />
                <span>Pilih paket berlabel Gratis di katalog.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Kerjakan simulasi CAT dengan batas waktu. Jawaban tersimpan otomatis.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Lihat nilai per subtes dan pembahasan setelah selesai.</span>
              </li>
            </ul>
            <Link className="button button-secondary" href="/catalog">
              Lihat paket gratis
            </Link>
          </article>

          <article className="panel stack" style={{ borderColor: "var(--accent-border)" }}>
            <HomeProPrice />
            <h3>Latihan dengan lebih banyak paket</h3>
            <ul className="check-list muted">
              <li>
                <Check size={18} />
                <span>Akses semua paket soal Pro yang tersedia, termasuk paket baru yang dirilis selama masa aktif.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Baca pembahasan, lihat tren nilai, dan kenali sub-topik yang perlu dilatih lagi.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Sekali bayar untuk 1 tahun (365 hari). Tidak ada perpanjangan otomatis / auto-debit.</span>
              </li>
            </ul>
            <Link className="button" href="/catalog/upgrade">
              Lihat detail Pro
              <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="home-section stack">
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h2>Pertanyaan umum</h2>
          <div className="inline">
            <Link className="button button-small button-secondary" href="/faq">
              Lihat semua pertanyaan
            </Link>
            <Link
              className="button button-small button-secondary"
              href="/support"
            >
              Hubungi admin
            </Link>
          </div>
        </div>
        <div className="stack">
          {[
            [
              "Apakah saya bisa mencoba latihan gratis?",
              "Kamu bisa memilih paket berlabel Gratis di katalog, mengerjakan simulasi CAT, dan membaca pembahasan setelah ujian.",
            ],
            [
              "Apakah Paket Pro diperpanjang otomatis?",
              "Satu pembayaran memberi 365 hari akses Pro. Untuk memperpanjang, kamu bisa membeli akses lagi.",
            ],
            [
              "Siapa yang bisa saya hubungi jika ada kendala akun atau pembayaran?",
              "Hubungi admin melalui WhatsApp atau email di halaman Kontak. Halaman tersebut bisa dibuka sebelum masuk akun.",
            ],
          ].map(([q, a]) => (
            <details className="panel" key={q}>
              <summary style={{ cursor: "pointer", fontWeight: 650 }}>
                {q}
              </summary>
              <p className="muted" style={{ marginTop: 12 }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="home-section">
        <section className="feature-card between">
          <div>
            <h2>Siap berlatih?</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Pilih paket sesuai kebutuhan latihanmu.
            </p>
          </div>
          <Link className="button" href="/catalog">
            Lihat katalog soal
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
