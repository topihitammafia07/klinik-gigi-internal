'use client';

import { RoleGuard } from '@/components/ui-custom/RoleGuard';

export default function TherapistRecapLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['resepsionis']}
      fallback={
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-[#bcc9c6]">lock</span>
          <h2 className="text-xl font-bold text-[#0b1c30]">Akses Terbatas</h2>
          <p className="text-sm text-[#3d4947]">Rekap tindakan 24 jam hanya tersedia untuk Resepsionis.</p>
        </div>
      }
    >
      {children}
    </RoleGuard>
  );
}
