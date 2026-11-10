import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { Patient, PatientFormData, PatientListParams } from '@/types/patient';
import { PaginatedResponse, ApiResponse } from '@/types/auth';

// Query keys
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
};

// Fetch list pasien
export function usePatients(params: PatientListParams = {}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Patient>>('/patients', {
        params: {
          search: params.search || undefined,
          page: params.page || 1,
          per_page: params.per_page || 10,
          status: params.status || undefined,
        },
      });
      return data.data;
    },
  });
}

// Fetch detail pasien
export function usePatient(id: number) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// Create pasien
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PatientFormData) => {
      const { data } = await apiClient.post<ApiResponse<Patient>>('/patients', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

// Update pasien
export function useUpdatePatient(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<PatientFormData>) => {
      const { data } = await apiClient.put<ApiResponse<Patient>>(`/patients/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) });
    },
  });
}

// Overwrite tanggal patient_since (ubah status baru/lama pasien)
export function useUpdatePatientSince(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient_since: string) => {
      const { data } = await apiClient.patch<ApiResponse<Patient>>(
        `/patients/${id}/patient-since`,
        { patient_since }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) });
    },
  });
}

// Delete pasien
export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/patients/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}