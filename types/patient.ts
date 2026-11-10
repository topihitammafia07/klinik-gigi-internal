export type PatientStatus = 'new' | 'old';

export interface Patient {
  id: number;
  medical_record_number: string;
  full_name: string;
  gender: 'male' | 'female';
  birth_date: string;
  address: string;
  phone: string;
  parent_name: string | null;
  emergency_contact: string | null;
  allergy_notes: string | null;
  patient_since: string;
  patient_status: PatientStatus;
  created_at: string;
  updated_at: string;

  // Agregat — hanya terisi di endpoint list (GET /patients), null di single show()
  visits_count?: number;
  last_visit_date?: string | null;
  active_packages_count?: number;
  total_billed?: number;
  total_unpaid?: number;
}

export interface PatientFormData {
  full_name: string;
  gender: 'male' | 'female';
  birth_date: string;
  address: string;
  phone: string;
  parent_name?: string;
  emergency_contact?: string;
  allergy_notes?: string;
  patient_since?: string;
}

export interface PatientListParams {
  search?: string;
  page?: number;
  per_page?: number;
  status?: PatientStatus;
}