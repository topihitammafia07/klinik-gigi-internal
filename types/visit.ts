import type { Patient } from './patient';
import type { User } from './auth';
import type { Appointment } from './appointment';

export type VisitStatus = 'waiting' | 'ongoing' | 'done';

export interface PatientVisit {
  id: number;
  patient_id: number;
  appointment_id: number;
  therapist_id: number;
  receptionist_id: number;
  visit_date: string;
  complaint: string;
  diagnosis: string;
  therapy_type: string;
  status: VisitStatus;
  patient?: Patient;
  therapist?: User;
  receptionist?: User;
  appointment?: Appointment;
  has_medical_record?: boolean;
  has_billing?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitListParams {
  status?: VisitStatus;
  therapist_id?: number;
  patient_id?: number;
  date?: string;
  without_billing?: boolean;
  page?: number;
  per_page?: number;
}
