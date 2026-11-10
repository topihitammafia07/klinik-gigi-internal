import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { ClinicGalleryItem, ClinicGalleryFormData } from '@/types/gallery';
import type { ApiResponse } from '@/types/auth';

export const galleryKeys = {
  all: ['galleries'] as const,
  list: () => [...galleryKeys.all, 'list'] as const,
};

// ─────────────────────────────────────────────────────────────
// Fetch gallery list
// ─────────────────────────────────────────────────────────────
export function useGalleries() {
  return useQuery({
    queryKey: galleryKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ClinicGalleryItem[]>>('/galleries');
      return data.data ?? [];
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Helper: build multipart FormData
// ─────────────────────────────────────────────────────────────
function toFormData(payload: ClinicGalleryFormData): FormData {
  const fd = new FormData();
  if (payload.title) fd.append('title', payload.title);
  if (payload.sort_order !== undefined) fd.append('sort_order', String(payload.sort_order));
  if (payload.image instanceof File) fd.append('image', payload.image);
  return fd;
}

// ─────────────────────────────────────────────────────────────
// Create gallery image
// ─────────────────────────────────────────────────────────────
export function useCreateGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ClinicGalleryFormData) => {
      const { data } = await apiClient.post<ApiResponse<ClinicGalleryItem>>(
        '/galleries',
        toFormData(payload),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Update gallery image
// ─────────────────────────────────────────────────────────────
export function useUpdateGallery(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<ClinicGalleryFormData>) => {
      const fd = toFormData(payload as ClinicGalleryFormData);
      fd.append('_method', 'PUT');
      const { data } = await apiClient.post<ApiResponse<ClinicGalleryItem>>(
        `/galleries/${id}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Delete gallery image
// ─────────────────────────────────────────────────────────────
export function useDeleteGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/galleries/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list() });
    },
  });
}
