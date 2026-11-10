import type { PatientVisit } from './visit';

export interface MedicalRecord {
  id: number;
  visit_id: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  therapy_action: string;
  progress_notes: string;
  icf_codes: string[];
  visit?: PatientVisit;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordFormData {
  visit_id: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  therapy_action: string;
  progress_notes: string;
  icf_codes: string[];
}

export interface IcfCode {
  code: string;
  title: string;
  definition?: string;
}
