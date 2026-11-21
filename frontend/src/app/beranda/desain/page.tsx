import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import HomePreviewStudio from "@/features/home-preview-studio/HomePreviewStudio";

export const metadata: Metadata = {
  title: "10 Variasi Bingkai Pratinjau Beranda — TOCPNS",
  robots: { index: false, follow: false },
};

export default function HomePreviewDesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Menyiapkan studio beranda…</p>}>
      <HomePreviewStudio />
    </Suspense>
  );
}
