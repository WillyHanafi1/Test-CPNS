import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import DonationPage from "@/components/donations/DonationPage";

export const metadata: Metadata = {
  title: "Donasi — Dukung TOCPNS",
  description:
    "Dukungan sukarela untuk merawat ruang latihan CPNS. Lihat dukungan komunitas, pilih nominalmu, dan berdonasi melalui DOKU.",
};
export default function Donate() {
  return (
    <AppShell>
      <DonationPage />
    </AppShell>
  );
}
