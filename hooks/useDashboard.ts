import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { DashboardResponse, DailyReport, WeeklyReport, MonthlyRevenue, ReportParams } from '@/types/dashboard';
import { ApiResponse } from '@/types/auth';
import { liveQueryOptions } from '@/hooks/useLivePolling';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  daily: (params: ReportParams) => [...dashboardKeys.all, 'daily', params] as const,
  weekly: (params: ReportParams) => [...dashboardKeys.all, 'weekly', params] as const,
  monthly: (params: ReportParams) => [...dashboardKeys.all, 'monthly', params] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardResponse>>('/dashboard');
      return data.data;
    },
    retry: 2,
    ...liveQueryOptions('normal'), // ringkasan card (Total Jadwal/Menunggu/dst) — 10s
  });
}

export function useDailyReport(params: ReportParams) {
  return useQuery({
    // therapist_id ikut masuk queryKey supaya tiap kombinasi filter punya cache sendiri
    queryKey: dashboardKeys.daily(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DailyReport[]>>('/reports/daily', { params });
      return data.data;
    },
    enabled: !!(params.start && params.end),
    staleTime: 120_000,
  });
}

export function useWeeklyReport(params: ReportParams) {
  return useQuery({
    queryKey: dashboardKeys.weekly(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<WeeklyReport[]>>('/reports/weekly', { params });
      return data.data;
    },
    enabled: !!(params.start && params.end),
    staleTime: 120_000,
  });
}

export function useMonthlyReport(params: ReportParams) {
  return useQuery({
    queryKey: dashboardKeys.monthly(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MonthlyRevenue[]>>('/reports/monthly', { params });
      return data.data;
    },
    enabled: !!params.year,
    staleTime: 120_000,
  });
}

export interface CategoryReportItem {
  category: string;
  category_label: string;
  service_count: number;
  total_qty: number;
  total_revenue: number;
}

export function useCategoryReport(params: { start?: string; end?: string } = {}) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'category', params] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<CategoryReportItem[]>>('/reports/by-category', { params });
      return data.data ?? [];
    },
    staleTime: 60_000,
  });
}