'use client';

import { useMemo, useState } from 'react';
import {
  useCreateRevenueDistribution,
  useRevenueDistributions,
  useRevenuePreview,
  useRevenueTeam,
} from '@/hooks/useClinicSettings';
import { useToast } from '@/components/ui-custom/Toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type { RevenueTeamMember, TherapistPerformanceItem } from '@/types/clinic-settings';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';
import { Pagination } from '@/components/ui-custom/Pagination';

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPeriodDate(value: string) {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

const ROLE_LABELS: Record<string, string> = {
  pj_klinik: 'PJ Klinik',
  resepsionis: 'Resepsionis',
  terapis: 'Terapis',
};

const ROLE_THEMES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  terapis: {
    bg: 'bg-[#00685f]/10',
    text: 'text-[#00685f]',
    border: 'border-[#00685f]/30',
    icon: 'medical_services',
  },
  pj_klinik: {
    bg: 'bg-[#4338ca]/10',
    text: 'text-[#4338ca]',
    border: 'border-[#4338ca]/30',
    icon: 'admin_panel_settings',
  },
  resepsionis: {
    bg: 'bg-[#b45309]/10',
    text: 'text-[#b45309]',
    border: 'border-[#b45309]/30',
    icon: 'support_agent',
  },
};

export default function RevenueDistributionPage() {
  const toast = useToast();
  const today = useMemo(() => localDateString(new Date()), []);
  const firstDay = useMemo(() => `${today.slice(0, 8)}01`, [today]);

  const [periodStart, setPeriodStart] = useState(firstDay);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(5);

  // Filter & Search states
  const [selectedRole, setSelectedRole] = useState<'all' | 'terapis' | 'pj_klinik' | 'resepsionis'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const preview = useRevenuePreview(periodStart, periodEnd);
  const team = useRevenueTeam();
  const distributions = useRevenueDistributions(historyPage, historyPerPage);
  const createDistribution = useCreateRevenueDistribution();

  const accumulatedRevenue = Number(preview.data?.accumulated_revenue ?? 0);
  const therapistPerfMap: Record<string | number, TherapistPerformanceItem> = useMemo(() => {
    return preview.data?.therapist_performance ?? {};
  }, [preview.data]);

  const rows = distributions.data?.data ?? [];
  const teamMembers = team.data ?? [];

  const allocations = useMemo(
    () => teamMembers
      .map((member) => ({
        user_id: member.id,
        amount: Number(amounts[member.id] || 0),
      }))
      .filter((allocation) => Number.isFinite(allocation.amount) && allocation.amount > 0),
    [amounts, teamMembers],
  );

  const totalDistributed = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const remainingRevenue = accumulatedRevenue - totalDistributed;
  const overLimit = totalDistributed > accumulatedRevenue;
  const percentAllocated = accumulatedRevenue > 0
    ? Math.min(Math.round((totalDistributed / accumulatedRevenue) * 100), 100)
    : 0;

  function setMemberAmount(userId: number, value: string) {
    const num = parseNumberFromDots(value);
    setAmounts((current) => ({ ...current, [userId]: num ? String(num) : '' }));
  }

  // Quick Period presets
  function applyPreset(preset: 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days') {
    const now = new Date();
    if (preset === 'this_month') {
      setPeriodStart(firstDay);
      setPeriodEnd(today);
    } else if (preset === 'last_month') {
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setPeriodStart(localDateString(prevMonthFirstDay));
      setPeriodEnd(localDateString(prevMonthLastDay));
    } else if (preset === 'last_7_days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setPeriodStart(localDateString(d));
      setPeriodEnd(today);
    } else if (preset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setPeriodStart(localDateString(d));
      setPeriodEnd(today);
    }
  }

  // Smart Helper: Bagi berdasarkan Omzet Riil yang dihasilkan masing-masing terapis
  function applyPerformancePercentage(percentage: number) {
    const newAmounts = { ...amounts };
    let totalAssigned = 0;
    let countAssigned = 0;

    teamMembers.forEach((member) => {
      if (member.role !== 'terapis') return;
      const perf = therapistPerfMap[member.id];
      const genRev = Number(perf?.generated_revenue ?? 0);
      if (genRev > 0) {
        const allocated = Math.round((genRev * percentage) / 100);
        newAmounts[member.id] = String(allocated);
        totalAssigned += allocated;
        countAssigned++;
      }
    });

    if (countAssigned === 0) {
      toast.info('Tidak Ada Riwayat Omzet', 'Belum ada terapis yang menghasilkan omzet pada periode ini.');
      return;
    }

    setAmounts(newAmounts);
    toast.success(
      'Alokasi Berhasil',
      `${countAssigned} terapis dialokasikan ${percentage}% dari omzet riil mereka (Total: ${rupiah(totalAssigned)}).`
    );
  }

  // Smart Helper: Bagi Rata
  function distributeEqually(targetRole?: 'terapis' | 'all') {
    const targets = targetRole === 'terapis'
      ? teamMembers.filter((m) => m.role === 'terapis')
      : teamMembers;

    if (targets.length === 0) {
      toast.info('Tidak ada anggota', 'Tidak ditemukan anggota untuk pembagian ini.');
      return;
    }

    const pool = remainingRevenue > 0 ? remainingRevenue : accumulatedRevenue;
    if (pool <= 0) {
      toast.info('Tidak ada omzet', 'Akumulasi omzet pada periode ini adalah Rp 0.');
      return;
    }

    const share = Math.floor(pool / targets.length);
    if (share <= 0) {
      toast.info('Nominal terlalu kecil', 'Omzet tidak mencukupi untuk dibagikan rata.');
      return;
    }

    const newAmounts = { ...amounts };
    targets.forEach((member, idx) => {
      // Jika ada sisa desimal pembagian, serap ke orang pertama agar tepat pas 100%
      const remainder = idx === 0 ? pool - (share * targets.length) : 0;
      const current = Number(newAmounts[member.id] || 0);
      const toAdd = remainingRevenue > 0 ? current + share + remainder : share + remainder;
      newAmounts[member.id] = String(toAdd);
    });

    setAmounts(newAmounts);
    toast.success(
      'Bagi Rata Berhasil',
      `Masing-masing dari ${targets.length} ${targetRole === 'terapis' ? 'Terapis' : 'anggota tim'} menerima rata-rata ${rupiah(share)}.`
    );
  }

  function clearMember(userId: number) {
    setAmounts((prev) => ({ ...prev, [userId]: '' }));
  }

  function resetAll() {
    setAmounts({});
    toast.info('Direset', 'Semua isian pembagian tim telah dikosongkan.');
  }

  // Grouped members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      if (selectedRole !== 'all' && member.role !== selectedRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(q);
        const matchesSpec = member.specialization?.toLowerCase().includes(q);
        return matchesName || matchesSpec;
      }
      return true;
    });
  }, [teamMembers, selectedRole, searchQuery]);

  const therapists = useMemo(() => filteredMembers.filter((m) => m.role === 'terapis'), [filteredMembers]);
  const pjs = useMemo(() => filteredMembers.filter((m) => m.role === 'pj_klinik'), [filteredMembers]);
  const receptionists = useMemo(() => filteredMembers.filter((m) => m.role === 'resepsionis'), [filteredMembers]);

  async function submit() {
    if (allocations.length === 0) {
      toast.info('Pembagian belum diisi', 'Masukkan nominal minimal untuk satu anggota tim klinik.');
      return;
    }

    if (overLimit) {
      toast.error('Nominal melebihi omzet', 'Total pembagian tim tidak boleh melebihi akumulasi pendapatan.');
      return;
    }

    try {
      await createDistribution.mutateAsync({
        period_start: periodStart,
        period_end: periodEnd,
        allocations,
        notes: notes.trim() || undefined,
      });
      setAmounts({});
      setNotes('');
      toast.success('Pembagian omzet tersimpan', `${allocations.length} anggota tim berhasil dicatat.`);
    } catch (error: unknown) {
      toast.error('Gagal menyimpan pembagian omzet', getApiErrorMessage(error, 'Periksa periode dan nominal pembagian tim.'));
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] md:text-3xl flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[30px] text-[#00685f]">savings</span>
          Pembagian Omzet Tim
        </h1>
        <p className="mt-1 text-sm text-[#3d4947]">
          Tentukan nominal bagi hasil dan komisi staf berdasarkan riwayat tindakan dan omzet riil yang dihasilkan masing-masing terapis pada periode ini.
        </p>
      </div>

      {/* ── Main Workspace Card ── */}
      <section className="space-y-6 rounded-2xl border border-[#bcc9c6]/40 bg-white p-5 shadow-sm md:p-6">

        {/* 1. Date Range & Quick Presets */}
        <div className="space-y-3 border-b border-[#bcc9c6]/20 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3d4947] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#00685f]">date_range</span>
              Periode Akumulasi Omzet
            </span>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('this_month')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#bcc9c6]/40 hover:bg-[#eff4ff] text-[#00685f] transition-colors"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_month')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#bcc9c6]/40 hover:bg-[#eff4ff] text-[#00685f] transition-colors"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_30_days')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#bcc9c6]/40 hover:bg-[#eff4ff] text-[#00685f] transition-colors"
              >
                30 Hari Terakhir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="period-start" className="mb-1 block text-xs text-[#6d7a77]">Tanggal Mulai</label>
              <input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-[#bcc9c6] px-3 text-sm focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f]"
              />
            </div>
            <div>
              <label htmlFor="period-end" className="mb-1 block text-xs text-[#6d7a77]">Tanggal Akhir</label>
              <input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-[#bcc9c6] px-3 text-sm focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f]"
              />
            </div>
          </div>
        </div>

        {/* 2. Financial Overview Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#00685f]/30 bg-[#00685f]/5 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#00685f] uppercase tracking-wider">Akumulasi Omzet</p>
              <span className="material-symbols-outlined text-[20px] text-[#00685f]">monetization_on</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#00685f]">
              {preview.isFetching ? 'Menghitung...' : rupiah(accumulatedRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-[#6d7a77]">Total penerimaan klinik periode ini</p>
          </div>

          <div className="rounded-xl border border-[#bcc9c6]/40 bg-[#f8f9ff] p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Total Dialokasikan ke Tim</p>
              <span className="material-symbols-outlined text-[20px] text-[#3d4947]">send_money</span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${overLimit ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
              {rupiah(totalDistributed)}
            </p>
            <p className="mt-1 text-[11px] text-[#6d7a77]">
              {allocations.length} anggota ({percentAllocated}% dari omzet)
            </p>
          </div>

          <div className={`rounded-xl border p-4 relative overflow-hidden ${
            overLimit
              ? 'border-[#ba1a1a]/40 bg-[#ffdad6]/20'
              : remainingRevenue === 0 && totalDistributed > 0
              ? 'border-[#006b2d]/40 bg-[#dcfce7]/20'
              : 'border-[#bcc9c6]/40 bg-[#f8f9ff]'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                {overLimit ? 'Defisit / Melebihi Omzet' : 'Sisa Kas Klinik / Cadangan'}
              </p>
              <span className={`material-symbols-outlined text-[20px] ${
                overLimit ? 'text-[#ba1a1a]' : remainingRevenue === 0 && totalDistributed > 0 ? 'text-[#006b2d]' : 'text-[#3d4947]'
              }`}>
                {overLimit ? 'warning' : remainingRevenue === 0 && totalDistributed > 0 ? 'check_circle' : 'account_balance_wallet'}
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${
              overLimit ? 'text-[#ba1a1a]' : remainingRevenue === 0 && totalDistributed > 0 ? 'text-[#006b2d]' : 'text-[#0b1c30]'
            }`}>
              {overLimit ? `- ${rupiah(Math.abs(remainingRevenue))}` : rupiah(remainingRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-[#6d7a77]">
              {overLimit
                ? 'Nominal melebihi pemasukan klinik!'
                : remainingRevenue === 0 && totalDistributed > 0
                ? 'Semua omzet dibagikan habis (100%)'
                : 'Sisa omzet yang disimpan klinik'}
            </p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 bg-[#f8f9ff] p-3.5 rounded-xl border border-[#bcc9c6]/30">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[#3d4947]">Progress Pembagian Omzet</span>
            <span className={`font-bold ${overLimit ? 'text-[#ba1a1a]' : 'text-[#00685f]'}`}>
              {percentAllocated}% ({rupiah(totalDistributed)} / {rupiah(accumulatedRevenue)})
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                overLimit ? 'bg-[#ba1a1a]' : percentAllocated === 100 ? 'bg-[#006b2d]' : 'bg-[#00685f]'
              }`}
              style={{ width: `${Math.min(percentAllocated, 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Smart Controls: Role Tabs, Performance Helpers & Search */}
        <div className="space-y-3 pt-2">
          {/* Quick Smart Actions Banner */}
          <div className="bg-[#eff4ff]/60 border border-[#00685f]/20 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00685f]">auto_fix_high</span>
                Alat Bantu Pembagian Otomatis untuk Owner:
              </p>
              <p className="text-[11px] text-[#6d7a77]">
                Gunakan acuan omzet riil yang dihasilkan terapis untuk menentukan pembagian dalam 1 klik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPerformancePercentage(100)}
                disabled={accumulatedRevenue <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00685f] text-white text-xs font-bold hover:bg-[#00524b] transition-all shadow-xs disabled:opacity-50"
                title="Bagikan 100% omzet riil ke masing-masing terapis yang bekerja"
              >
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                100% Omzet Riil
              </button>

              <button
                type="button"
                onClick={() => applyPerformancePercentage(50)}
                disabled={accumulatedRevenue <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#00685f]/40 text-[#00685f] text-xs font-bold hover:bg-[#eff4ff] transition-all disabled:opacity-50"
                title="Bagikan 50% omzet riil (jasa medis) ke masing-masing terapis yang bekerja"
              >
                <span className="material-symbols-outlined text-[15px]">percent</span>
                50% Jasa Medis
              </button>

              <button
                type="button"
                onClick={() => applyPerformancePercentage(40)}
                disabled={accumulatedRevenue <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#00685f]/40 text-[#00685f] text-xs font-bold hover:bg-[#eff4ff] transition-all disabled:opacity-50"
                title="Bagikan 40% omzet riil ke masing-masing terapis yang bekerja"
              >
                <span className="material-symbols-outlined text-[15px]">percent</span>
                40% Jasa Medis
              </button>

              <button
                type="button"
                onClick={() => distributeEqually('terapis')}
                disabled={accumulatedRevenue <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#bcc9c6] text-[#3d4947] text-xs font-bold hover:bg-[#eff4ff] transition-all disabled:opacity-50"
                title="Bagi rata omzet ke semua terapis"
              >
                <span className="material-symbols-outlined text-[15px]">equal</span>
                Bagi Rata Terapis
              </button>

              {allocations.length > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-[#ba1a1a] text-xs font-semibold hover:bg-[#ffdad6]/30 transition-colors border border-[#ffdad6]"
                  title="Kosongkan semua isian pembagian"
                >
                  <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedRole('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedRole === 'all'
                    ? 'bg-[#00685f] text-white shadow-sm'
                    : 'bg-[#f8f9ff] text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
                }`}
              >
                Semua Tim ({teamMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('terapis')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedRole === 'terapis'
                    ? 'bg-[#00685f] text-white shadow-sm'
                    : 'bg-[#f8f9ff] text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">medical_services</span>
                Terapis ({teamMembers.filter((m) => m.role === 'terapis').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('pj_klinik')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedRole === 'pj_klinik'
                    ? 'bg-[#00685f] text-white shadow-sm'
                    : 'bg-[#f8f9ff] text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                PJ Klinik ({teamMembers.filter((m) => m.role === 'pj_klinik').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('resepsionis')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedRole === 'resepsionis'
                    ? 'bg-[#00685f] text-white shadow-sm'
                    : 'bg-[#f8f9ff] text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">support_agent</span>
                Resepsionis ({teamMembers.filter((m) => m.role === 'resepsionis').length})
              </button>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#6d7a77]">search</span>
              <input
                type="text"
                placeholder="Cari nama atau spesialisasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bcc9c6]/50 pl-9 pr-3 text-xs bg-[#f8f9ff] focus:bg-white focus:border-[#00685f] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Grouped Team Sections */}
        {team.isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#eff4ff]" />)}
          </div>
        ) : team.isError ? (
          <div className="rounded-xl border border-[#ffdad6] p-4 text-sm text-[#93000a]">Daftar tim klinik gagal dimuat.</div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-[#bcc9c6]/40 p-6 text-center text-sm text-[#6d7a77]">
            Tidak ada anggota tim yang cocok dengan filter atau pencarian.
          </div>
        ) : (
          <div className="space-y-6">

            {/* SECTION A: TERAPIS & PRAKTISI */}
            {therapists.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#bcc9c6]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#00685f]">medical_services</span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">Tim Terapis & Praktisi Klinis</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#00685f]/10 text-[#00685f]">
                      {therapists.length} Terapis
                    </span>
                  </div>
                  <span className="text-xs text-[#6d7a77]">
                    Subtotal Alokasi: <strong className="text-[#0b1c30]">{rupiah(
                      therapists.reduce((sum, m) => sum + Number(amounts[m.id] || 0), 0)
                    )}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {therapists.map((member) => (
                    <MemberAllocationCard
                      key={member.id}
                      member={member}
                      amount={amounts[member.id] || ''}
                      performance={therapistPerfMap[member.id]}
                      accumulatedRevenue={accumulatedRevenue}
                      onAmountChange={(val) => setMemberAmount(member.id, val)}
                      onSetDirect={(val) => setAmounts((prev) => ({ ...prev, [member.id]: String(val) }))}
                      onClear={() => clearMember(member.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION B: PJ KLINIK */}
            {pjs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#bcc9c6]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#4338ca]">admin_panel_settings</span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">Penanggung Jawab Klinik (PJ)</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4338ca]/10 text-[#4338ca]">
                      {pjs.length} PJ
                    </span>
                  </div>
                  <span className="text-xs text-[#6d7a77]">
                    Subtotal Alokasi: <strong className="text-[#0b1c30]">{rupiah(
                      pjs.reduce((sum, m) => sum + Number(amounts[m.id] || 0), 0)
                    )}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {pjs.map((member) => (
                    <MemberAllocationCard
                      key={member.id}
                      member={member}
                      amount={amounts[member.id] || ''}
                      accumulatedRevenue={accumulatedRevenue}
                      onAmountChange={(val) => setMemberAmount(member.id, val)}
                      onSetDirect={(val) => setAmounts((prev) => ({ ...prev, [member.id]: String(val) }))}
                      onClear={() => clearMember(member.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION C: RESEPSIONIS & OPERASIONAL */}
            {receptionists.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#bcc9c6]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#b45309]">support_agent</span>
                    <h2 className="text-sm font-bold text-[#0b1c30]">Resepsionis & Operasional</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#b45309]/10 text-[#b45309]">
                      {receptionists.length} Staf
                    </span>
                  </div>
                  <span className="text-xs text-[#6d7a77]">
                    Subtotal Alokasi: <strong className="text-[#0b1c30]">{rupiah(
                      receptionists.reduce((sum, m) => sum + Number(amounts[m.id] || 0), 0)
                    )}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {receptionists.map((member) => (
                    <MemberAllocationCard
                      key={member.id}
                      member={member}
                      amount={amounts[member.id] || ''}
                      accumulatedRevenue={accumulatedRevenue}
                      onAmountChange={(val) => setMemberAmount(member.id, val)}
                      onSetDirect={(val) => setAmounts((prev) => ({ ...prev, [member.id]: String(val) }))}
                      onClear={() => clearMember(member.id)}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 5. Catatan & Submit */}
        <div className="space-y-3 pt-3 border-t border-[#bcc9c6]/20">
          <div>
            <label htmlFor="distribution-notes" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#3d4947]">
              Catatan Pembagian (Opsional)
            </label>
            <textarea
              id="distribution-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Contoh: Pembagian jasa medis tindakan dan komisi periode Oktober 2026..."
              className="w-full min-w-0 resize-y rounded-xl border border-[#bcc9c6] px-3 py-2 text-sm focus:border-[#00685f] focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8f9ff] p-4 rounded-xl border border-[#bcc9c6]/30">
            <div>
              <p className="text-xs text-[#6d7a77]">Ringkasan Pembagian:</p>
              <p className="text-sm font-bold text-[#0b1c30]">
                {allocations.length} Anggota Menerima • Total Dibagikan: {rupiah(totalDistributed)}
              </p>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={createDistribution.isPending || !periodStart || !periodEnd || periodEnd < periodStart || allocations.length === 0 || overLimit}
              className="px-6 py-2.5 rounded-xl gradient-btn text-sm font-bold text-white shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {createDistribution.isPending ? 'Menyimpan...' : `Simpan Pembagian Omzet`}
            </button>
          </div>
        </div>
      </section>

      {/* ── Riwayat Pembagian Tim ── */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#bcc9c6]/40 bg-white shadow-sm">
        <div className="border-b border-[#bcc9c6]/30 p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#00685f]">history</span>
              Riwayat Pembagian Omzet Tim
            </h2>
            <p className="mt-0.5 text-xs text-[#6d7a77]">Snapshot akumulasi dan nominal per anggota tersimpan pada saat pembagian dibuat.</p>
          </div>
        </div>

        {distributions.isLoading ? (
          <div className="p-5"><div className="h-32 animate-pulse rounded-xl bg-[#eff4ff]" /></div>
        ) : distributions.isError ? (
          <div className="p-8 text-center text-sm text-[#ba1a1a]">Riwayat pembagian omzet gagal dimuat.</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#6d7a77]">Belum ada pembagian omzet yang dicatat.</div>
        ) : (
          <div className="space-y-3 p-4 md:p-5">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-[#bcc9c6]/30 bg-[#f8f9ff] p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#0b1c30]">
                      {formatPeriodDate(row.period_start)} — {formatPeriodDate(row.period_end)}
                    </p>
                    <p className="mt-1 text-xs text-[#6d7a77]">Dicatat oleh {row.creator?.name ?? 'Owner'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:text-right">
                    <div>
                      <p className="text-[11px] text-[#6d7a77]">Akumulasi</p>
                      <p className="text-sm font-semibold text-[#0b1c30]">{rupiah(Number(row.accumulated_revenue))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#6d7a77]">Total Dibagikan</p>
                      <p className="text-sm font-bold text-[#00685f]">{rupiah(Number(row.distribution_amount))}</p>
                    </div>
                  </div>
                </div>

                {row.allocations?.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {row.allocations.map((allocation) => (
                      <div key={allocation.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#bcc9c6]/30 bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#0b1c30]">{allocation.name}</p>
                          <p className="truncate text-[11px] text-[#6d7a77]">
                            {ROLE_LABELS[allocation.role ?? ''] ?? allocation.role ?? 'Tim Klinik'}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-bold text-[#00685f]">{rupiah(Number(allocation.amount))}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-[#bcc9c6]/30 bg-white px-3 py-2 text-xs text-[#6d7a77]">
                    Catatan lama: pembagian ini dibuat sebelum fitur nominal per anggota tim.
                  </p>
                )}

                {row.notes && <p className="mt-3 text-xs text-[#3d4947]">Catatan: {row.notes}</p>}
              </article>
            ))}
          </div>
        )}

        {distributions.data && (
          <Pagination
            page={distributions.data.current_page}
            totalPages={distributions.data.last_page}
            total={distributions.data.total}
            perPage={historyPerPage}
            perPageOptions={[5, 10, 20]}
            itemName="riwayat pembagian"
            onPageChange={(p) => setHistoryPage(p)}
            onPerPageChange={(newPerPage) => {
              setHistoryPerPage(newPerPage);
              setHistoryPage(1);
            }}
          />
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Kartu Anggota Tim dengan Riwayat Kinerja Riil
// ─────────────────────────────────────────────────────────────
function MemberAllocationCard({
  member,
  amount,
  performance,
  accumulatedRevenue,
  onAmountChange,
  onSetDirect,
  onClear,
}: {
  member: RevenueTeamMember;
  amount: string;
  performance?: TherapistPerformanceItem;
  accumulatedRevenue: number;
  onAmountChange: (value: string) => void;
  onSetDirect: (value: number) => void;
  onClear: () => void;
}) {
  const theme = ROLE_THEMES[member.role] ?? {
    bg: 'bg-[#eff4ff]',
    text: 'text-[#3d4947]',
    border: 'border-[#bcc9c6]/30',
    icon: 'person',
  };

  const numAmount = Number(amount || 0);
  const genRevenue = Number(performance?.generated_revenue ?? 0);
  const treatmentCount = Number(performance?.treatment_count ?? 0);

  const contributionShare = accumulatedRevenue > 0 && genRevenue > 0
    ? ((genRevenue / accumulatedRevenue) * 100).toFixed(1)
    : null;

  return (
    <div className={`flex flex-col gap-2.5 rounded-xl border p-3.5 transition-all shadow-xs ${
      genRevenue > 0 ? 'bg-white border-[#00685f]/30 ring-1 ring-[#00685f]/10' : 'bg-[#f8f9ff] border-[#bcc9c6]/40'
    }`}>
      {/* Top row: Avatar + Details + Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Avatar + Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${theme.bg} ${theme.text}`}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#0b1c30]">{member.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${theme.bg} ${theme.text}`}>
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              {member.specialization && (
                <span className="truncate text-[11px] text-[#6d7a77]">
                  • {member.specialization}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Nominal Input & Clear */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
          <div className="relative w-36 sm:w-40">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6d7a77]">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberWithDots(amount)}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              aria-label={`Nominal pembagian untuk ${member.name}`}
              className="h-9 w-full rounded-lg border border-[#bcc9c6] bg-white pl-8 pr-2 text-xs font-bold text-[#0b1c30] text-right outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f]"
            />
          </div>

          {numAmount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg border border-[#ffdad6] hover:bg-[#ffdad6]/40 text-[#ba1a1a] transition-colors"
              title="Kosongkan nominal"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Riwayat Kinerja Riil & Quick Buttons (khusus terapis) */}
      {member.role === 'terapis' && (
        <div className="pt-2 border-t border-[#bcc9c6]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {genRevenue > 0 || treatmentCount > 0 ? (
            <div className="flex items-center gap-1.5 text-[#00685f] font-semibold text-[11px]">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>
                Omzet Riil: <strong>{rupiah(genRevenue)}</strong> ({treatmentCount} Tindakan • {contributionShare}% omzet)
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-[#8c9a97] italic">
              Tidak ada riwayat tindakan di periode ini (Rp 0)
            </span>
          )}

          {/* Quick preset buttons for this therapist based on their actual performance */}
          {genRevenue > 0 && (
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onSetDirect(genRevenue)}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00685f]/10 text-[#00685f] hover:bg-[#00685f]/20 transition-colors"
                title="Beri 100% omzet yang dihasilkan terapis ini"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => onSetDirect(Math.round(genRevenue * 0.5))}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff4ff] text-[#3d4947] hover:bg-[#e2e8f0] transition-colors"
                title="Beri 50% jasa medis dari omzet yang dihasilkan"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => onSetDirect(Math.round(genRevenue * 0.4))}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff4ff] text-[#3d4947] hover:bg-[#e2e8f0] transition-colors"
                title="Beri 40% jasa medis dari omzet yang dihasilkan"
              >
                40%
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
