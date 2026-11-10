import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { MedicalRecord, MedicalRecordFormData, IcfCode } from '@/types/medical-record';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';

export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  lists: () => [...medicalRecordKeys.all, 'list'] as const,
  byPatient: (patientId: number) => [...medicalRecordKeys.lists(), { patientId }] as const,
  byVisit: (visitId: number) => [...medicalRecordKeys.lists(), { visitId }] as const,
  details: () => [...medicalRecordKeys.all, 'detail'] as const,
  detail: (id: number) => [...medicalRecordKeys.details(), id] as const,
};

export function usePatientMedicalRecords(patientId: number) {
  return useQuery({
    queryKey: medicalRecordKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MedicalRecord>>(
        '/medical-records',
        { params: { patient_id: patientId, per_page: 50 } }
      );
      return data.data;
    },
    enabled: !!patientId,
  });
}

export function useVisitMedicalRecord(visitId: number) {
  return useQuery({
    queryKey: medicalRecordKeys.byVisit(visitId),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MedicalRecord>>(
        '/medical-records',
        { params: { visit_id: visitId } }
      );
      // return first record for this visit
      return data.data?.data?.[0] ?? null;
    },
    enabled: !!visitId,
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MedicalRecordFormData) => {
      const { data } = await apiClient.post<ApiResponse<MedicalRecord>>(
        '/medical-records',
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.lists() });
    },
  });
}

export function useUpdateMedicalRecord(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MedicalRecordFormData>) => {
      const { data } = await apiClient.put<ApiResponse<MedicalRecord>>(
        `/medical-records/${id}`,
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.lists() });
    },
  });
}

export function useIcfSearch(query: string) {
  return useQuery({
    queryKey: ['icf-search', query],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<IcfCode[]>>('/icf/search', {
        params: { q: query },
      });
      return data.data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 min cache — ICF codes don't change
  });
}
