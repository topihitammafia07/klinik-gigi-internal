import type { Patient } from './patient';
import type { TreatmentPackage } from './treatment-package';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface TherapyService {
  id: number;
  name: string;
  category: string;
  duration: number;
  price: number;
  price_type?: 'fixed' | 'flexible';
  is_flexible_price?: boolean;
  is_active?: boolean;
  description?: string | null;
}

export interface BillingPayment {
  id: number;
  amount: number | null;
  payment_method: string | null;
  notes: string | null;
  paid_at: string | null;
  recorded_by: string | null;
}

export interface BillingCharge {
  id: number;
  type: string;
  label: string;
  qty: number;
  amount: number | null;
  subtotal: number | null;
}

export interface BillingItem {
  id: number;
  billing_id?: number;
  service_id: number;
  qty: number;
  /** null jika harga disembunyikan untuk user ini (lihat Billing.price_hidden) */
  price: number | null;
  /** null jika harga disembunyikan untuk user ini (lihat Billing.price_hidden) */
  subtotal: number | null;
  service?: TherapyService | null;
}

export interface BillingAppointmentInfo {
  id: number;
  appointment_date: string;
  therapist_name: string | null;
}

export interface BillingVisitInfo {
  id: number;
  visit_date: string;
  status: string;
  therapy_type: string;
  therapist_name: string | null;
}

export interface Billing {
  id: number;
  patient_id: number;
  /** null jika invoice ini baru berasal dari Booking, belum ditautkan ke Kunjungan */
  visit_id: number | null;
  /** Terisi jika invoice ini auto-generate dari flow Booking landing page. */
  appointment_id: number | null;
  /** Layanan hasil booking — sumber sebelum item billing terisi lengkap dari Kunjungan. */
  service_id: number | null;
  /** true = invoice ini masih draft dari Booking, belum dikonfirmasi resepsionis. */
  is_draft_from_booking: boolean;
  package_id: number | null;
  is_package_covered: boolean;
  /** null jika harga disembunyikan untuk user ini (lihat price_hidden) */
  total_amount: number | null;
  /** Akumulasi transaksi pembayaran yang benar-benar sudah diterima. */
  paid_amount: number | null;
  /** Sisa tagihan setelah pembayaran bertahap. */
  remaining_amount: number | null;
  payment_status: PaymentStatus;
  payment_method: string | null;
  patient?: Patient;
  visit?: BillingVisitInfo | null;
  appointment?: BillingAppointmentInfo | null;
  items?: BillingItem[];
  charges?: BillingCharge[];
  payments?: BillingPayment[];
  /** Terisi jika billing dicover paket sesi prabayar. */
  package?: Pick<TreatmentPackage, 'id' | 'name' | 'total_sessions' | 'used_sessions' | 'remaining_sessions'> | null;
  printed_at: string | null;
  /** true jika invoice sudah lewat 24 jam sejak dicetak (khusus batasan role resepsionis) */
  is_locked_for_receptionist: boolean;
  /** true jika nominal disembunyikan (null) untuk user ini */
  price_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingItemFormData {
  service_id: number;
  qty: number;
  price: number;
}

export interface BillingFormData {
  patient_id: number;
  /** Wajib untuk redeem paket & billing manual dari kunjungan; opsional untuk kasus lain. */
  visit_id?: number;
  /** Diisi jika invoice dicover paket sesi prabayar. */
  package_id?: number;
  items: BillingItemFormData[];
}

/** Endpoint Batch 1 tetap dipertahankan untuk kompatibilitas status manual. */
export interface PaymentUpdateData {
  payment_status: PaymentStatus;
  payment_method?: string;
}

/** Batch 2: ledger transaksi pembayaran/DP nyata. */
export interface RecordPaymentData {
  amount: number;
  payment_method?: string;
  notes?: string;
}

export interface BillingListParams {
  patient_id?: number;
  payment_status?: PaymentStatus;
  page?: number;
  per_page?: number;
}
