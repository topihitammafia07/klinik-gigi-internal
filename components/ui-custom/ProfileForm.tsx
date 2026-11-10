'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { User } from '@/types/auth';

// ─────────────────────────────────────────────────────────────
// Zod Schema
// current_password wajib diisi kalau password baru diisi.
// ─────────────────────────────────────────────────────────────
const profileSchema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(255),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().max(20).optional().or(z.literal('')),
    current_password: z.string().optional().or(z.literal('')),
    password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  })
  .refine((data) => !data.password || !!data.current_password, {
    message: 'Password saat ini wajib diisi untuk mengganti password.',
    path: ['current_password'],
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  currentUser: User;
  onSubmit: (data: ProfileFormValues) => void;
  isLoading?: boolean;
  /** Hanya Owner yang boleh mengganti password sendiri lewat form ini */
  canEditPassword: boolean;
}

const inputClass = (hasError: boolean) =>
  cn(
    'w-full h-11 px-4 rounded-xl border text-sm text-[#0b1c30] bg-white',
    'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors',
    hasError ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]/70'
  );

export function ProfileForm({ currentUser, onSubmit, isLoading = false, canEditPassword }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone ?? '',
      current_password: '',
      password: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

      {/* ── Section: Informasi Akun ── */}
      <div className="bg-white rounded-2xl border border-[#bcc9c6]/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#bcc9c6]/20 bg-[#f8f9ff]/60 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-[#00685f]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_circle
          </span>
          <h3 className="text-sm font-semibold text-[#0b1c30]">Informasi Profil</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Nama Lengkap <span className="text-[#ba1a1a]">*</span>
            </label>
            <input {...register('name')} className={inputClass(!!errors.name)} />
            {errors.name && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Nomor Telepon
            </label>
            <input {...register('phone')} type="tel" className={inputClass(!!errors.phone)} />
            {errors.phone && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.phone.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Email <span className="text-[#ba1a1a]">*</span>
            </label>
            <input {...register('email')} type="email" className={inputClass(!!errors.email)} />
            {errors.email && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.email.message}</p>}
          </div>

        </div>
      </div>

      {/* ── Section: Ganti Password — Owner only ── */}
      {canEditPassword ? (
        <div className="bg-white rounded-2xl border border-[#bcc9c6]/30 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#bcc9c6]/20 bg-[#f8f9ff]/60 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-[#00685f]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
            <h3 className="text-sm font-semibold text-[#0b1c30]">Ganti Password</h3>
            <span className="ml-auto text-[10px] text-[#00685f] font-semibold bg-[#dcfce7] px-2 py-0.5 rounded-full">
              Owner Only
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Password Saat Ini
              </label>
              <input
                {...register('current_password')}
                type="password"
                placeholder="Wajib diisi jika mengganti password"
                className={inputClass(!!errors.current_password)}
                autoComplete="current-password"
              />
              {errors.current_password && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.current_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
                Password Baru
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="Kosongkan jika tidak diubah"
                className={inputClass(!!errors.password)}
                autoComplete="new-password"
              />
              {errors.password && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.password.message}</p>}
            </div>

          </div>
        </div>
      ) : null}

      {/* ── Submit ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
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
              Simpan Perubahan
            </>
          )}
        </button>
      </div>

    </form>
  );
}