import { useMemo } from 'react';
import { format } from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { useTherapists } from '@/hooks/useUsers';
import type { Appointment } from '@/types/appointment';
import type { UserWithProfile } from '@/types/user';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TherapistOperationalStatus = 'operating' | 'upcoming' | 'idle';

export interface TherapistStatusItem {
  therapist_id: number;
  therapist_name: string;
  specialization: string | null;
  status: TherapistOperationalStatus;
  /** Appointment yang sedang berlangsung (ongoing visit) */
  current_appointment?: Appointment;
  /** Appointment berikutnya hari ini */
  next_appointment?: Appointment;
  /** Menit tersisa hingga jadwal berikutnya dimulai */
  minutes_until_next?: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/**
 * Batas maju (menit) dari sekarang untuk mempertimbangkan
 * sebuah appointment sebagai "akan berlangsung segera".
 * Frontend-only: tidak ada round-trip ke server.
 */
const UPCOMING_THRESHOLD_MINUTES = 90;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Konversi "HH:mm:ss" atau "HH:mm" ke total menit sejak tengah malam */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/**
 * Hitung status operasional satu terapis berdasarkan semua appointment hari ini.
 *
 * Prioritas status (dari tertinggi ke terendah):
 *  1. OPERATING  — ada visit dengan status "ongoing"
 *  2. OPERATING  — ada appointment "done" yang visit-nya "waiting"
 *                  (pasien sudah check-in / diterima tapi terapis masih menangani)
 *  3. UPCOMING   — ada appointment scheduled/done dengan visit waiting yang
 *                  time_start-nya dalam UPCOMING_THRESHOLD_MINUTES ke depan
 *  4. IDLE       — tidak ada kondisi di atas, tapi tetap tampilkan jadwal
 *                  berikutnya yang masih pending hari ini (jika ada)
 */
function computeTherapistStatus(
  appointments: Appointment[],
  nowMinutes: number,
): {
  status: TherapistOperationalStatus;
  current_appointment?: Appointment;
  next_appointment?: Appointment;
  minutes_until_next?: number;
} {
  // ── 1. Visit sedang ongoing → Beroperasi ──────────────────────────────────
  const ongoingAppt = appointments.find((a) => a.visit?.status === 'ongoing');
  if (ongoingAppt) {
    const nextAfterOngoing = appointments
      .filter((a) => a !== ongoingAppt && isActiveAppointment(a))
      .map((a) => ({ appt: a, startMin: timeToMinutes(a.time_start) }))
      .filter(({ startMin }) => startMin > timeToMinutes(ongoingAppt.time_start))
      .sort((x, y) => x.startMin - y.startMin)[0];

    return {
      status: 'operating',
      current_appointment: ongoingAppt,
      next_appointment: nextAfterOngoing?.appt,
    };
  }

  // ── 2. Ada visit "waiting" yang appointment-nya sudah "done" ──────────────
  //    Artinya pasien sudah check-in/diterima (masuk kunjungan), tapi
  //    terapis belum mulai / masih menyelesaikan proses administrasi.
  //    Kondisi ini tetap dianggap "Beroperasi".
  const waitingVisitAppt = appointments.find(
    (a) => a.status === 'done' && a.visit?.status === 'waiting',
  );
  if (waitingVisitAppt) {
    const nextAfter = appointments
      .filter((a) => a !== waitingVisitAppt && isActiveAppointment(a))
      .map((a) => ({ appt: a, startMin: timeToMinutes(a.time_start) }))
      .filter(({ startMin }) => startMin > timeToMinutes(waitingVisitAppt.time_start))
      .sort((x, y) => x.startMin - y.startMin)[0];

    return {
      status: 'operating',
      current_appointment: waitingVisitAppt,
      next_appointment: nextAfter?.appt,
    };
  }

  // ── 3. Jadwal aktif yang belum mulai (scheduled, visit null atau waiting) ─
  //    Urutkan dari yang paling awal time_start-nya
  const pendingAppts = appointments
    .filter(isActiveAppointment)
    .map((a) => ({ appt: a, startMin: timeToMinutes(a.time_start) }))
    .sort((x, y) => x.startMin - y.startMin);

  if (pendingAppts.length > 0) {
    // Cari jadwal terdekat yang belum lewat
    const futureAppts = pendingAppts.filter(({ startMin }) => startMin >= nowMinutes);
    const candidate = futureAppts.length > 0 ? futureAppts[0] : null;

    if (candidate) {
      const diff = candidate.startMin - nowMinutes;
      if (diff <= UPCOMING_THRESHOLD_MINUTES) {
        // Dalam threshold → "Segera Beroperasi"
        return {
          status: 'upcoming',
          next_appointment: candidate.appt,
          minutes_until_next: diff,
        };
      }
      // Terlalu jauh ke depan → idle tapi tampilkan jadwal
      return { status: 'idle', next_appointment: candidate.appt };
    }

    // Semua sudah lewat tapi belum ada kunjungan → idle, tampilkan jadwal terdekat
    return { status: 'idle', next_appointment: pendingAppts[0].appt };
  }

  // ── 4. Semua appointment hari ini sudah selesai → idle murni ─────────────
  return { status: 'idle' };
}

/**
 * Appointment "aktif" = belum diproses menjadi kunjungan yang selesai.
 * Mencakup: scheduled tanpa visit, scheduled dengan visit waiting,
 * atau done dengan visit waiting (sudah check-in tapi belum ongoing).
 */
function isActiveAppointment(a: Appointment): boolean {
  if (a.visit?.status === 'done') return false;   // kunjungan sudah selesai
  if (a.visit?.status === 'ongoing') return false; // sedang ditangani (handled di step 1)
  // scheduled atau done dengan visit null/waiting → masih aktif
  return true;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export interface UseTherapistStatusReturn {
  therapists: TherapistStatusItem[];
  isLoading: boolean;
  isError: boolean;
  /** Refetch manual — berguna untuk tombol refresh di dashboard */
  refetch: () => void;
  /** Ringkasan per status */
  summary: {
    operating: number;
    upcoming: number;
    idle: number;
    total: number;
  };
}

export function useTherapistStatus(): UseTherapistStatusReturn {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch semua terapis (non-paginated)
  const {
    data: therapistList,
    isLoading: therapistsLoading,
    isError: therapistsError,
  } = useTherapists();

  // Fetch appointments hari ini (per_page besar supaya dapat semua)
  const {
    data: appointmentData,
    isLoading: apptLoading,
    isError: apptError,
    refetch,
  } = useAppointments({ date: today, per_page: 100 });

  const appointments: Appointment[] = appointmentData?.data ?? [];

  const therapists = useMemo<TherapistStatusItem[]>(() => {
    if (!therapistList) return [];

    // Menit saat ini (waktu lokal browser) — frontend-only validation
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return therapistList
      .filter((t: UserWithProfile) => t.status === 'active')
      .map((therapist: UserWithProfile) => {
        // Appointment hari ini untuk terapis ini
        const myAppts = appointments.filter(
          (a) => (a.therapist_id ?? a.therapist?.id) === therapist.id,
        );

        const statusResult = computeTherapistStatus(myAppts, nowMinutes);

        return {
          therapist_id: therapist.id,
          therapist_name: therapist.name,
          specialization: therapist.therapist_profile?.specialization ?? null,
          ...statusResult,
        };
      })
      // Urutan: operating → upcoming → idle
      .sort((a, b) => {
        const order: Record<TherapistOperationalStatus, number> = {
          operating: 0,
          upcoming: 1,
          idle: 2,
        };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        // Jika sama-sama upcoming, urutkan dari yang paling dekat
        if (a.status === 'upcoming' && b.status === 'upcoming') {
          return (a.minutes_until_next ?? 999) - (b.minutes_until_next ?? 999);
        }
        return a.therapist_name.localeCompare(b.therapist_name);
      });
  }, [therapistList, appointments]);

  const summary = useMemo(
    () => ({
      operating: therapists.filter((t) => t.status === 'operating').length,
      upcoming:  therapists.filter((t) => t.status === 'upcoming').length,
      idle:      therapists.filter((t) => t.status === 'idle').length,
      total:     therapists.length,
    }),
    [therapists],
  );

  return {
    therapists,
    isLoading: therapistsLoading || apptLoading,
    isError: therapistsError || apptError,
    refetch,
    summary,
  };
}