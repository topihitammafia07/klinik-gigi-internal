import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/auth';
import type { User } from '@/types/auth';

export interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  current_password?: string;
  password?: string;
}

// ─────────────────────────────────────────────────────────────
// Update profil milik sendiri.
// Password hanya diproses backend jika user login adalah Owner.
// ─────────────────────────────────────────────────────────────
export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload: Partial<ProfileFormData>) => {
      const { data } = await apiClient.put<ApiResponse<User>>('/auth/profile', payload);
      return data.data;
    },
  });
}