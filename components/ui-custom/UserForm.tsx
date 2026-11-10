'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user';
import { SPECIALIZATION_OPTIONS, THERAPIST_PHOTO_DIMENSIONS } from '@/types/user';

// ─────────────────────────────────────────────────────────────
// Helper: baca dimensi file gambar di browser sebelum diupload
// ─────────────────────────────────────────────────────────────
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Gagal membaca gambar.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────
const baseSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().max(20).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  role: z.enum(['pj_klinik', 'resepsionis', 'terapis']),
  specialization: z.string().optional().or(z.literal('')),
  str_number: z.string().max(100).optional().or(z.literal('')),
  sip_number: z.string().max(100).optional().or(z.literal('')),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

const editSchema = baseSchema.extend({
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
type UserFormValues = CreateFormData | EditFormData;

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface UserFormProps {
  defaultValues?: UserWithProfile;
  onSubmit: (data: UserFormValues) => void;
  isLoading?: boolean;
  isEdit?: boolean;
  /** Roles the current user is allowed to assign (owner excluded) */
  allowedRoles: Array<'pj_klinik' | 'resepsionis' | 'terapis'>;
  /**
   * Batch 2: edit password staff melalui form normal hanya ditampilkan untuk Owner.
   * PJ Klinik tetap dapat mengelola data staff, sedangkan reset kredensial dilakukan Owner.
   */
  canEditPassword?: boolean;
}

// Owner is excluded — it's a single special account, not assignable via this form
const ROLE_OPTIONS: Record<string, string> = {
  pj_klinik: 'Penanggung Jawab Klinik',
  resepsionis: 'Resepsionis',
  terapis: 'Terapis',
};

const inputClass = (hasError: boolean) =>
  cn(
    'w-full h-11 px-4 rounded-xl border text-sm text-[#0b1c30] bg-white',
    'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors',
    hasError ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]/70'
  );

// ─────────────────────────────────────────────────────────────
// Helper: narrows any Role (including 'owner') down to the
// subset the form allows. Falls back to 'resepsionis' for owner
// so the type stays compatible with the Zod schema.
// ─────────────────────────────────────────────────────────────
function toManageableRole(
  role: string | undefined
): 'pj_klinik' | 'resepsionis' | 'terapis' {
  if (role === 'pj_klinik' || role === 'resepsionis' || role === 'terapis') return role;
  return 'resepsionis';
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function UserForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  isEdit = false,
  allowedRoles,
  canEditPassword = true,
}: UserFormProps) {
  const schema = isEdit ? editSchema : createSchema;
  const showPasswordField = !isEdit || canEditPassword;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      password: '',
      phone: defaultValues?.phone ?? '',
      status: defaultValues?.status ?? 'active',
      role: toManageableRole(defaultValues?.role),
      specialization: defaultValues?.therapist_profile?.specialization ?? '',
      str_number: defaultValues?.therapist_profile?.str_number ?? '',
      sip_number: defaultValues?.therapist_profile?.sip_number ?? '',
    },
  });

  // Reset form when defaultValues change (e.g. after fetch on edit page)
  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name,
        email: defaultValues.email,
        password: '',
        phone: defaultValues.phone ?? '',
        status: defaultValues.status,
        role: toManageableRole(defaultValues.role),
        specialization: defaultValues.therapist_profile?.specialization ?? '',
        str_number: defaultValues.therapist_profile?.str_number ?? '',
        sip_number: defaultValues.therapist_profile?.sip_number ?? '',
      });
    }
  }, [defaultValues, reset]);

  const selectedRole = watch('role');
  const isTherapist = selectedRole === 'terapis';

  // ── Photo upload state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;

    if (isTherapist) {
      try {
        const { width, height } = await readImageDimensions(file);
        const { width: reqW, height: reqH } = THERAPIST_PHOTO_DIMENSIONS;
        if (width !== reqW || height !== reqH) {
          setPhotoError(
            `Dimensi foto terapis wajib ${reqW}x${reqH}px. File ini ${width}x${height}px.`
          );
          setPhotoFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      } catch {
        setPhotoError('Gagal membaca gambar. Coba file lain.');
        return;
      }
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submitWithPhoto = (data: UserFormValues) => {
    if (isTherapist && !photoFile && !defaultValues?.photo_url) {
      setPhotoError('Foto profil wajib diunggah untuk role Terapis.');
      return;
    }
    onSubmit({ ...data, photo: photoFile } as never);
  };

  return (
    <form onSubmit={handleSubmit(submitWithPhoto as never)} className="space-y-6" noValidate>

      {/* ── Section: Informasi Akun ── */}
      <div className="bg-white rounded-2xl border border-[#bcc9c6]/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#bcc9c6]/20 bg-[#f8f9ff]/60 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-[#00685f]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            manage_accounts
          </span>
          <h3 className="text-sm font-semibold text-[#0b1c30]">Informasi Akun</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Nama Lengkap <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="Masukkan nama lengkap"
              className={inputClass(!!errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.name.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Nomor Telepon
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+62 812 3456 7890"
              className={inputClass(!!errors.phone)}
            />
            {errors.phone && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.phone.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Email <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="nama@griyafisio.com"
              className={inputClass(!!errors.email)}
            />
            {errors.email && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.email.message}</p>}
          </div>

          {/* Password — hanya Owner yang boleh mengubah password user lain */}
          {showPasswordField ? (
            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Password {isEdit ? <span className="font-normal text-[#6d7a77] normal-case">(kosongkan jika tidak diubah)</span> : <span className="text-[#ba1a1a]">*</span>}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEdit ? '••••••••' : 'Minimal 8 karakter'}
                  className={cn(inputClass(!!errors.password), 'pr-11')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#6d7a77] hover:text-[#00685f] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.password.message}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="h-11 px-4 rounded-xl border border-[#bcc9c6]/70 bg-[#f8f9ff]/60 flex items-center text-xs text-[#6d7a77]">
                Anda tidak memiliki izin untuk mengubah password anggota ini.
              </div>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Role / Peran <span className="text-[#ba1a1a]">*</span>
            </label>
            <select
              {...register('role')}
              className={cn(inputClass(!!errors.role), 'cursor-pointer')}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{ROLE_OPTIONS[r]}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.role.message}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Status Akun <span className="text-[#ba1a1a]">*</span>
            </label>
            <select
              {...register('status')}
              className={cn(inputClass(!!errors.status), 'cursor-pointer')}
            >
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
            {errors.status && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.status.message}</p>}
          </div>

          {/* Photo — opsional, hanya untuk role selain terapis (foto terapis ada di section khusus di bawah) */}
          {!isTherapist && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Foto Profil <span className="font-normal text-[#6d7a77] normal-case">(opsional)</span>
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview foto profil" className="w-16 h-16 rounded-full object-cover border border-[#bcc9c6]/50" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#6d7a77]">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="text-xs text-[#3d4947] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#00685f] hover:file:bg-[#dce9ff] file:cursor-pointer cursor-pointer"
                />
              </div>
              {photoError && <p className="mt-1.5 text-xs text-[#ba1a1a]">{photoError}</p>}
            </div>
          )}

        </div>
      </div>

      {/* ── Section: Profil Terapis (conditional) ── */}
      {isTherapist && (
        <div className="bg-white rounded-2xl border border-[#00685f]/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#00685f]/10 bg-[#f0fdf9]/60 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-[#00685f]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              medical_services
            </span>
            <h3 className="text-sm font-semibold text-[#0b1c30]">Profil Terapis</h3>
            <span className="ml-auto text-[10px] text-[#00685f] font-semibold bg-[#dcfce7] px-2 py-0.5 rounded-full">
              Wajib untuk role Terapis
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Photo — wajib untuk terapis, ditampilkan di Landing Page */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Foto Profil <span className="text-[#ba1a1a]">*</span>
                <span className="ml-2 font-normal text-[#6d7a77] normal-case">
                  (dimensi wajib {THERAPIST_PHOTO_DIMENSIONS.width}x{THERAPIST_PHOTO_DIMENSIONS.height}px — akan tampil di Landing Page)
                </span>
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview foto terapis" className="w-20 h-24 rounded-lg object-cover border border-[#00685f]/30" />
                ) : (
                  <div className="w-20 h-24 rounded-lg bg-[#f0fdf9] border border-dashed border-[#00685f]/40 flex items-center justify-center text-[#00685f]">
                    <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="text-xs text-[#3d4947] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f0fdf9] file:text-[#00685f] hover:file:bg-[#dcfce7] file:cursor-pointer cursor-pointer"
                  />
                  <p className="mt-1 text-[11px] text-[#6d7a77]">Format JPG/PNG/WebP, maks 10MB, orientasi potret.</p>
                </div>
              </div>
              {photoError && <p className="mt-1.5 text-xs text-[#ba1a1a]">{photoError}</p>}
            </div>

            {/* Specialization */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Spesialisasi <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                {...register('specialization')}
                className={cn(inputClass(!!errors.specialization), 'cursor-pointer')}
              >
                <option value="">Pilih spesialisasi</option>
                {SPECIALIZATION_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.specialization && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.specialization.message}</p>
              )}
            </div>

            {/* STR Number */}
            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Nomor STR
              </label>
              <input
                {...register('str_number')}
                placeholder="Nomor Surat Tanda Registrasi"
                className={inputClass(!!errors.str_number)}
              />
              {errors.str_number && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.str_number.message}</p>
              )}
            </div>

            {/* SIP Number */}
            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Nomor SIP
              </label>
              <input
                {...register('sip_number')}
                placeholder="Nomor Surat Izin Praktik"
                className={inputClass(!!errors.sip_number)}
              />
              {errors.sip_number && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.sip_number.message}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 h-11 rounded-xl border border-[#bcc9c6]/70 text-sm font-medium text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 h-11 bg-[#00685f] text-white rounded-xl text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Menyimpan...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
            </>
          )}
        </button>
      </div>

    </form>
  );
}