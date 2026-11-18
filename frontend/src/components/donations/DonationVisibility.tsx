"use client";
import { useState } from "react";
import { api } from "@/lib/api";
export default function DonationVisibility({
  orderId,
  anonymous,
  onUpdated,
}: {
  orderId: string;
  anonymous: boolean;
  onUpdated: () => void;
}) {
  const [hidden, setHidden] = useState(anonymous);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="donation-visibility-control">
      <button
        type="button"
        className="button button-small button-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const result = await api<{ is_anonymous: boolean }>(
              `/transactions/donations/${encodeURIComponent(orderId)}/visibility`,
              {
                method: "PATCH",
                body: JSON.stringify({ is_anonymous: !hidden }),
              },
            );
            setHidden(result.is_anonymous);
            setNotice(
              result.is_anonymous
                ? "Nama disembunyikan dari papan pendukung."
                : "Nama singkat tampil di papan pendukung.",
            );
            onUpdated();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Pilihan nama belum tersimpan.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Menyimpan…"
          : hidden
            ? "Tampilkan nama singkat"
            : "Sembunyikan nama"}
      </button>
      {notice && (
        <p className="muted donation-small" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="donation-small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
