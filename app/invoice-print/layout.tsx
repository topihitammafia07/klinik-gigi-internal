'use client';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function InvoicePrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['owner', 'resepsionis']}>
      {children}
    </ProtectedRoute>
  );
}
