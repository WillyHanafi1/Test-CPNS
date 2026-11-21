export interface PublicStats {
  packages_count: number;
  questions_count: number;
  users_count?: number;
  completed_sessions_count?: number;
}

export interface TrustMetric {
  id: "questions" | "packages" | "sessions" | "users";
  value: string;
  label: string;
}

function parseThreshold(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export const USER_COUNT_MIN_THRESHOLD = parseThreshold(
  process.env.NEXT_PUBLIC_SHOW_USER_COUNT_MIN,
  100,
);

export const SESSION_COUNT_MIN_THRESHOLD = 10;

export function formatCount(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString("id-ID");
}

export function buildTrustMetrics(
  stats: PublicStats | null | undefined,
  userThreshold = USER_COUNT_MIN_THRESHOLD,
): TrustMetric[] {
  if (!stats) return [];
  const metrics: TrustMetric[] = [];

  if (typeof stats.questions_count === "number" && stats.questions_count > 0) {
    metrics.push({
      id: "questions",
      value: formatCount(stats.questions_count),
      label: "Soal SKD & pembahasan",
    });
  }

  if (typeof stats.packages_count === "number" && stats.packages_count > 0) {
    metrics.push({
      id: "packages",
      value: formatCount(stats.packages_count),
      label: "Paket simulasi terbit",
    });
  }

  if (
    typeof stats.completed_sessions_count === "number" &&
    stats.completed_sessions_count >= SESSION_COUNT_MIN_THRESHOLD
  ) {
    metrics.push({
      id: "sessions",
      value: formatCount(stats.completed_sessions_count),
      label: "Sesi latihan selesai",
    });
  }

  if (
    typeof stats.users_count === "number" &&
    stats.users_count > 0 &&
    stats.users_count >= userThreshold
  ) {
    metrics.push({
      id: "users",
      value: formatCount(stats.users_count),
      label: "Peserta terdaftar",
    });
  }

  return metrics;
}
