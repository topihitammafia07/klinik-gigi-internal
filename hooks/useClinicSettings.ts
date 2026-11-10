import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/auth';
import type {
  ClinicSettings,
  RevenueDistribution,
  RevenuePreview,
  RevenueTeamMember,
  TherapistRecapResponse,
  TherapyServiceAgePrice,
} from '@/types/clinic-settings';
import type { TherapyService } from '@/types/billing';
import { serviceKeys } from '@/hooks/useBilling';

export const clinicSettingKeys = {
  all: ['clinic-settings'] as const,
  detail: () => [...clinicSettingKeys.all, 'detail'] as const,
  agePrices: (serviceId: number) => [...clinicSettingKeys.all, 'age-prices', serviceId] as const,
  revenue: () => [...clinicSettingKeys.all, 'revenue-distributions'] as const,
  revenuePreview: (start: string, end: string) => [...clinicSettingKeys.revenue(), 'preview', start, end] as const,
  revenueTeam: () => [...clinicSettingKeys.revenue(), 'team'] as const,
  therapistRecap: () => [...clinicSettingKeys.all, 'therapist-recap'] as const,
};

export function useClinicSettings() {
  return useQuery({
    queryKey: clinicSettingKeys.detail(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ClinicSettings>>('/clinic-settings');
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateClinicSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<ClinicSettings>) => {
      const { data } = await apiClient.put<ApiResponse<ClinicSettings>>('/clinic-settings', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicSettingKeys.detail() });
    },
  });
}

export function useUpdateTherapyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<TherapyService> }) => {
      const { data } = await apiClient.put<ApiResponse<TherapyService>>(`/therapy-services/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useAgePrices(serviceId: number) {
  return useQuery({
    queryKey: clinicSettingKeys.agePrices(serviceId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TherapyServiceAgePrice[]>>(
        `/therapy-services/${serviceId}/age-prices`,
      );
      return data.data ?? [];
    },
    enabled: serviceId > 0,
    staleTime: 60_000,
  });
}

export interface AgePricePayload {
  category_name: string;
  min_age: number;
  max_age: number | null;
  price: number;
  is_active?: boolean;
}

export function useCreateAgePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, payload }: { serviceId: number; payload: AgePricePayload }) => {
      const { data } = await apiClient.post<ApiResponse<TherapyServiceAgePrice>>(
        `/therapy-services/${serviceId}/age-prices`,
        payload,
      );
      return data.data;
    },
    onSuccess: (_agePrice, variables) => {
      queryClient.invalidateQueries({ queryKey: clinicSettingKeys.agePrices(variables.serviceId) });
    },
  });
}

export function useUpdateAgePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      agePriceId,
      payload,
    }: {
      serviceId: number;
      agePriceId: number;
      payload: AgePricePayload;
    }) => {
      const { data } = await apiClient.put<ApiResponse<TherapyServiceAgePrice>>(
        `/therapy-services/${serviceId}/age-prices/${agePriceId}`,
        payload,
      );
      return data.data;
    },
    onSuccess: (_agePrice, variables) => {
      queryClient.invalidateQueries({ queryKey: clinicSettingKeys.agePrices(variables.serviceId) });
    },
  });
}

export function useDeleteAgePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, agePriceId }: { serviceId: number; agePriceId: number }) => {
      await apiClient.delete(`/therapy-services/${serviceId}/age-prices/${agePriceId}`);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: clinicSettingKeys.agePrices(variables.serviceId) });
    },
  });
}

interface RevenuePaginator {
  data: RevenueDistribution[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export function useRevenueDistributions(page = 1, perPage = 5) {
  return useQuery({
    queryKey: [...clinicSettingKeys.revenue(), page, perPage],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RevenuePaginator>>('/revenue-distributions', {
        params: { page, per_page: perPage },
      });
      return data.data;
    },
  });
}

export function useRevenueTeam() {
  return useQuery({
    queryKey: clinicSettingKeys.revenueTeam(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RevenueTeamMember[]>>('/revenue-distributions/team');
      return data.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useRevenuePreview(start: string, end: string) {
  return useQuery({
    queryKey: clinicSettingKeys.revenuePreview(start, end),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RevenuePreview>>(
        '/revenue-distributions/preview',
        { params: { period_start: start, period_end: end } },
      );
      return data.data;
    },
    enabled: Boolean(start && end && end >= start),
    staleTime: 15_000,
  });
}

export function useCreateRevenueDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      period_start: string;
      period_end: string;
      allocations: Array<{ user_id: number; amount: number }>;
      notes?: string;
    }) => {
      const { data } = await apiClient.post<ApiResponse<RevenueDistribution>>(
        '/revenue-distributions',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicSettingKeys.revenue() });
    },
  });
}

export function useTherapistRecap() {
  return useQuery({
    queryKey: clinicSettingKeys.therapistRecap(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TherapistRecapResponse>>('/therapist-recap');
      return data.data;
    },
    refetchInterval: 60_000,
  });
}
