import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { PatientVisit, VisitListParams, VisitStatus } from '@/types/visit';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';
import { appointmentKeys } from '@/hooks/useAppointments';
import { liveQueryOptions } from '@/hooks/useLivePolling';

export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (params: VisitListParams) => [...visitKeys.lists(), params] as const,
  details: () => [...visitKeys.all, 'detail'] as const,
  detail: (id: number) => [...visitKeys.details(), id] as const,
};

export function useVisits(params: VisitListParams = {}) {
  return useQuery({
    queryKey: visitKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<PatientVisit>>('/visits', {
        params: {
          status: params.status || undefined,
          therapist_id: params.therapist_id || undefined,
          patient_id: params.patient_id || undefined,
          date: params.date || undefined,
          without_billing: params.without_billing ? 1 : undefined,
          page: params.page || 1,
          per_page: params.per_page || 10,
        },
      });
      return data.data;
    },
    ...liveQueryOptions('fast'), // 5s — resepsionis & terapis sama-sama pantau status kunjungan ini
  });
}

export function useVisit(id: number) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<PatientVisit>>(`/visits/${id}`);
      return data.data;
    },
    enabled: !!id,
    ...liveQueryOptions('fast'),
  });
}

export interface CreateVisitPayload {
  appointment_id: number;
  complaint: string;
  diagnosis?: string;
  therapy_type?: string;
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateVisitPayload) => {
      const { data } = await apiClient.post<ApiResponse<PatientVisit>>('/visits', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

export function useUpdateVisitStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: VisitStatus }) => {
      const { data } = await apiClient.patch<ApiResponse<PatientVisit>>(
        `/visits/${id}/status`,
        { status }
      );
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.detail(id) });
    },
  });
}