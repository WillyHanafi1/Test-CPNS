import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Lightbulb } from "lucide-react";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Tips CPNS — Strategi & Panduan Lulus SKD CAT BKN | TOCPNS",
  description:
    "10 saran terbaik lulus SKD CPNS: konsisten 1 tryout sehari selama sebulan, ambang batas TWK/TIU/TKP, urutan pengerjaan TKP-TWK-TIU, dan manajemen waktu CAT BKN.",
};

interface TipItem {
  number: string;
  tag: string;
  title: string;
  summary: string;
  featured?: boolean;
}

const TIPS: TipItem[] = [
  {
    number: "01",
    tag: "Kunci Utama",
    title: "Kerja Keras & Konsisten 1 Tryout Sehari Selama Sebulan",
    summary:
      "Disiplin mengerjakan minimal 1 paket tryout penuh (110 soal, timer 100 menit) setiap hari selama 30 hari lalu langsung membedah pembahasannya secara nyata meningkatkan peluang lolos SKD. Latihan rutin harian melatih refleks pola soal HOTS, kecepatan baca, dan ketahanan fokus jauh lebih efektif dibanding sekadar membaca materi pasif.",
    featured: true,
  },
  {
    number: "02",
    tag: "Aturan Resmi",
    title: "Pahami Komposisi Soal & Wajib Lolos Ketiga Passing Grade",
    summary:
      "SKD terdiri dari 110 soal dalam 100 menit (maksimal 550 poin). Pada jalur umum, kamu wajib melampaui ketiga ambang batas sekaligus: TWK minimal 65 (30 soal, benar +5), TIU minimal 80 (35 soal, benar +5), dan TKP minimal 166 (45 soal, skala poin 1–5). Nilai total tinggi tetap gugur jika salah satu subtes di bawah ambang batas.",
  },
  {
    number: "03",
    tag: "Navigasi CAT",
    title: "Jangan Kerjakan Berurutan dari Nomor 1",
    summary:
      "Sistem CAT BKN membebaskan peserta berpindah nomor lewat panel navigasi. Hindari terpaku mengerjakan urut dari nomor 1 karena berisiko menghabiskan energi dan waktu pada soal sulit di awal sebelum sempat mengamankan soal mudah di nomor belakang.",
  },
  {
    number: "04",
    tag: "Urutan Ideal",
    title: "Gunakan Urutan Strategis: TKP → TWK → TIU",
    summary:
      "Mulai dari TKP (±35 menit) saat otak masih segar untuk membaca studi kasus panjang sekaligus menabung poin pasti (skala 1–5), lanjut ke TWK (±15–20 menit) yang relatif cepat dijawab atau dilewati, lalu gunakan sisa waktu terbesar (±40–45 menit) untuk hitungan dan logika TIU.",
  },
  {
    number: "05",
    tag: "Manajemen Waktu",
    title: "Terapkan Aturan 54 Detik per Soal",
    summary:
      "Dengan 110 soal dalam 100 menit, rata-rata waktu tiap soal hanya sekitar 54 detik. Jika sebuah soal (terutama hitungan TIU) menyita lebih dari 1 menit tanpa arah jelas, segera tandai Ragu-ragu lalu lewati dulu agar tidak mengorbankan soal mudah lainnya.",
  },
  {
    number: "06",
    tag: "Strategi TKP",
    title: "Posisikan Diri sebagai ASN Profesional saat Menjawab TKP",
    summary:
      "Kunci skor tinggi TKP ada pada sudut pandang birokrasi ideal: pilih opsi yang paling solutif, proaktif, ramah pelayanan publik, terbuka terhadap teknologi dan kritik, mengutamakan kerja sama tim, serta taat SOP. Hindari jawaban pasif atau menyalahkan pihak lain.",
  },
  {
    number: "07",
    tag: "Strategi TIU",
    title: "Sapu Bersih Soal Berpola Cepat Lebih Dulu",
    summary:
      "Pada subtes TIU, kerjakan terlebih dahulu soal yang cepat diselesaikan seperti analogi verbal, silogisme, deret angka, dan figural. Setelah poin cepat aman, barulah fokus mengerjakan soal cerita atau perhitungan numerik panjang.",
  },
  {
    number: "08",
    tag: "Strategi TWK",
    title: "Fokus Penalaran Kasus HOTS, Bukan Sekadar Hafalan Pasal",
    summary:
      "Soal TWK modern lebih banyak menguji penalaran implementasi nilai Pancasila, integritas, bela negara, pilar negara, dan kalimat efektif bahasa Indonesia dalam situasi nyata—bukan sekadar hafalan tanggal atau bunyi pasal.",
  },
  {
    number: "09",
    tag: "Tanpa Minus",
    title: "Jangan Pernah Kosongkan Satu Pun Jawaban",
    summary:
      "Ujian SKD CAT BKN tidak menerapkan sistem pengurangan nilai (minus). Jawaban salah pada TWK dan TIU bernilai 0, sedangkan TKP minimal bernilai 1 jika diisi. Sisakan 2–3 menit terakhir untuk memastikan seluruh 110 nomor terisi penuh.",
  },
  {
    number: "10",
    tag: "Evaluasi & Hari-H",
    title: "Evaluasi Kelemahan Sub-Topik & Jaga Kondisi Fisik",
    summary:
      "Usai setiap tryout, tinjau Riwayat & Pembahasan untuk mencatat sub-topik yang masih sering salah lalu latih ulang secara terfokus. Menjelang hari-H, tidur cukup, bawa KTP dan Kartu Ujian, datang lebih awal, serta abaikan kecepatan peserta lain agar ritme ujianmu tetap tenang.",
  },
];

