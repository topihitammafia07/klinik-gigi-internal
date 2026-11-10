'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/axios';
import { getApiErrorMessage } from '@/lib/api-error';
import type { ApiResponse } from '@/types/auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const initialEmail = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess('');
    setError('');

    if (!token) {
      setError('Token reset password tidak ditemukan. Gunakan tautan dari email Owner.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post<ApiResponse<null>>('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setSuccess(data.message || 'Password Owner berhasil direset. Silakan login kembali.');
      setPassword('');
      setConfirmation('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Token reset password tidak valid atau sudah kedaluwarsa.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-[#bcc9c6]/40 bg-white p-6 shadow-sm sm:p-8">
      <Image src="/assets/logo.png" alt="Griya Fisioterapi Supra Medika" width={150} height={38} className="h-9 w-auto object-contain" priority />
      <h1 className="mt-7 text-2xl font-bold text-[#0b1c30]">Reset Password Owner</h1>
      <p className="mt-1 text-sm text-[#3d4947]">Masukkan password baru menggunakan tautan verifikasi yang dikirim melalui email.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {success && <div className="rounded-xl border border-[#00685f]/20 bg-[#00685f]/5 px-4 py-3 text-sm text-[#065f46]">{success}</div>}
        {error && <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/50 px-4 py-3 text-sm text-[#93000a]">{error}</div>}

        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Email Owner</label>
          <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-[#bcc9c6] px-4 text-sm" required />
        </div>

        <div>
          <label htmlFor="reset-new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Password Baru</label>
          <div className="flex h-12 items-center rounded-xl border border-[#bcc9c6] px-3 focus-within:border-[#00685f] focus-within:ring-2 focus-within:ring-[#00685f]/10">
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Minimal 8 karakter"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="p-1 text-[#6d7a77] hover:text-[#00685f]" aria-label="Tampilkan password">
              <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reset-confirmation" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Konfirmasi Password</label>
          <input
            id="reset-confirmation"
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-[#bcc9c6] px-4 text-sm"
          />
        </div>

        <button type="submit" disabled={isSubmitting || !token} className="h-12 w-full rounded-xl bg-[#00685f] text-sm font-semibold text-white hover:bg-[#008378] disabled:opacity-60">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
        </button>
      </form>

      <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#00685f] hover:underline">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Kembali ke Login
      </Link>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] p-5">
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-2xl bg-[#eff4ff]" />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
