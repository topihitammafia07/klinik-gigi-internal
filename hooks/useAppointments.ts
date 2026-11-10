import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Appointment, AppointmentFormData, AppointmentListParams } from '@/types/appointment';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';
import type { Billing } from '@/types/billing';
import { billingKeys } from '@/hooks/useBilling';
import { liveQueryOptions } from '@/hooks/useLivePolling';

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (params: AppointmentListParams) => [...appointmentKeys.lists(), params] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...appointmentKeys.details(), id] as const,
};

export function useAppointments(params: AppointmentListParams = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Appointment>>('/appointments', {
        params: {
          date: params.date || undefined,
          therapist_id: params.therapist_id || undefined,
          status: params.status || undefined,
          page: params.page || 1,
          per_page: params.per_page || 10,
        },
      });
      return data.data;
    },
    ...liveQueryOptions('normal'), // auto-refresh tiap 10s, tanpa spam saat tab tidak aktif
  });
}

export function useAppointment(id: number) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Appointment>>(`/appointments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AppointmentFormData) => {
      const { data } = await apiClient.post<ApiResponse<Appointment>>('/appointments', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    // API route: DELETE /appointments/{id} → AppointmentController::destroy
    // yang mengubah status ke 'cancelled' (bukan hapus fisik)
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete<ApiResponse<Appointment>>(
        `/appointments/${id}`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

// Batch 2 — buat/siapkan biaya pendaftaran sebelum tindakan berdasarkan
// aturan pasien baru/lama yang ditentukan Owner. Endpoint mengembalikan billing.
export function usePrepareRegistrationFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: number) => {
      const { data } = await apiClient.post<ApiResponse<Billing>>(
        `/appointments/${appointmentId}/registration-fee`,
        {},
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}