const SUBTEST_RULES = [
  { label: "TWK", value: "≥ 65", detail: "30 soal · benar +5 · maks 150" },
  { label: "TIU", value: "≥ 80", detail: "35 soal · benar +5 · maks 175" },
  { label: "TKP", value: "≥ 166", detail: "45 soal · bobot 1–5 · maks 225" },
  { label: "Waktu CAT", value: "100 mnt", detail: "110 soal · ~54 dtk/soal · 0 minus" },
];

export default function TipsCpnsPage() {
  return (
    <AppShell
      title="Tips CPNS"
      description="10 saran terbaik dan ringkas untuk membantu kamu membangun kebiasaan latihan yang kuat serta memaksimalkan skor SKD CAT BKN."
      action={
        <Link href="/catalog" className="button button-small">
          Mulai Tryout
          <ArrowRight size={15} />
        </Link>
      }
    >
      <div className="stack" style={{ maxWidth: 880 }}>
        <section className="panel" aria-labelledby="acuan-skd">
          <div className="between" style={{ flexWrap: "wrap", gap: 8 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>
                Acuan SKD CPNS · Jalur Umum
              </p>
              <h2 id="acuan-skd">Ambang batas &amp; waktu pengerjaan</h2>
            </div>
            <span className="badge badge-green">KepmenPANRB 321/2024</span>
          </div>

          <div className="score-grid" style={{ marginBottom: 14 }}>
            {SUBTEST_RULES.map((item) => (
              <div key={item.label} style={{ paddingRight: 12 }}>
                <span className="eyebrow">{item.label}</span>
                <strong>{item.value}</strong>
                <span
                  className="muted"
                  style={{ display: "block", fontSize: 12, marginTop: 4 }}
                >
                  {item.detail}
                </span>
              </div>
            ))}
          </div>

          <p className="muted" style={{ fontSize: 13 }}>
            Formasi khusus: <strong>Cumlaude &amp; Diaspora</strong> kumulatif
            &ge; 311 (TIU &ge; 85);{" "}
            <strong>Disabilitas &amp; Putra/Putri Papua</strong> kumulatif &ge;
            286 (TIU &ge; 60; waktu 130 menit untuk disabilitas netra).
          </p>
        </section>

        <section className="stack" aria-labelledby="daftar-tips">
          <div className="inline" style={{ gap: 10 }}>
            <Lightbulb size={20} color="var(--accent)" aria-hidden="true" />
            <h2 id="daftar-tips">10 poin strategi terbaik lulus SKD</h2>
          </div>

          <ol
            className="stack"
            style={{ listStyle: "none", padding: 0, margin: 0, gap: 16 }}
          >
            {TIPS.map((tip) => (
              <li
                key={tip.number}
                className="panel"
                style={
                  tip.featured
                    ? {
                        borderColor: "var(--accent-border)",
                        background: "var(--surface)",
                        boxShadow: "var(--shadow)",
                      }
                    : undefined
                }
              >
                <div
                  className="inline"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div className="inline" style={{ gap: 8 }}>
                    <span
                      className={
                        tip.featured ? "badge badge-green" : "badge"
                      }
                    >
                      {tip.featured && <Flame size={13} aria-hidden="true" />}
                      Poin {tip.number}
                    </span>
                    <span className="badge badge-neutral">{tip.tag}</span>
                  </div>
                </div>
                <h3 style={{ marginBottom: 8 }}>{tip.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {tip.summary}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="feature-card between" style={{ flexWrap: "wrap" }}>
          <div style={{ maxWidth: 520 }}>
            <h2>Mulai target 1 tryout sehari dari hari ini</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Terapkan langsung urutan TKP &rarr; TWK &rarr; TIU dengan timer
              100 menit dan soal HOTS lengkap beserta pembahasannya.
            </p>
          </div>
          <div className="inline">
            <Link className="button" href="/catalog">
              Pilih paket tryout
              <ArrowRight size={16} />
            </Link>
            <Link className="button button-secondary" href="/faq">
              Lihat FAQ
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
