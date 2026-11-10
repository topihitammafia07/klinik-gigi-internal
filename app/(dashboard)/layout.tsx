'use client';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Layout tunggal untuk seluruh section (dashboard). Sidebar/Header di sini
// dipertahankan (persist) lintas navigasi antar halaman — tidak remount lagi
// tiap pindah /dashboard -> /patients -> /billing dst.
// Role-specific restriction (RoleGuard) tetap ditaruh di layout.tsx masing-masing
// section yang butuh (users, billing, reports), bukan di sini.
export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['owner', 'pj_klinik', 'resepsionis', 'terapis']}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}