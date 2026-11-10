'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, useMonthlyReport } from '@/hooks/useDashboard';
import { MetricCard, MetricCardSkeleton } from '@/components/ui-custom/MetricCard';
import { RevenueChart } from '@/components/ui-custom/RevenueChart';
import { TherapistActivityTable } from '@/components/ui-custom/TherapistActivityTable';
import { TherapistStatusPanel } from '@/components/ui-custom/TherapistStatusPanel';
import { TherapistDashboard } from '@/components/ui-custom/TherapistDashboard';
import { DateRangePicker, DateRange } from '@/components/ui-custom/DateRangePicker';

function formatRupiah(value: number | undefined | null) {
  if (value == null) return 'Rp —';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

const defaultRange: DateRange = {
  start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  end:   format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  label: 'Bulan Ini',
};

// ─────────────────────────────────────────────────────────────
// Dashboard khusus Resepsionis
// ─────────────────────────────────────────────────────────────
function ResepsionistDashboard() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 19 ? 'Sore' : 'Malam';
  })();

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Selamat {greeting}, {user?.name?.split(' ')[0] ?? 'Resepsionis'} 👋
          </h2>
          <p className="text-sm text-[#3d4947] mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/appointments/new"
            prefetch={false}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00685f] text-white text-sm font-semibold rounded-lg hover:bg-[#008378] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
            Buat Jadwal
          </Link>
          <Link
            href="/patients/new"
            prefetch={false}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#bcc9c6] text-sm font-semibold text-[#0b1c30] rounded-lg hover:border-[#00685f] hover:text-[#00685f] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Pasien Baru
          </Link>
        </div>
      </section>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-[#e0f4f1] rounded-xl border border-[#00685f]/20 text-sm text-[#00685f]">
        <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
          info
        </span>
        <p>
          Status <strong>Segera Beroperasi</strong> ditampilkan jika jadwal terapis dimulai dalam{' '}
          <strong>90 menit ke depan</strong>. Halaman ini diperbarui otomatis setiap menit.
        </p>
      </div>

      {/* Panel Status Terapis — fokus utama dashboard resepsionis */}
      <section>
        <TherapistStatusPanel
          title="Status Operasional Terapis Hari Ini"
          showSchedule={true}
        />
      </section>

      {/* Aksi Cepat */}
      <section className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#0b1c30] mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tambah Pasien',  icon: 'person_add',    href: '/patients/new' },
            { label: 'Buat Jadwal',    icon: 'edit_calendar', href: '/appointments' },
            { label: 'Daftar Pasien',  icon: 'group',         href: '/patients'     },
            { label: 'Invoice',        icon: 'receipt_long',  href: '/billing'      },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              prefetch={false}
              className="flex flex-col items-center justify-center p-3 border border-[#bcc9c6]/40 rounded-xl bg-white hover:border-[#00685f]/40 hover:text-[#00685f] transition-colors text-[#3d4947] group"
            >
              <span
                className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform text-[20px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                {a.icon}
              </span>
              <span className="text-xs font-medium text-center leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Owner / PJ Klinik (dashboard lengkap)
// ─────────────────────────────────────────────────────────────
function AdminDashboard() {
  const { user, hasRole } = useAuth();
  const [chartVariant, setChartVariant] = useState<'area' | 'bar'>('area');
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);

  // PJ Klinik tidak punya akses ke halaman Laporan & Pembayaran,
  // jadi card Pendapatan Bulanan dan card Laporan di dashboard-nya di-disable.
  const isRevenueLocked = hasRole('pj_klinik');

  const year = useMemo(() => new Date(dateRange.start).getFullYear(), [dateRange.start]);

  const {
    data: dashboard,
    isLoading: dashLoading,
    isError: dashError,
    refetch: refetchDash,
  } = useDashboard();

  const {
    data: monthly,
    isLoading: monthlyLoading,
    isError: monthlyError,
  } = useMonthlyReport({ year });

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 19 ? 'Sore' : 'Malam';
  })();

  const metrics    = dashboard?.metrics;
  const therapists = dashboard?.therapist_activity ?? [];

  const totalVisits = (metrics?.visits_by_status?.waiting ?? 0)
    + (metrics?.visits_by_status?.ongoing ?? 0)
    + (metrics?.visits_by_status?.done ?? 0);

  if (dashError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <h2 className="text-xl font-bold text-[#0b1c30]">Gagal memuat data dashboard</h2>
        <p className="text-sm text-[#3d4947]">Terjadi kesalahan saat mengambil data dari server.</p>
        <button
          onClick={() => refetchDash()}
          className="flex items-center gap-2 px-4 py-2 bg-[#00685f] text-white text-sm font-semibold rounded-lg hover:bg-[#008378] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Selamat {greeting}, {user?.name?.split(' ')[0] ?? 'Admin'} 👋
          </h2>
          <p className="text-sm text-[#3d4947] mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => refetchDash()}
            className="p-2 bg-white border border-[#bcc9c6] rounded-lg hover:border-[#00685f] hover:text-[#00685f] transition-colors text-[#3d4947]"
            title="Refresh data"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          <Link
            href="/patients/new"
            prefetch={false}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00685f] text-white text-sm font-semibold rounded-lg hover:bg-[#008378] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Pasien Baru
          </Link>
        </div>
      </section>

      {/* Warning: chart error */}
      {monthlyError && (
        <div className="flex items-center gap-3 bg-[#fff8e6] border border-[#d97706]/30 rounded-xl px-4 py-3 text-sm text-[#92400e]">
          <span className="material-symbols-outlined text-[18px] text-[#d97706]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span>Data chart pendapatan gagal dimuat. Metric utama masih tersedia.</span>
        </div>
      )}

      {/* Metric Cards */}
      <section>
        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${isRevenueLocked ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
          {dashLoading ? (
            Array.from({ length: isRevenueLocked ? 3 : 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Total Pasien"
                value={metrics?.total_patients?.toLocaleString('id-ID') ?? '—'}
                icon="group"
                bg="bg-[#dce9ff]"
                iconColor="text-[#0058be]"
              />
              {/* Revenue — disembunyikan total untuk pj_klinik, hanya owner yang boleh melihat */}
              {!isRevenueLocked && (
                <>
                  <MetricCard
                    label="Revenue Hari Ini"
                    value={formatRupiah(metrics?.revenue_today)}
                    icon="payments"
                    bg="bg-[#dcfce7]"
                    iconColor="text-[#14532d]"
                  />
                  <MetricCard
                    label="Revenue Bulan Ini"
                    value={formatRupiah(metrics?.revenue_this_month)}
                    icon="account_balance_wallet"
                    bg="bg-[#e0f4f1]"
                    iconColor="text-[#00685f]"
                  />
                </>
              )}
              <MetricCard
                label="Total Kunjungan"
                value={totalVisits}
                icon="local_hospital"
                bg="bg-[#eff4ff]"
                iconColor="text-[#3d4947]"
                description={`Selesai: ${metrics?.visits_by_status?.done ?? 0}`}
              />
              <MetricCard
                label="Dalam Proses"
                value={metrics?.visits_by_status?.ongoing ?? 0}
                icon="pending_actions"
                bg="bg-[#fef3c7]"
                iconColor="text-[#92400e]"
                description={`Menunggu: ${metrics?.visits_by_status?.waiting ?? 0}`}
              />
            </>
          )}
        </div>
      </section>

      {/* Visit Status Row */}
      {!dashLoading && metrics && (
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Menunggu',     count: metrics.visits_by_status.waiting, color: 'bg-[#e0f2fe]', textColor: 'text-[#0369a1]', icon: 'hourglass_empty' },
            { label: 'Berlangsung', count: metrics.visits_by_status.ongoing, color: 'bg-[#fef3c7]', textColor: 'text-[#92400e]', icon: 'autorenew'      },
            { label: 'Selesai',     count: metrics.visits_by_status.done,    color: 'bg-[#dcfce7]', textColor: 'text-[#14532d]', icon: 'check_circle'   },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3`}>
              <span className={`material-symbols-outlined ${s.textColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {s.icon}
              </span>
              <div>
                <p className={`text-2xl font-bold ${s.textColor} tabular-nums`}>{s.count}</p>
                <p className={`text-xs ${s.textColor} opacity-80`}>{s.label}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Chart + Quick Links */}
      <section className={`grid grid-cols-1 gap-6 ${isRevenueLocked ? '' : 'lg:grid-cols-3'}`}>

        {/* Revenue Chart — disembunyikan total untuk pj_klinik */}
        {!isRevenueLocked && (
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#bcc9c6]">
              <div>
                <h3 className="text-sm font-semibold text-[#0b1c30]">Pendapatan Bulanan {year}</h3>
                <p className="text-xs text-[#6d7a77] mt-0.5">Tren revenue dan kunjungan per bulan</p>
              </div>
              <div className="flex gap-1">
                {(['area', 'bar'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChartVariant(v)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      chartVariant === v
                        ? 'bg-[#00685f] text-white font-semibold'
                        : 'bg-[#eff4ff] text-[#3d4947] hover:text-[#00685f]'
                    }`}
                  >
                    {v === 'area' ? 'Area' : 'Bar'}
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart
              data={monthly ?? []}
              isLoading={monthlyLoading}
              variant={chartVariant}
              height={260}
            />
          </div>
        )}

        {/* Quick Links */}
        <div className="flex flex-col gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#0b1c30] mb-3">Aksi Cepat</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Tambah Pasien', icon: 'person_add',    href: '/patients/new?from=dashboard'      },
                { label: 'Buat Jadwal',   icon: 'edit_calendar', href: '/appointments/new?from=dashboard'  },
                { label: 'Rekam Medis',   icon: 'description',   href: '/medical-records?from=dashboard'   },
                { label: 'Invoice Baru',  icon: 'receipt_long',  href: '/billing/new?from=dashboard'       },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  prefetch={false}
                  className="flex flex-col items-center justify-center p-3 border border-[#bcc9c6]/40 rounded-xl bg-white hover:border-[#00685f]/40 hover:text-[#00685f] transition-colors text-[#3d4947] group"
                >
                  <span
                    className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform text-[20px]"
                    style={{ fontVariationSettings: "'wght' 300" }}
                  >
                    {a.icon}
                  </span>
                  <span className="text-xs font-medium text-center leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Card Laporan — disembunyikan total untuk pj_klinik */}
          {!isRevenueLocked && (
            <div className="glass-card rounded-xl p-5 flex-1">
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-1">Laporan</h3>
              <p className="text-xs text-[#6d7a77] mb-3">Lihat laporan lengkap harian & bulanan</p>
              <Link
                href="/reports"
                prefetch={false}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#eff4ff] text-[#0058be] text-sm font-semibold rounded-lg hover:bg-[#dce9ff] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">assessment</span>
                Buka Laporan
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Status Operasional Terapis (owner & pj_klinik) ── */}
      <section>
        <TherapistStatusPanel
          title="Status Operasional Terapis Hari Ini"
          showSchedule={true}
        />
      </section>

      {/* Therapist Activity Table (aggregate, dari API) */}
      <section>
        <TherapistActivityTable data={therapists} isLoading={dashLoading} />
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Default export — role-aware router
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hasRole } = useAuth();

  if (hasRole('terapis')) {
    return <TherapistDashboard />;
  }

  if (hasRole('resepsionis')) {
    return <ResepsionistDashboard />;
  }

  return <AdminDashboard />;
}