import Link from "next/link";
import { ArrowRight, Check, BookOpen, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/AppShell";
export default function Home() {
  return (
    <AppShell>
      <section className="hero-home">
        <div>
          <span className="badge">Ruang latihan CPNS</span>
          <h1 style={{ marginTop: 24 }}>
            Latihan terarah.
            <br />
            <span style={{ color: "var(--accent)" }}>Langkah lebih yakin.</span>
          </h1>
          <p className="muted">
            Simulasi CAT, hasil yang jelas, dan pembahasan untuk memahami setiap
            jawaban. Fokus pada latihan berikutnya.
          </p>
          <div className="inline">
            <Link className="button" href="/catalog">
              Coba paket gratis
              <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/catalog/upgrade">
              Lihat keanggotaan
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Bisa diakses melalui browser ponsel dan komputer.
          </p>
        </div>
        <div className="hero-art" aria-label="Ilustrasi alur latihan">
          <div className="panel stack">
            <BookOpen color="var(--accent)" size={30} />
            <h2>Satu langkah setiap hari.</h2>
            {[
              "Pilih paket yang ingin dikerjakan",
              "Kerjakan simulasi dengan waktu terukur",
              "Pahami jawaban melalui pembahasan",
            ].map((text, i) => (
              <div className="inline" key={text}>
                <span className="badge">0{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
            <div className="notice">
              <CheckCircle2 size={19} />
              Lebih sedikit distraksi. Lebih banyak latihan.
            </div>
          </div>
        </div>
      </section>
      <section className="package-grid" style={{ margin: "25px 0 55px" }}>
        {[
          [
            "Simulasi yang fokus",
            "Teks, pilihan jawaban, timer, dan navigasi soal. Semua yang kamu perlukan saat berlatih.",
          ],
          [
            "Pembahasan yang bisa dipelajari",
            "Tinjau pilihanmu, pahami perolehan poin, dan temukan bagian yang perlu dilatih kembali.",
          ],
          [
            "Satu keanggotaan",
            "Pro membuka seluruh paket yang tersedia dalam cakupan keanggotaan selama masa aktif.",
          ],
        ].map(([title, description]) => (
          <article className="panel stack" key={title}>
            <Check size={21} color="var(--accent)" />
            <h2>{title}</h2>
            <p className="muted">{description}</p>
          </article>
        ))}
      </section>
      <section className="feature-card between">
        <div>
          <h2>Mulai dari satu latihan.</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Lihat paket yang tersedia dan pilih langkah pertamamu.
          </p>
        </div>
        <Link className="button" href="/catalog">
          Buka paket soal
          <ArrowRight size={16} />
        </Link>
      </section>
    </AppShell>
  );
}
