import type { Patient } from './patient';

export type PackagePaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PackageStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface TreatmentPackage {
  id: number;
  patient_id: number;
  service_id: number;
  name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  price_total: number;
  payment_status: PackagePaymentStatus;
  status: PackageStatus;
  purchased_at: string | null;
  expired_at: string | null;
  notes: string | null;
  patient?: Pick<Patient, 'id' | 'full_name'>;
  service?: { id: number; name: string };
}

export interface TreatmentPackageFormData {
  patient_id: number;
  service_id: number;
  name: string;
  total_sessions: number;
  price_total: number;
  payment_status: PackagePaymentStatus;
  purchased_at?: string;
  expired_at?: string;
  notes?: string;
}

export interface TreatmentPackageListParams {
  patient_id?: number;
  status?: PackageStatus;
  page?: number;
}