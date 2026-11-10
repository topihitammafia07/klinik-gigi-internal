import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { useDebounce } from './useDebounce';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type SearchResultType = 'patient' | 'appointment' | 'billing';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  /** Teks utama yang ditampilkan (nama pasien, dll) */
  label: string;
  /** Sub-text singkat (no RM, tanggal, status, dll) */
  sub: string;
  /** URL tujuan saat item diklik */
  url: string;
  // field asli — patient
  full_name?: string;
  medical_record_number?: string;
  phone?: string;
  gender?: string;
  // field asli — appointment
  appointment_date?: string;
  time_start?: string;
  status?: string;
  patient_name?: string;
  therapist_name?: string;
  // field asli — billing
  total_amount?: number;
  payment_status?: string;
  created_at?: string;
}

export interface GlobalSearchResponse {
  patients: SearchResult[];
  appointments: SearchResult[];
  billings: SearchResult[];
  total: number;
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useGlobalSearch(query: string, limit = 5) {
  const debouncedQuery = useDebounce(query.trim(), 300);

  return useQuery<GlobalSearchResponse>({
    queryKey: ['global-search', debouncedQuery, limit],
    queryFn: async () => {
      const { data } = await apiClient.get('/search', {
        params: { q: debouncedQuery, limit },
      });
      // data.data adalah GlobalSearchResponse dari ApiResponse trait
      return (data.data ?? { patients: [], appointments: [], billings: [], total: 0 }) as GlobalSearchResponse;
    },
    enabled: debouncedQuery.length >= 2,
    // Jaga agar dropdown tidak "kedip" saat refetch
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}