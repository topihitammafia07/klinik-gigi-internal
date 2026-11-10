export const OPERATIONAL_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type OperationalDayKey = (typeof OPERATIONAL_DAY_KEYS)[number];

export const OPERATIONAL_DAY_LABELS: Record<OperationalDayKey, string> = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Ahad / Minggu',
};

export interface OperationalDay {
  enabled: boolean;
  open: string | null;
  close: string | null;
  booking_slots: string[];
  allow_custom_booking_time: boolean;
}

export type OperationalHours = Record<OperationalDayKey, OperationalDay>;

export interface ClinicHolidayDate {
  date: string;
  name: string;
}

export interface ClinicSettings {
  id: number;
  is_operational: boolean;
  maintenance_message: string | null;
  operational_hours: OperationalHours;
  holiday_dates?: ClinicHolidayDate[];
  registration_fee_enabled: boolean;
  registration_fee_amount: number;
  registration_fee_new_patient_amount?: number;
  registration_fee_existing_patient_amount?: number;
  registration_fee_for_new_patient: boolean;
  registration_fee_for_existing_patient: boolean;
}

export interface TherapyServiceAgePrice {
  id: number;
  therapy_service_id: number;
  category_name: string;
  min_age: number;
  max_age: number | null;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueDistributionAllocation {
  id: number;
  user_id: number;
  name: string;
  role: 'pj_klinik' | 'resepsionis' | 'terapis' | null;
  specialization: string | null;
  amount: number;
}

export interface RevenueTeamMember {
  id: number;
  name: string;
  role: 'pj_klinik' | 'resepsionis' | 'terapis';
  specialization: string | null;
}

export interface RevenueDistribution {
  id: number;
  period_start: string;
  period_end: string;
  accumulated_revenue: number;
  distribution_amount: number;
  notes: string | null;
  creator?: { id: number; name: string } | null;
  allocations: RevenueDistributionAllocation[];
  created_at: string;
  updated_at?: string;
}

export interface TherapistPerformanceItem {
  therapist_id: number;
  name: string;
  treatment_count: number;
  generated_revenue: number;
}

export interface RevenuePreview {
  period_start: string;
  period_end: string;
  accumulated_revenue: number;
  therapist_performance?: Record<string | number, TherapistPerformanceItem>;
}

export interface TherapistRecapAction {
  visit_id: number;
  patient_name: string | null;
  medical_record_number: string | null;
  therapy_type: string | null;
  completed_at: string | null;
  received_revenue: number;
}

export interface TherapistRecapRow {
  therapist_id: number;
  therapist_name: string;
  treatment_count: number;
  received_revenue: number;
  latest_treatment_at: string | null;
  actions: TherapistRecapAction[];
}

export interface TherapistRecapResponse {
  window_hours: number;
  generated_at: string;
  visible_since: string;
  therapists: TherapistRecapRow[];
}
