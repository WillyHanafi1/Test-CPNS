"use client";
import { useTransition } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AppShell title="Halaman belum dapat ditampilkan.">
      <section className="panel stack">
        <p className="muted">
          Coba muat kembali. Jika sedang mengikuti ujian, jawaban yang sudah
          dikonfirmasi tetap tercatat di server.
        </p>
        <div className="inline">
          <button
            className="button"
            disabled={pending}
            onClick={() => startTransition(() => retry())}
          >
            {pending ? "Memuat…" : "Coba lagi"}
          </button>
          <Link className="button button-secondary" href="/history">
            Buka riwayat
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
