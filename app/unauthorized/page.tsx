'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_REDIRECT } from '@/types/auth';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 bg-[#ffdad6] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[#ba1a1a] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Akses Ditolak</h1>
        <p className="text-sm text-[#3d4947] mb-8">
          Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika ini adalah kesalahan.
        </p>
        {user && (
          <Link
            href={ROLE_REDIRECT[user.role]}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#00685f] text-white rounded-xl text-sm font-semibold hover:bg-[#008378] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Kembali ke Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
