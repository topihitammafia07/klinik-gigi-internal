'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_REDIRECT } from '@/types/auth';

export default function RootPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.replace(ROLE_REDIRECT[user.role]);
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
      <div className="w-8 h-8 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
