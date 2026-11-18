export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@tocpns.my.id";

export const SUPPORT_WHATSAPP_DISPLAY =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_DISPLAY || "0851-1762-3819";

export const SUPPORT_WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "6285117623819"
).replace(/\D/g, "");

export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function mailtoHref(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject?.trim()) params.set("subject", subject.trim());
  if (body?.trim()) params.set("body", body.trim());
  const query = params.toString().replace(/\+/g, "%20");
  return query ? `mailto:${SUPPORT_EMAIL}?${query}` : `mailto:${SUPPORT_EMAIL}`;
}

export type FeedbackCategory = "suggestion" | "bug" | "correction" | "other";

export const FEEDBACK_CATEGORIES: {
  value: FeedbackCategory;
  label: string;
}[] = [
  { value: "suggestion", label: "Saran & masukan umum" },
  { value: "bug", label: "Kendala akun, aplikasi, atau pembayaran" },
  { value: "correction", label: "Koreksi soal atau pembahasan" },
  { value: "other", label: "Pertanyaan lainnya" },
];
