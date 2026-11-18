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
            Simulasi CAT SKD (TWK, TIU, TKP), hasil yang jelas, dan pembahasan
            untuk memahami setiap jawaban. Fokus pada latihan berikutnya.
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
            "Teks, pilihan jawaban, timer server, dan navigasi soal. Semua yang kamu perlukan saat berlatih.",
          ],
          [
            "Pembahasan & evaluasi topik",
            "Tinjau pilihanmu, pahami perolehan poin, dan lihat sub-materi yang perlu dilatih kembali.",
          ],
          [
            "Satu keanggotaan sederhana",
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

      <section className="stack" style={{ marginBottom: 55 }}>
        <div>
          <p className="eyebrow">PILIHAN AKSES</p>
          <h2>Mulai gratis, perluas saat dibutuhkan.</h2>
        </div>
        <div className="two-column" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article className="panel stack">
            <div className="between">
              <span className="badge badge-neutral">Gratis</span>
              <strong>Rp 0</strong>
            </div>
            <h3>Kenali alur simulasi</h3>
            <ul className="check-list muted">
              <li>
                <Check size={18} />
                <span>Akses paket latihan gratis yang tersedia di katalog.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Simulasi CAT dengan waktu terukur dan penyimpanan jawaban.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Rekap nilai TWK, TIU, TKP dan pembahasan sesi selesai.</span>
              </li>
            </ul>
            <Link className="button button-secondary" href="/catalog">
              Lihat paket gratis
            </Link>
          </article>

          <article className="panel stack" style={{ borderColor: "var(--accent-border)" }}>
            <div className="between">
              <span className="badge">Keanggotaan Pro</span>
              <strong>Rp 50.000 / 365 hari</strong>
            </div>
            <h3>Ruang latihan lengkap</h3>
            <ul className="check-list muted">
              <li>
                <Check size={18} />
                <span>Akses seluruh paket peserta Pro yang terbit dan siap.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Pembahasan lengkap serta evaluasi perkembangan & sub-topik.</span>
              </li>
              <li>
                <Check size={18} />
                <span>Sekali bayar untuk 1 tahun penuh tanpa tagihan otomatis.</span>
              </li>
            </ul>
            <Link className="button" href="/catalog/upgrade">
              Lihat detail Pro
              <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="stack" style={{ marginBottom: 55 }}>
        <div className="between" style={{ flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">PERTANYAAN UMUM</p>
            <h2>Hal yang sering ditanyakan</h2>
          </div>
          <div className="inline">
            <Link className="button button-small button-secondary" href="/faq">
              Semua panduan
            </Link>
            <Link
              className="button button-small button-secondary"
              href="/support"
            >
              Kontak admin
            </Link>
          </div>
        </div>
        <div className="stack">
          {[
            [
              "Apakah saya harus membayar untuk mencoba latihan?",
              "Tidak. Kamu bisa langsung memilih paket berlabel Gratis di katalog untuk mencoba simulasi CAT dan membaca pembahasannya.",
            ],
            [
              "Apakah keanggotaan Pro memotong saldo otomatis setiap tahun?",
              "Tidak. Pembayaran bersifat satu kali untuk 365 hari akses. Tidak ada langganan otomatis.",
            ],
            [
              "Ke mana saya menghubungi jika ada kendala akun atau pembayaran?",
              "Kamu dapat menghubungi WhatsApp atau Email admin secara langsung melalui halaman Kontak & Dukungan, bahkan tanpa perlu masuk akun.",
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
