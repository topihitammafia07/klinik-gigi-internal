// Re-export from useDashboard — semua report hooks sudah ada di sana.
// File ini sebagai alias agar import path konsisten di /reports page.
export {
  useDailyReport,
  useWeeklyReport,
  useMonthlyReport,
  useCategoryReport,
  dashboardKeys,
} from './useDashboard';
export type { ReportParams } from '@/types/dashboard';
export type { CategoryReportItem } from './useDashboard';
