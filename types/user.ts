// Extends the base User type from auth.ts with therapist profile
export interface TherapistProfile {
  specialization: string;
  str_number: string | null;
  sip_number: string | null;
}

export interface UserWithProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  status: 'active' | 'inactive';
  role: 'owner' | 'pj_klinik' | 'resepsionis' | 'terapis';
  last_login: string | null;
  therapist_profile: TherapistProfile | null;
  created_at: string;
}


export interface TherapistScheduleDay {
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  enabled: boolean;
  start_time: string | null;
  end_time: string | null;
  shift_name?: string | null;
}

export interface TherapistUnavailability {
  id: number;
  therapist_id: number;
  date: string;
  reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  status: 'active' | 'inactive';
  role: 'owner' | 'pj_klinik' | 'resepsionis' | 'terapis';
  // Only for terapis role
  specialization?: string;
  str_number?: string;
  sip_number?: string;
  // Foto profil — wajib untuk role terapis (3024x4032), opsional untuk role lain
  photo?: File | null;
}

// Dimensi wajib untuk foto profil terapis — ditampilkan di Landing Page
export const THERAPIST_PHOTO_DIMENSIONS = { width: 3024, height: 4032 };

export interface UserListParams {
  role?: string;
  page?: number;
  search?: string;
  per_page?: number;
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  pj_klinik: 'Penanggung Jawab',
  resepsionis: 'Resepsionis',
  terapis: 'Terapis',
};

// Roles visible/manageable through the UI (owner is excluded — there is only one)
export const MANAGEABLE_ROLES = ['pj_klinik', 'resepsionis', 'terapis'] as const;
export type ManageableRole = typeof MANAGEABLE_ROLES[number];

export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]' },
  pj_klinik: { bg: 'bg-[#dce9ff]', text: 'text-[#0058be]' },
  resepsionis: { bg: 'bg-[#d8ffe9]', text: 'text-[#00532a]' },
  terapis: { bg: 'bg-[#e5eeff]', text: 'text-[#00685f]' },
};

export const SPECIALIZATION_OPTIONS = [
  'Fisioterapi',
  'Fisioterapi Anak',
  'Fisioterapi Dewasa',
  'Fisioterapi Remaja',
  'Fisioterapi Olahraga',
  'Fisioterapi Neurologi',
  'Okupasi Terapi (OT)',
  'Terapi Wicara (TW)',
  'Stimulasi Tumbuh Kembang',
  'Baby Massage',
  'Ortotik Prostetik',
  'Observasi & Konsultasi',
  'Akupuntur',
  'Bekam',
  'Terapis Umum (Semua Layanan)',
];