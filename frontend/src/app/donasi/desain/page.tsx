import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import DonationStudio from "@/components/donations/DonationStudio";
import "@/app/donation-studio.css";

export const metadata: Metadata = {
  title: "10 Format Leaderboard Donasi — TOCPNS",
  robots: { index: false, follow: false },
};
export default function DonationDesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense
      fallback={<p className="ds-loading">Menyiapkan studio desain…</p>}
    >
      <DonationStudio />
    </Suspense>
  );
}
