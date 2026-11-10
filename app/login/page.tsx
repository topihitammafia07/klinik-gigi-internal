'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_REDIRECT, AuthResponse, Role } from '@/types/auth';
import apiClient from '@/lib/axios';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['owner', 'pj_klinik', 'terapis', 'resepsionis']),
});

type LoginForm = z.infer<typeof loginSchema>;

type RoleValue = 'owner' | 'pj_klinik' | 'terapis' | 'resepsionis';

const VALID_ROLES: RoleValue[] = ['owner', 'pj_klinik', 'terapis', 'resepsionis'];
const LS_LAST_ROLE_KEY = 'last_login_role';

const ROLE_OPTIONS = [
  { value: 'owner',        label: 'Owner',            icon: 'admin_panel_settings' },
  { value: 'pj_klinik',   label: 'Penanggung Jawab', icon: 'manage_accounts'      },
  { value: 'terapis',     label: 'Terapis',           icon: 'physical_therapy'     },
  { value: 'resepsionis', label: 'Resepsionis',       icon: 'support_agent'        },
] as const;

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  // ✅ FIX: Always start with a static default so server & client render identically.
  //    localStorage is read only after mount (client-only) inside useEffect below.
  const [selectedRole, setSelectedRole] = useState<RoleValue>('terapis');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(ROLE_REDIRECT[user.role as Role]);
    }
  }, [isAuthenticated, user, router]);

  // ✅ FIX: useForm also uses a static default — no localStorage on init
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'terapis' },
  });

  // Surface maintenance redirects from protected pages without changing the existing login flow.
  useEffect(() => {
    const maintenanceMessage = sessionStorage.getItem('clinic_closed_message');
    if (maintenanceMessage) {
      setServerError(maintenanceMessage);
      sessionStorage.removeItem('clinic_closed_message');
    }
  }, []);

  // ✅ FIX: Restore last-used role from localStorage AFTER mount (client-only).
  //    This runs after hydration is complete, so no mismatch occurs.
  useEffect(() => {
    const saved = localStorage.getItem(LS_LAST_ROLE_KEY) as RoleValue | null;
    if (saved && VALID_ROLES.includes(saved)) {
      setSelectedRole(saved);
      setValue('role', saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = (role: RoleValue) => {
    setSelectedRole(role);
    setValue('role', role);
    localStorage.setItem(LS_LAST_ROLE_KEY, role);
  };

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: data.email,
        password: data.password,
        role: selectedRole,
      });
      const { token, user: userData } = response.data.data;

      localStorage.setItem(LS_LAST_ROLE_KEY, selectedRole);

      login(token, userData);
      router.replace(ROLE_REDIRECT[userData.role]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || 'Email atau password salah.');
    }
  };

  return (
    <main className="flex min-h-screen font-[family-name:var(--font-inter)]">

      {/* ── Left panel: visual branding + photo ── */}
      <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col">

        {/* Background base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003d38] via-[#00685f] to-[#0058be]" />

        {/* Icon watermark background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image
          src="/icon.png"
          alt=""
          aria-hidden="true"
          width={680}
          height={680}
          className="absolute inset-0 m-auto w-5/6 max-w-[680px] h-auto object-contain opacity-10 select-none pointer-events-none"
        />

        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top-left logo badge */}
        <div className="relative z-20 p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/assets/logo.png" alt="Griya Fisioterapi Supra Medika" width={160} height={40} priority className="h-10 w-auto object-contain drop-shadow" />
        </div>

        {/* Floating stat cards */}
        <div className="relative z-20 flex-1 flex items-center px-10">
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {[
              { icon: 'group',           label: 'Total Pasien',         value: '1,200+' },
              { icon: 'event_available', label: 'Sesi Terapi',          value: '98%'    },
              { icon: 'verified',        label: 'Terapis Bersertifikat', value: '24'    },
              { icon: 'star',            label: 'Kepuasan Pasien',      value: '4.9 / 5' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-white text-[17px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {s.icon}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-none">{s.value}</p>
                  <p className="text-white/70 text-[10px] mt-0.5 leading-tight">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding block */}
        <div className="relative z-20 px-10 pb-10 pt-6 bg-gradient-to-t from-black/40 to-transparent">
          <h2 className="text-white text-[38px] font-bold leading-[1.1] mb-2 tracking-tight drop-shadow-md">
            Clinical<br />Excellence.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-[300px]">
            Platform manajemen klinik fisioterapi terpadu — rekam medis, jadwal, dan laporan dalam satu sistem.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5">
            <span
              className="material-symbols-outlined text-white text-[13px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="text-white/90 text-[10px] font-semibold tracking-widest uppercase">HIPAA / GDPR Compliant</span>
          </div>
        </div>
      </section>

      {/* ── Right panel: login form ── */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 bg-[#f8f9ff]">
        <div className="w-full max-w-[440px] space-y-8">

          {/* Mobile brand */}
          <div className="lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image src="/assets/logo.png" alt="Griya Fisioterapi Supra Medika" width={128} height={32} priority className="h-8 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Staff Login</h2>
            <p className="text-sm text-[#3d4947]">Akses sistem manajemen klinis internal.</p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <input type="hidden" {...register('role')} value={selectedRole} />

            {/* Server error */}
            {serverError && (
              <div className="flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-xl text-sm text-[#93000a]">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                {serverError}
              </div>
            )}

            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">badge</span>
                Role Staff
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleChange(opt.value as RoleValue)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center transition-all text-xs font-medium ${
                      selectedRole === opt.value
                        ? 'bg-[#00685f] text-white border-[#00685f] shadow-sm'
                        : 'bg-white text-[#3d4947] border-[#bcc9c6] hover:border-[#00685f]/40 hover:text-[#00685f]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: selectedRole === opt.value ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {opt.icon}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                Email Address
              </label>
              <div className={`flex items-center border rounded-xl px-4 h-12 transition-all bg-white ${
                errors.email
                  ? 'border-[#ba1a1a] ring-2 ring-[#ba1a1a]/10'
                  : 'border-[#bcc9c6] focus-within:border-[#00685f] focus-within:ring-2 focus-within:ring-[#00685f]/10'
              }`}>
                <input
                  type="email"
                  placeholder="nama@griyafisio.id"
                  {...register('email')}
                  className="w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none text-[#0b1c30] text-sm placeholder:text-[#3d4947]/50"
                />
              </div>
              {errors.email && <p className="text-xs text-[#ba1a1a]">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Password
              </label>
              <div className={`flex items-center border rounded-xl px-4 h-12 transition-all bg-white ${
                errors.password
                  ? 'border-[#ba1a1a] ring-2 ring-[#ba1a1a]/10'
                  : 'border-[#bcc9c6] focus-within:border-[#00685f] focus-within:ring-2 focus-within:ring-[#00685f]/10'
              }`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none text-[#0b1c30] text-sm placeholder:text-[#3d4947]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="text-[#6d7a77] hover:text-[#00685f] transition-colors p-0.5 ml-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-[#ba1a1a]">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#00685f] hover:bg-[#008378] text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="flex items-start gap-3 p-4 bg-[#e5eeff] rounded-xl border border-[#bcc9c6]/40">
            <span
              className="material-symbols-outlined text-[#00685f] text-[18px] mt-0.5"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <p className="text-xs text-[#3d4947] leading-relaxed">
              Portal klinis aman. Semua sesi dienkripsi dan dicatat untuk kepatuhan HIPAA/GDPR.
            </p>
          </div>

          <footer className="text-center">
            <p className="text-[10px] text-[#6d7a77] uppercase tracking-wider">
              © 2026 Griya Fisioterapi Supra Medika · v1.0.0
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}