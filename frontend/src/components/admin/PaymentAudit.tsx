"use client";
import { useResource } from "@/lib/useResource";
import { Loading, ErrorPanel } from "@/components/AppShell";

type Entry = {
  id: string;
  status: string;
  attempts: number;
  created_at: string;
};
type Change = {
  action: string;
  created_at: string;
  details: { before?: string; after?: string; reason?: string };
};
const labels: Record<string, string> = {
  processed: "Terverifikasi",
  pending: "Menunggu pemeriksaan",
  review: "Perlu ditinjau",
  ignored: "Invoice aplikasi lain",
  success: "Berhasil",
  failed: "Tidak berhasil",
};
const when = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function PaymentAudit({ id }: { id: string }) {
  const data = useResource<{ provider_events: Entry[]; audit: Change[] }>(
    `/admin/transactions/${id}/events`,
  );
  return (
    <section className="stack" style={{ marginTop: 16 }}>
      <h3>Riwayat verifikasi</h3>
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorPanel message={data.error} retry={data.reload} />
      ) : (
        <>
          {!data.data?.provider_events.length && !data.data?.audit.length && (
            <p className="muted">
              Belum ada catatan verifikasi pada rilis ini.
            </p>
          )}
          {data.data?.provider_events.map((event) => (
            <div key={event.id}>
              <strong>{labels[event.status] || event.status}</strong>
              <p className="muted">
                DOKU · {when(event.created_at)} · {event.attempts} pemeriksaan
              </p>
            </div>
          ))}
          {data.data?.audit.map((event, index) => (
            <div key={event.created_at + index}>
              <strong>
                {event.action === "admin.payment_status"
                  ? "Pembaruan oleh admin"
                  : "Pembaruan status pembayaran"}
              </strong>
              <p className="muted">
                {when(event.created_at)}
                {event.details.after
                  ? ` · ${labels[event.details.after] || event.details.after}`
                  : ""}
              </p>
              {event.details.reason && <p>{event.details.reason}</p>}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
