import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
  TreatmentPackage, TreatmentPackageFormData, TreatmentPackageListParams,
} from '@/types/treatment-package';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';

export const treatmentPackageKeys = {
  all: ['treatment-packages'] as const,
  lists: () => [...treatmentPackageKeys.all, 'list'] as const,
  list: (params: TreatmentPackageListParams) => [...treatmentPackageKeys.lists(), params] as const,
  details: () => [...treatmentPackageKeys.all, 'detail'] as const,
  detail: (id: number) => [...treatmentPackageKeys.details(), id] as const,
  active: (patientId: number, serviceId?: number) =>
    [...treatmentPackageKeys.all, 'active', patientId, serviceId] as const,
};

export function useTreatmentPackages(params: TreatmentPackageListParams = {}) {
  return useQuery({
    queryKey: treatmentPackageKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<TreatmentPackage>>('/treatment-packages', {
        params: {
          patient_id: params.patient_id || undefined,
          status: params.status || undefined,
          page: params.page || 1,
        },
      });
      return data.data;
    },
    enabled: !!params.patient_id,
  });
}

export function useTreatmentPackage(id: number) {
  return useQuery({
    queryKey: treatmentPackageKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TreatmentPackage>>(`/treatment-packages/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// Paket aktif pasien untuk service tertentu — dipakai di form invoice.
export function useActivePackages(patientId: number, serviceId?: number) {
  return useQuery({
    queryKey: treatmentPackageKeys.active(patientId, serviceId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TreatmentPackage[]>>(
        `/patients/${patientId}/active-packages`,
        { params: { service_id: serviceId || undefined } }
      );
      return data.data ?? [];
    },
    enabled: !!patientId,
  });
}

export function useCreateTreatmentPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TreatmentPackageFormData) => {
      const { data } = await apiClient.post<ApiResponse<TreatmentPackage>>('/treatment-packages', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
    },
  });
}

export interface TreatmentPackageUpdateData {
  name?: string;
  price_total?: number;
  payment_status?: TreatmentPackage['payment_status'];
  expired_at?: string | null;
  notes?: string | null;
}

export function useUpdateTreatmentPackage(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TreatmentPackageUpdateData) => {
      const { data } = await apiClient.put<ApiResponse<TreatmentPackage>>(
        `/treatment-packages/${id}`,
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
    },
  });
}

export function useCancelTreatmentPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch<ApiResponse<TreatmentPackage>>(
        `/treatment-packages/${id}/cancel`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
    },
  });
}