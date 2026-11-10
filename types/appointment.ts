import type { Patient } from './patient';
import type { User } from './auth';

export type AppointmentStatus = 'scheduled' | 'done' | 'cancelled';

export interface Appointment {
  id: number;
  patient_id: number;
  therapist_id: number;
  created_by: number;
  appointment_date: string;
  time_start: string;
  time_end: string;
  status: AppointmentStatus;
  notes: string | null;   // keluhan dari booking landing page
  patient?: Patient;
  therapist?: User;
  creator?: User;
  visit?: { id: number; status: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFormData {
  patient_id: number;
  therapist_id: number;
  appointment_date: string;
  time_start: string;
  time_end: string;
}

export interface AppointmentListParams {
  date?: string;
  therapist_id?: number;
  status?: AppointmentStatus;
  page?: number;
  per_page?: number;
}