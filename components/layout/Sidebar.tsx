'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_BY_ROLE: Record<string, NavSection[]> = {
  owner: [
    {
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/appointments', label: 'Jadwal Terapi', icon: 'calendar_month' },
        { href: '/patients', label: 'Pasien', icon: 'person' },
        { href: '/visits', label: 'Kunjungan', icon: 'local_hospital' },
        { href: '/medical-records', label: 'Rekam Medis', icon: 'description' },
        { href: '/billing', label: 'Pembayaran', icon: 'payments' },
        { href: '/reports', label: 'Laporan', icon: 'assessment' },
      ],
    },
    {
      title: 'Owner Tools',
      items: [
        { href: '/users', label: 'Kelola Tim', icon: 'groups' },
        { href: '/gallery', label: 'Galeri Klinik', icon: 'photo_library' },
        { href: '/settings', label: 'Pengaturan Klinik', icon: 'settings' },
        { href: '/service-pricing', label: 'Harga Layanan', icon: 'sell' },
        { href: '/revenue-distributions', label: 'Pembagian Omzet', icon: 'account_balance_wallet' },
      ],
    },
  ],

  pj_klinik: [
    {
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/appointments', label: 'Jadwal Terapi', icon: 'calendar_month' },
        { href: '/patients', label: 'Pasien', icon: 'person' },
        { href: '/visits', label: 'Kunjungan', icon: 'local_hospital' },
        { href: '/medical-records', label: 'Rekam Medis', icon: 'description' },
        { href: '/users', label: 'Kelola Staff', icon: 'manage_accounts' },
        { href: '/gallery', label: 'Galeri Klinik', icon: 'photo_library' },
      ],
    },
  ],

  resepsionis: [
    {
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/appointments', label: 'Jadwal & Booking', icon: 'calendar_month' },
        { href: '/patients', label: 'Data Pasien', icon: 'person' },
        { href: '/visits', label: 'Antrian & Visit', icon: 'reorder' },
        { href: '/billing', label: 'Pembayaran', icon: 'payments' },
        { href: '/therapist-recap', label: 'Rekap Terapis 24 Jam', icon: 'clinical_notes' },
      ],
    },
  ],

  terapis: [
    {
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/visits', label: 'Jadwal Terapi', icon: 'calendar_today' },
        { href: '/patients', label: 'Pasien Saya', icon: 'group' },
        { href: '/medical-records', label: 'Rekam Medis', icon: 'description' },
        { href: '/reports', label: 'Rekap Laporan', icon: 'assessment' },
      ],
    },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  pj_klinik: 'Penanggung Jawab',
  resepsionis: 'Resepsionis',
  terapis: 'Terapis',
};

function useActiveSection(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get('from');
  if (from) return '/' + from;
  if (pathname.match(/^\/patients\/\d+/)) return '/patients';
  if (pathname.startsWith('/appointments')) return '/appointments';
  if (pathname.match(/^\/visits\/\d+/)) return '/visits';
  if (pathname.startsWith('/billing')) return '/billing';

  return '/' + (pathname.split('/')[1] ?? '');
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const activeSection = useActiveSection();
  const { user, logout } = useAuth();

  const role = user?.role ?? 'resepsionis';
  const sections = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.resepsionis;

  const renderContent = (isMobile = false) => (
    <>
      <div className="mb-7 px-2 flex items-start justify-between gap-3">
        <div>
          <Image
            src="/assets/logo.png"
            alt="Griya Fisioterapi Supra Medika"
            width={140}
            height={36}
            priority
            className="h-9 w-auto object-contain"
          />
          <p className="text-[10px] text-[#3d4947] mt-1.5 uppercase tracking-widest">
            Clinical Excellence
          </p>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onMobileClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff]"
            aria-label="Tutup menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {sections.map((section, sectionIndex) => (
          <div key={`${section.title ?? 'main'}-${sectionIndex}`} className={sectionIndex > 0 ? 'mt-3' : ''}>
            {section.title && (
              <p className="px-3 py-1.5 text-[10px] font-bold text-[#6d7a77] uppercase tracking-widest">
                {section.title}
              </p>
            )}

            {section.items.map((item) => {
              const isActive = activeSection === item.href ||
                (item.href !== '/dashboard' && activeSection.startsWith(item.href));

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                    isActive
                      ? 'bg-[#00685f]/10 text-[#00685f] border-l-[3px] border-[#00685f] font-semibold pl-[9px]'
                      : 'text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff]',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{
                      fontVariationSettings: isActive
                        ? "'FILL' 1"
                        : "'FILL' 0, 'wght' 300",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-[#bcc9c6]/50 pt-3 mt-1">
        {user && (
          <Link
            href="/profile"
            onClick={isMobile ? onMobileClose : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 mb-1 rounded-xl transition-colors',
              pathname === '/profile' ? 'bg-[#00685f]/10' : 'hover:bg-[#eff4ff]',
            )}
            title="Profil Saya"
          >
            <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-[#0b1c30] truncate">{user.name}</p>
              <p className="text-[11px] text-[#3d4947]">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          </Link>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60 transition-colors duration-150"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'wght' 300" }}
          >
            logout
          </span>
          <span>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <nav className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-[#bcc9c6]/60 shadow-sm flex-col py-6 px-4 z-50 hidden md:flex">
        {renderContent()}
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navigasi utama">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={onMobileClose}
            className="absolute inset-0 bg-[#0b1c30]/35 backdrop-blur-[1px]"
          />
          <nav className="absolute left-0 top-0 h-full w-[min(86vw,300px)] bg-white border-r border-[#bcc9c6]/60 shadow-xl flex flex-col py-6 px-4">
            {renderContent(true)}
          </nav>
        </div>
      )}
    </>
  );
}
