"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import AppShell, { ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  FEEDBACK_CATEGORIES,
  FeedbackCategory,
  mailtoHref,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  whatsappHref,
} from "@/lib/contact";

export default function Support() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  return (
    <AppShell
      title="Kontak & Bantuan"
      description="Hubungi admin secara langsung atau kirim masukan untuk membantu merawat TOCPNS."
    >
      <div className="two-column">
        <div className="stack">
          <section className="panel stack">
            <div>
              <p className="eyebrow">HUBUNGI LANGSUNG</p>
              <h2>Butuh bantuan cepat?</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Kamu dapat menghubungi admin kapan saja tanpa perlu masuk akun—baik
                untuk kendala login, reset password, verifikasi transaksi,
                maupun pertanyaan seputar layanan.
              </p>
            </div>
            <div className="two-column" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
              <div className="panel stack" style={{ padding: 20, gap: 14 }}>
                <div className="inline">
                  <MessageCircle size={19} color="var(--accent)" />
                  <strong>WhatsApp Admin</strong>
                </div>
                <p className="muted" style={{ fontSize: 14 }}>
                  {SUPPORT_WHATSAPP_DISPLAY}
                </p>
                <a
                  className="button button-small"
                  href={whatsappHref(
                    "Halo Admin TOCPNS, saya membutuhkan bantuan terkait...",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chat via WhatsApp
                </a>
              </div>
              <div className="panel stack" style={{ padding: 20, gap: 14 }}>
                <div className="inline">
                  <Mail size={19} color="var(--accent)" />
                  <strong>Email Dukungan</strong>
                </div>
                <p className="muted" style={{ fontSize: 14 }}>
                  {SUPPORT_EMAIL}
                </p>
                <a
                  className="button button-small button-secondary"
                  href={mailtoHref("Bantuan TOCPNS")}
                >
                  Kirim Email
                </a>
              </div>
            </div>
            <div className="notice" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>Tips agar kendala cepat ditangani</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  Untuk kendala pembayaran Pro atau donasi, sertakan{" "}
                  <strong>ID Transaksi (Order ID)</strong> atau alamat email
                  akunmu. Untuk koreksi soal tertentu, gunakan tombol{" "}
                  <strong>Laporkan masalah soal</strong> langsung di halaman
                  Pembahasan agar nomor dan versi soal otomatis tercatat.
                </p>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div>
              <p className="eyebrow">KOTAK MASUKAN</p>
              <h2>Kirim saran atau laporan kendala</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Setiap masukan dibaca langsung untuk memperbaiki kualitas soal
                dan kenyamanan latihan.
              </p>
            </div>
            {user ? (
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setNotice("");
                  setError("");
                  try {
                    await api("/user/feedback", {
                      method: "POST",
                      body: JSON.stringify({
                        category,
                        content: message,
                        path_context: "/support",
                      }),
                    });
                    setMessage("");
                    setNotice("Masukan terkirim. Terima kasih atas kontribusimu.");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Masukan belum terkirim.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="field">
                  Kategori
                  <select
                    className="input"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as FeedbackCategory)
                    }
                  >
                    {FEEDBACK_CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Pesan atau detail kendala
                  <textarea
                    className="input"
                    rows={4}
                    minLength={5}
                    maxLength={3000}
                    required
                    placeholder="Ceritakan saran, kendala transaksi, atau bagian yang perlu kami perbaiki…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                <div className="inline">
                  <button className="button" disabled={busy}>
                    {busy ? "Mengirim…" : "Kirim masukan"}
                  </button>
                  <Link className="button button-secondary" href="/faq">
                    Baca panduan (FAQ)
                  </Link>
                </div>
                {notice && (
                  <p className="notice" role="status">
                    {notice}
                  </p>
                )}
                {error && <ErrorPanel message={error} />}
              </form>
            ) : (
              <div className="stack">
                <p className="muted">
                   Kamu dapat langsung menghubungi WhatsApp atau Email di atas
                  tanpa masuk akun, atau masuk ke akunmu untuk mengirim laporan
                  melalui formulir terintegrasi.
                </p>
                <div className="inline">
                  <Link className="button" href="/login?next=/support">
                    Masuk untuk kirim via akun
                  </Link>
                  <Link className="button button-secondary" href="/faq">
                    Panduan aplikasi (FAQ)
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="panel stack">
            <div className="inline">
              <ShieldCheck size={20} color="var(--accent)" />
              <h2>Tentang TOCPNS</h2>
            </div>
            <p className="muted">
              TOCPNS dibangun dan dirawat secara independen untuk menghadirkan
              ruang simulasi CAT CPNS (SKD: TWK, TIU, TKP) yang tenang, jujur,
              dan fokus pada pemahaman materi tanpa distraksi.
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              Platform ini adalah sarana latihan edukasi independen dan tidak
              berafiliasi dengan Badan Kepegawaian Negara (BKN) maupun instansi
              pemerintah mana pun.
            </p>
            <div className="inline">
              <Link className="button button-small button-secondary" href="/terms">
                Ketentuan layanan
              </Link>
              <Link className="button button-small button-secondary" href="/privacy">
                Kebijakan privasi
              </Link>
            </div>
          </section>

          <section className="panel stack">
            <div className="inline">
              <Heart size={19} color="var(--accent)" />
              <h2>Dukungan sukarela</h2>
            </div>
            <p className="muted">
              Dukungan komunitas bersifat sukarela dan terpisah dari pembelian
              Paket Pro. Kontribusimu membantu biaya server dan pemeliharaan
              platform ini.
            </p>
            <Link className="button button-secondary" href="/donasi">
              Buka halaman donasi
            </Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
