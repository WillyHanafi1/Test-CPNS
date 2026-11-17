export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "network_unavailable",
      "Koneksi belum tersedia. Periksa jaringan dan coba lagi.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    throw new ApiError(
      response.status,
      typeof detail === "object" ? detail?.code : "",
      typeof detail === "string"
        ? detail
        : detail?.message || "Permintaan belum berhasil. Silakan coba lagi.",
    );
  }
  return data as T;
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
