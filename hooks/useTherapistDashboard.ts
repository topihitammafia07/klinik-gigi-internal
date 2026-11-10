import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import apiClient from '@/lib/axios';
import { liveQueryOptions } from '@/hooks/useLivePolling';
import type { PatientVisit, VisitStatus } from '@/types/visit';
import type { Appointment } from '@/types/appointment';
import type { PaginatedResponse } from '@/types/auth';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Item terpadu dalam jadwal harian terapis.
 * source='visit'       → pasien sudah check-in (ada PatientVisit)
 * source='appointment' → belum check-in (hanya Appointment, status 'scheduled')
 */
export interface TherapistScheduleItem {
  /** ID dari visit atau appointment, bergantung source */
  id: number;
  source: 'visit' | 'appointment';
  /** Hanya ada jika source === 'visit' */
  visit_id?: number;
  appointment_id: number;
  patient_name: string;
  patient_mrn: string;
  /** Format HH:MM:SS dari backend */
  time_start: string;
  time_end: string;
  status: VisitStatus | 'scheduled';
  complaint?: string;
  therapy_type?: string;
  /** Hanya relevan saat status === 'done'; undefined = tidak diketahui */
  has_medical_record?: boolean;
}

export interface TherapistStats {
  total: number;
  waiting: number;
  ongoing: number;
  done: number;
}

export interface TherapistDashboardResult {
  /** Jadwal gabungan (visit + appointment tanpa visit), sorted by time_start */
  schedule: TherapistScheduleItem[];
  stats: TherapistStats;
  /** Visit dengan status 'ongoing' milik terapis hari ini, atau null */
  activeVisit: PatientVisit | null;
  /** Visit dengan status 'waiting' milik terapis hari ini */
  waitingVisits: PatientVisit[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// PatientVisit yang mungkin menyertakan has_medical_record dari backend
type PatientVisitWithRecord = PatientVisit & {
  has_medical_record?: boolean;
};

// ─────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────

export const therapistDashboardKeys = {
  all: ['therapist-dashboard'] as const,
  today: (therapistId: number) =>
    [...therapistDashboardKeys.all, 'today', therapistId] as const,
  todayVisits: (therapistId: number) =>
    [...therapistDashboardKeys.today(therapistId), 'visits'] as const,
  todayAppointments: (therapistId: number) =>
    [...therapistDashboardKeys.today(therapistId), 'appointments'] as const,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Konversi "HH:MM" atau "HH:MM:SS" → total menit */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * Agregasi data dashboard untuk role terapis.
 * Menggabungkan PatientVisit hari ini + Appointment hari ini
 * (yang belum punya visit) ke dalam satu jadwal yang diurutkan.
 *
 * @param therapistId - user.id terapis yang sedang login
 */
export function useTherapistDashboard(therapistId: number): TherapistDashboardResult {
  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Query: kunjungan (visit) hari ini ─────────────────────
  const visitsQuery = useQuery({
    queryKey: therapistDashboardKeys.todayVisits(therapistId),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<PatientVisitWithRecord>>(
        '/visits',
        {
          params: {
            therapist_id: therapistId,
            date: today,
            per_page: 50,
          },
        }
      );
      return data.data.data;
    },
    enabled: !!therapistId,
    ...liveQueryOptions('fast'), // 5s — dashboard terapis harus ikut update saat resepsionis check-in pasien

  });

  // ── Query: appointment hari ini (belum check-in) ──────────
  const appointmentsQuery = useQuery({
    queryKey: therapistDashboardKeys.todayAppointments(therapistId),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Appointment>>(
        '/appointments',
        {
          params: {
            therapist_id: therapistId,
            date: today,
            status: 'scheduled',
            per_page: 50,
          },
        }
      );
      return data.data.data;
    },
    enabled: !!therapistId,
    ...liveQueryOptions('fast'),
  });

  // ── Derive data ───────────────────────────────────────────
  const visits: PatientVisitWithRecord[] = visitsQuery.data ?? [];
  const appointments: Appointment[] = appointmentsQuery.data ?? [];

  // Set appointment_id yang sudah punya visit → jangan double-tampilkan
  const visitedAppointmentIds = new Set<number>(visits.map((v) => v.appointment_id));

  // Visit items
  const visitItems: TherapistScheduleItem[] = visits.map(
    (v): TherapistScheduleItem => ({
      id: v.id,
      source: 'visit',
      visit_id: v.id,
      appointment_id: v.appointment_id,
      patient_name: v.patient?.full_name ?? '—',
      patient_mrn: v.patient?.medical_record_number ?? '—',
      time_start: v.appointment?.time_start ?? '00:00:00',
      time_end: v.appointment?.time_end ?? '00:00:00',
      status: v.status,
      complaint: v.complaint || undefined,
      therapy_type: v.therapy_type || undefined,
      has_medical_record: v.has_medical_record,
    })
  );

  // Appointment items (hanya yang belum punya visit)
  const appointmentItems: TherapistScheduleItem[] = appointments
    .filter((a) => !visitedAppointmentIds.has(a.id))
    .map(
      (a): TherapistScheduleItem => ({
        id: a.id,
        source: 'appointment',
        appointment_id: a.id,
        patient_name: a.patient?.full_name ?? '—',
        patient_mrn: a.patient?.medical_record_number ?? '—',
        time_start: a.time_start,
        time_end: a.time_end,
        status: 'scheduled',
      })
    );

  // Gabungkan dan urutkan berdasarkan waktu mulai
  const schedule: TherapistScheduleItem[] = [
    ...visitItems,
    ...appointmentItems,
  ].sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start));

  // Stats
  const stats: TherapistStats = {
    total: schedule.length,
    waiting: visits.filter((v) => v.status === 'waiting').length,
    ongoing: visits.filter((v) => v.status === 'ongoing').length,
    done: visits.filter((v) => v.status === 'done').length,
  };

  // Sesi aktif = visit dengan status 'ongoing' (hanya 1 pada satu waktu)
  const activeVisit: PatientVisit | null =
    visits.find((v) => v.status === 'ongoing') ?? null;

  // Antrian = semua visit dengan status 'waiting'
  const waitingVisits: PatientVisit[] = visits.filter(
    (v) => v.status === 'waiting'
  );

  const isLoading = visitsQuery.isLoading || appointmentsQuery.isLoading;
  const isError = visitsQuery.isError || appointmentsQuery.isError;

  function refetch() {
    visitsQuery.refetch();
    appointmentsQuery.refetch();
  }

  return {
    schedule,
    stats,
    activeVisit,
    waitingVisits,
    isLoading,
    isError,
    refetch,
  };
}