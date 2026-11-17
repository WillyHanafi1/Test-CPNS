import Link from "next/link";
import AppShell from "@/components/AppShell";
export default function NotFound() {
  return (
    <AppShell
      title="Halaman tidak ditemukan."
      description="Alamat ini mungkin sudah berubah. Kamu bisa melanjutkan dari paket soal atau membuka bantuan."
    >
      <div className="inline">
        <Link className="button" href="/catalog">
          Lihat paket soal
        </Link>
        <Link className="button button-secondary" href="/faq">
          Bantuan
        </Link>
      </div>
    </AppShell>
  );
}
