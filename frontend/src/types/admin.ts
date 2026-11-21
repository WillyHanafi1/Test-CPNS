export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TopAttemptedPackage {
  id: string;
  title: string;
  category: string;
  attempts: number;
  avg_score: number;
  pass_rate: number;
}

export interface AdminOverviewStats {
  total_users: number;
  participants_count?: number;
  pro_users_count?: number;
  total_packages: number;
  published_packages?: number;
  total_questions: number;
  published_questions?: number;
  total_revenue: number;
  pro_revenue?: number;
  donation_revenue?: number;
  success_transactions: number;
  active_exams: number;
  finished_sessions_7d?: number;
}

export interface AdminExamAnalytics {
  avg_total_score: number;
  avg_twk: number;
  avg_tiu: number;
  avg_tkp: number;
  pass_rate: number;
  total_finished_sessions?: number;
  score_distribution: ChartDataPoint[];
}

export interface AdminRevenueAnalytics {
  daily_revenue: ChartDataPoint[];
  top_packages: { title: string; sales: number }[];
  category_share: ChartDataPoint[];
  revenue_by_type?: ChartDataPoint[];
  top_attempted_packages?: TopAttemptedPackage[];
}

export interface AdminRecentTransaction {
  id: string;
  order_id: string | null;
  email: string;
  transaction_type: string;
  amount: number;
  payment_status: string;
  created_at: string | null;
}

export interface AdminActionSummary {
  pending_feedback: number;
  pending_transactions: number;
  review_payment_events: number;
  draft_packages: number;
  ops_status: string;
  ops_issues_count: number;
  ops_issues: { code: string; message: string; count?: number }[];
  recent_transactions: AdminRecentTransaction[];
}

export interface AdminPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
  is_published: boolean;
  is_weekly: boolean;
  is_active: boolean;
  published_revision_id?: string | null;
  start_at: string | null;
  end_at: string | null;
  question_count: number;
  twk_count?: number;
  tiu_count?: number;
  tkp_count?: number;
}

export interface AdminPackageList {
  items: AdminPackage[];
  total: number;
  page: number;
  size: number;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
  question_count?: number;
  published_revision_id?: string | null;
  notice?: string;
}

export interface AdminQuestionOption {
  id?: string;
  label: string;
  content: string;
  image_url?: string | null;
  score: number;
}

export interface AdminQuestion {
  id: string;
  package_id: string;
  content: string;
  segment: "TWK" | "TIU" | "TKP" | string;
  sub_category?: string | null;
  number: number;
  image_url?: string | null;
  discussion?: string | null;
  options: AdminQuestionOption[];
}

export interface AdminQuestionList {
  items: AdminQuestion[];
  total: number;
  page: number;
  size: number;
}

export interface AdminTransaction {
  id: string;
  user_id: string;
  package_id: string | null;
  transaction_type: "pro_upgrade" | "donation" | string;
  order_id: string | null;
  payment_status: "pending" | "success" | "failed" | string;
  amount: number;
  payment_environment?: string | null;
  payment_expires_at?: string | null;
  paid_at?: string | null;
  access_expires_at: string | null;
  created_at: string;
  message?: string | null;
  is_anonymous?: boolean;
  user: { email: string };
  package?: { title: string } | null;
}

export interface AdminTransactionList {
  items: AdminTransaction[];
  total: number;
  page: number;
  size: number;
}

export interface AdminTransactionSummary {
  total_revenue: number;
  pro_revenue?: number;
  donation_revenue?: number;
  pro_count?: number;
  donation_count?: number;
  success_count: number;
  pending_count: number;
  failed_count: number;
}

export interface AdminUserProfile {
  full_name: string;
  target_instansi?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "participant" | string;
  is_active: boolean;
  auth_provider?: string;
  created_at: string;
  profile: AdminUserProfile | null;
  is_pro: boolean;
  pro_expires_at: string | null;
  total_sessions: number;
  total_transactions: number;
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
}

export interface AdminFeedback {
  id: string;
  user_id: string;
  category: "suggestion" | "bug" | "correction" | "other" | string;
  content: string;
  status: "pending" | "reviewed" | "in_progress" | "resolved" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  admin_notes?: string | null;
  path_context?: string | null;
  created_at: string;
  user?: { email: string } | null;
}

export interface AdminFeedbackList {
  items: AdminFeedback[];
  total: number;
  page: number;
  size: number;
  counts_by_status?: Record<string, number>;
}

export interface AdminInfrastructureHealth {
  status: string;
  observed_at: string;
  scoring: Record<string, number>;
  payment_events: Record<string, number>;
  worker_heartbeat_age_seconds: number | null;
  payment_worker_heartbeat_age_seconds?: number | null;
  oldest_pending_seconds: number;
  overdue_ongoing_sessions?: number;
  legacy_unfinished_sessions?: number;
  last_acknowledged_answer_at?: string | null;
  redis_available?: boolean;
  issues: { code: string; message: string; count?: number }[];
  host?: {
    disk_free_gib: number;
    backup?: Record<string, { destination?: string; age_hours?: number }>;
  } | null;
}

export interface AdminInfrastructureJob {
  id: string;
  kind: "scoring" | "payment" | string;
  status: string;
  attempts: number;
  created_at: string;
  last_error: string | null;
}
