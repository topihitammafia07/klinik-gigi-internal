import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
  Billing, BillingFormData, PaymentUpdateData, RecordPaymentData,
  BillingListParams, TherapyService,
} from '@/types/billing';
import type { ApiResponse, PaginatedResponse } from '@/types/auth';
import { patientKeys } from '@/hooks/usePatients';
import { treatmentPackageKeys } from '@/hooks/useTreatmentPackages';
import { liveQueryOptions } from '@/hooks/useLivePolling';

export const billingKeys = {
  all: ['billings'] as const,
  lists: () => [...billingKeys.all, 'list'] as const,
  list: (params: BillingListParams) => [...billingKeys.lists(), params] as const,
  details: () => [...billingKeys.all, 'detail'] as const,
  detail: (id: number) => [...billingKeys.details(), id] as const,
};

export const serviceKeys = {
  all: ['therapy-services'] as const,
  list: () => [...serviceKeys.all, 'list'] as const,
};

export function useBillings(params: BillingListParams = {}) {
  return useQuery({
    queryKey: billingKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Billing>>('/billings', {
        params: {
          patient_id: params.patient_id || undefined,
          payment_status: params.payment_status || undefined,
          page: params.page || 1,
          per_page: params.per_page || 10,
        },
      });
      return data.data;
    },
    ...liveQueryOptions('normal'), // 10s — status pembayaran perlu kelihatan lintas resepsionis/owner
  });
}

export function useBilling(id: number) {
  return useQuery({
    queryKey: billingKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Billing>>(`/billings/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useTherapyServices() {
  return useQuery({
    queryKey: serviceKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TherapyService[]>>('/therapy-services');
      return data.data ?? [];
    },
    staleTime: 5000, // 5s — responsive update when services are created or modified
  });
}

export function useCreateTherapyService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TherapyService>) => {
      const { data } = await apiClient.post<ApiResponse<TherapyService>>('/therapy-services', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useDeleteTherapyService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/therapy-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useCreateBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BillingFormData) => {
      const { data } = await apiClient.post<ApiResponse<Billing>>('/billings', payload);
      return data.data;
    },
    onSuccess: (billing) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });

      // Redeem paket (package_id di payload) juga mengubah used_sessions /
      // payment_status paket — ditampilkan lewat dua tempat berbeda:
      // GET /patients/{id} DAN query terpisah useTreatmentPackages
      // (dipakai TreatmentPackagesSection). Keduanya harus di-invalidate.
      if (billing?.patient_id) {
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(billing.patient_id) });
        queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
      }
    },
  });
}

export function useUpdatePaymentStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PaymentUpdateData) => {
      const { data } = await apiClient.patch<ApiResponse<Billing>>(
        `/billings/${id}/payment`,
        payload
      );
      return data.data;
    },
    onSuccess: (billing) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingKeys.detail(id) });

      // Billing yang terhubung ke paket terapi ikut mengubah payment_status
      // paket — ditampilkan lewat GET /patients/{id} DAN query terpisah
      // useTreatmentPackages (dipakai TreatmentPackagesSection). Tanpa
      // invalidate treatmentPackageKeys juga, section itu tetap nampilin
      // status lama sampai halaman di-refresh manual.
      if (billing?.patient_id) {
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(billing.patient_id) });
        queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
      }
    },
  });
}

// Batch 2 — catat transaksi pembayaran/DP nyata. Endpoint lama untuk update status
// tetap tersedia melalui useUpdatePaymentStatus supaya flow Batch 1 tidak dihapus.
export function useRecordBillingPayment(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentData) => {
      const { data } = await apiClient.post<ApiResponse<Billing>>(
        `/billings/${id}/payments`,
        payload,
      );
      return data.data;
    },
    onSuccess: (billing) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingKeys.detail(id) });

      if (billing?.patient_id) {
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(billing.patient_id) });
        queryClient.invalidateQueries({ queryKey: treatmentPackageKeys.all });
      }
    },
  });
}


export function useMarkBillingPrinted(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<Billing>>(`/billings/${id}/printed`, {});
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
    },
  });
}

// Konfirmasi invoice draft hasil auto-generate dari Booking landing page —
// menghilangkan badge "Draft, dari Booking" setelah resepsionis memvalidasi.
export function useConfirmBillingDraft(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch<ApiResponse<Billing>>(`/billings/${id}/confirm`, {});
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billingKeys.detail(id) });
    },
  });
}