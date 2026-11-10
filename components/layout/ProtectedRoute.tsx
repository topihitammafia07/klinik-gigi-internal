'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role, ROLE_ACCESS } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  pathname?: string;
}

export function ProtectedRoute({ children, allowedRoles, pathname }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Cek role access jika ada pathname atau allowedRoles
    const roles = allowedRoles || (pathname ? ROLE_ACCESS[pathname] : undefined);
    if (roles && user && !roles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#3d4947]">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
