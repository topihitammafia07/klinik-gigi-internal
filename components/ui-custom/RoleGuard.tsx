'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types/auth';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 * Unlike ProtectedRoute (which redirects), this component simply
 * hides/shows UI sections — used to gate things like the SOAP form.
 */
export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;
  return allowedRoles.includes(user.role) ? <>{children}</> : <>{fallback}</>;
}
