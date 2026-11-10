/**
 * hooks/useLivePolling.ts
 *
 * Config generator untuk "live fetching" yang aman via React Query polling.
 * Pengganti Redis-SSE yang bermasalah (500 error, worker blocking di PHP-FPM).
 *
 * Kenapa polling, bukan SSE:
 * - SSE butuh koneksi HTTP tetap terbuka -> gampang kena timeout Nginx/PHP-FPM,
 *   apalagi kalau PHP-FPM pool size kecil (tiap SSE conn = 1 worker nyangkut).
 * - Polling = request HTTP biasa, stateless, cocok sama arsitektur
 *   Vercel (frontend) + VPS Nginx/PHP-FPM (backend) yang kamu pakai sekarang.
 * - refetchIntervalInBackground: false -> tab yang di-minimize/pindah gak nembak
 *   server terus, jadi hit ke server jauh lebih hemat dibanding naive setInterval.
 *
 * Cara pakai di hook lain:
 *
 *   return useQuery({
 *     queryKey: appointmentKeys.list(params),
 *     queryFn: ...,
 *     ...liveQueryOptions('normal'), // atau 'fast' / 'slow'
 *   });
 */

export type LiveSpeed = 'fast' | 'normal' | 'slow';

const INTERVALS: Record<LiveSpeed, number> = {
  fast: 5_000,    // dipakai untuk data yang butuh cepat kelihatan lintas user,
                  // contoh: antrian/status kunjungan hari ini
  normal: 10_000, // default untuk sebagian besar list (appointments, billing, dsb)
  slow: 30_000,   // data yang jarang berubah tapi tetap mau auto-update
                  // contoh: laporan, dashboard ringkasan
};

/**
 * Live polling options. Hanya polling saat tab aktif & window focus,
 * supaya tidak spam hit ke server saat user pindah tab / minimize.
 */
export function liveQueryOptions(speed: LiveSpeed = 'normal') {
  return {
    refetchInterval: INTERVALS[speed],
    refetchIntervalInBackground: false, // stop polling kalau tab tidak aktif
    refetchOnWindowFocus: true,          // langsung refresh begitu user balik ke tab
    refetchOnReconnect: true,            // refresh kalau internet sempat putus-nyambung
    staleTime: 0,                        // data selalu dianggap stale, biar polling efektif
  } as const;
}