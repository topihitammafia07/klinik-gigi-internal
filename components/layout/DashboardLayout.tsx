'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalSearchBar } from '@/components/layout/GlobalSearchBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8f9ff]">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-[#bcc9c6] shadow-sm flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] transition-colors"
              aria-label="Buka menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden md:block flex-1">
              <GlobalSearchBar />
            </div>
            <div className="md:hidden min-w-0">
              <p className="text-xs text-[#6d7a77]">Griya Fisioterapi</p>
              <p className="text-sm font-semibold text-[#0b1c30] truncate">{user?.name ?? 'Dashboard'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] p-2 rounded-full transition-all relative" aria-label="Notifikasi">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            {user && (
              <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center text-xs font-bold ml-1">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 md:px-10 py-5 md:py-6 max-w-[1440px] mx-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
