"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell, { Loading } from "@/components/AppShell";
export default function LegacyStart() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/catalog/${id}`);
  }, [id, router]);
  return (
    <AppShell>
      <Loading label="Membuka persiapan paket…" />
    </AppShell>
  );
}
