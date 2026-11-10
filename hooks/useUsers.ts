import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { TherapistScheduleDay, TherapistUnavailability, UserWithProfile, UserFormData, UserListParams } from '@/types/user';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';
import { liveQueryOptions } from '@/hooks/useLivePolling';

// ─────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  // Non-paginated list for dropdowns (appointments etc.)
  therapists: () => [...userKeys.all, 'therapists'] as const,
  therapistSchedule: (id: number) => [...userKeys.detail(id), 'schedule'] as const,
  therapistUnavailabilities: (id: number) => [...userKeys.detail(id), 'unavailabilities'] as const,
};

// ─────────────────────────────────────────────────────────────
// Fetch paginated user list (for management page)
// ─────────────────────────────────────────────────────────────
export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<UserWithProfile>>('/users', {
        params: {
          role: params.role || undefined,
          page: params.page || 1,
          per_page: params.per_page || 10,
        },
      });
      return data.data;
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Fetch single user detail
// ─────────────────────────────────────────────────────────────
export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<UserWithProfile>>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────
// Fetch therapist list (non-paginated, for appointment form)
// ─────────────────────────────────────────────────────────────
export function useTherapists() {
  return useQuery({
    queryKey: userKeys.therapists(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<UserWithProfile[]>>('/therapists');
      return data.data ?? [];
    },
    ...liveQueryOptions('slow'), // 30s cukup — daftar terapis jarang berubah, cuma perlu ikut update perlahan
  });
}

// ─────────────────────────────────────────────────────────────
// Helper: build multipart FormData from UserFormData (handles photo file)
// ─────────────────────────────────────────────────────────────
function toFormData(payload: Partial<UserFormData>): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'photo') {
      if (value instanceof File) fd.append('photo', value);
      return;
    }
    fd.append(key, String(value));
  });
  return fd;
}

// ─────────────────────────────────────────────────────────────
// Create user
// ─────────────────────────────────────────────────────────────
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UserFormData) => {
      const { data } = await apiClient.post<ApiResponse<UserWithProfile>>(
        '/users',
        toFormData(payload),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.therapists() });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Update user
// Laravel tidak mem-parsing multipart body pada method PUT asli,
// jadi kirim via POST dengan method-spoofing (_method=PUT).
// ─────────────────────────────────────────────────────────────
export function useUpdateUser(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<UserFormData>) => {
      const fd = toFormData(payload);
      fd.append('_method', 'PUT');
      const { data } = await apiClient.post<ApiResponse<UserWithProfile>>(
        `/users/${id}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.therapists() });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Delete user
// ─────────────────────────────────────────────────────────────
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/users/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.therapists() });
    },
  });
}
// ─────────────────────────────────────────────────────────────
// Owner-only password reset for staff accounts.
// Password mutation intentionally uses a dedicated endpoint so
// normal profile edits never change credentials implicitly.
// ─────────────────────────────────────────────────────────────
export function useResetUserPassword(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { password: string; password_confirmation: string }) => {
      const { data } = await apiClient.patch<ApiResponse<null>>(
        `/users/${id}/reset-password`,
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}


export function useTherapistSchedule(id: number, enabled = true) {
  return useQuery({
    queryKey: userKeys.therapistSchedule(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TherapistScheduleDay[]>>(`/therapists/${id}/schedule`);
      return data.data ?? [];
    },
    enabled: enabled && id > 0,
    staleTime: 30_000,
  });
}

export function useUpdateTherapistSchedule(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: TherapistScheduleDay[]) => {
      const { data } = await apiClient.put<ApiResponse<TherapistScheduleDay[]>>(
        `/therapists/${id}/schedule`,
        { schedule },
      );
      return data.data ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.therapistSchedule(id) });
    },
  });
}

export function useTherapistUnavailabilities(id: number) {
  return useQuery({
    queryKey: userKeys.therapistUnavailabilities(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TherapistUnavailability[]>>(
        `/therapists/${id}/unavailabilities`,
      );
      return data.data ?? [];
    },
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateTherapistUnavailability(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { date: string; reason?: string }) => {
      const { data } = await apiClient.post<ApiResponse<TherapistUnavailability>>(
        `/therapists/${id}/unavailabilities`,
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.therapistUnavailabilities(id) });
    },
  });
}

export function useDeleteTherapistUnavailability(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unavailabilityId: number) => {
      await apiClient.delete(`/therapists/${id}/unavailabilities/${unavailabilityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.therapistUnavailabilities(id) });
    },
  });
}
