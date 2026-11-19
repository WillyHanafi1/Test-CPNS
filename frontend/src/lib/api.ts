export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-Exam-Protocol": "2",
        ...(typeof options.body === "string"
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
    const data =
      response.status === 204
        ? {}
        : await response.json().catch((error) => {
            if (controller.signal.aborted) throw error;
            if (response.ok)
              throw new ApiError(
                response.status,
                "invalid_response",
                "Respons belum dapat dikonfirmasi. Silakan coba lagi.",
              );
            return {};
          });
    if (!response.ok) {
      const detail = data.detail;
      throw new ApiError(
        response.status,
        typeof detail === "object" ? detail?.code : "",
        typeof detail === "string"
          ? detail
          : detail?.message || "Permintaan belum berhasil. Silakan coba lagi.",
        detail,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      timedOut ? "request_timeout" : "network_unavailable",
      timedOut
        ? "Respons membutuhkan waktu lebih lama. Periksa koneksi, lalu coba lagi."
        : "Koneksi belum tersedia. Periksa jaringan dan coba lagi.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function rememberPayment(orderId: string, ownerId: string) {
  try {
    sessionStorage.setItem(`payment_order:${ownerId}`, orderId);
  } catch {
    /* Callback already contains the order ID. */
  }
}

export function recalledPayment(ownerId: string) {
  try {
    return (
      sessionStorage.getItem(`payment_order:${ownerId}`) ||
      sessionStorage.getItem("payment_order") ||
      ""
    );
  } catch {
    return "";
  }
}

export function safeReturn(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}

export const dateLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      })
    : "Tanpa batas waktu";

export function loginDestination(role: string, next: string | null) {
  return next ? safeReturn(next) : role === "admin" ? "/admin" : "/dashboard";
}

export interface PackageInfo {
  id: string;
  title: string;
  description: string;
  is_premium: boolean;
  category: string;
  question_count: number;
  duration_minutes: number;
  is_ready: boolean;
  access_reason?: string;
  start_at?: string | null;
  end_at?: string | null;
  user_status?: string | null;
  session_id?: string | null;
  is_weekly?: boolean;
}

export interface SessionInfo {
  id: string;
  package_id: string;
  package_title: string;
  status: string;
  start_time: string;
  end_time: string;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  is_passed: boolean;
}

export const fetcher = async (url: string) => {
  const response = await fetch(`${API_URL}${url}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Data belum dapat dimuat.");
  return response.json();
};
