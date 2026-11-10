export interface DashboardMetrics {
  total_patients: number;
  revenue_today: number;
  revenue_this_month: number;
  visits_by_status: {
    waiting: number;
    ongoing: number;
    done: number;
  };
}

export interface TherapistActivity {
  therapist_id: number;
  therapist_name: string;
  visit_count: number;
  done_count: number;
  ongoing_count: number;
}

export interface MonthlyRevenue {
  month: number;        // 1–12
  month_label: string;  // 'Jan', 'Feb', …
  revenue: number;
  /** Revenue dari billing manual (di luar redeem paket) */
  billing_revenue?: number;
  /** Revenue dari penjualan paket terapi baru (dihitung per tanggal beli) */
  package_revenue?: number;
  visit_count: number;
}

export interface DailyReport {
  date: string;
  visit_count: number;
  revenue: number;
  billing_revenue?: number;
  package_revenue?: number;
  paid_count: number;
  unpaid_count: number;
}

export interface WeeklyReport {
  week_start: string;   // yyyy-MM-dd, Senin
  week_end: string;     // yyyy-MM-dd, Minggu
  week_label: string;   // 'Minggu 1 (1–7 Mei)'
  visit_count: number;
  revenue: number;
  billing_revenue?: number;
  package_revenue?: number;
  paid_count: number;
  unpaid_count: number;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  therapist_activity: TherapistActivity[];
  monthly_revenue: MonthlyRevenue[];
}

export interface ReportParams {
  start?: string;
  end?: string;
  year?: number;
  /** Filter opsional — hanya berlaku untuk role owner/pj_klinik. Untuk role terapis, backend selalu scope ke user login sendiri. */
  therapist_id?: number;
}