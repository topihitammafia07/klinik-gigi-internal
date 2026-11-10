'use client';

import { RoleGuard } from '@/components/ui-custom/RoleGuard';

export default function RevenueDistributionLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['owner']} fallback={<div className="py-24 text-center"><h2 className="text-xl font-bold text-[#0b1c30]">Akses Terbatas</h2><p className="text-sm text-[#3d4947] mt-2">Pembagian omzet hanya dapat diakses Owner.</p></div>}>
      {children}
    </RoleGuard>
  );
}
