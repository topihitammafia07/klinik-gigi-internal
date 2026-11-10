'use client';

import { useState, useMemo } from 'react';
import { format, subDays, subWeeks } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyReport, useDailyReport, useWeeklyReport, useCategoryReport, type CategoryReportItem } from '@/hooks/useReports';
import { RevenueChart } from '@/components/ui-custom/RevenueChart';
import { DateRangePicker, DateRange } from '@/components/ui-custom/DateRangePicker';
import { TherapistFilterSelect } from '@/components/ui-custom/TherapistFilterSelect';
import { useToast } from '@/components/ui-custom/Toast';
import { DailyReport, WeeklyReport, MonthlyRevenue } from '@/types/dashboard';
import { exportToXlsx } from '@/lib/exportToXlsx';
import { Pagination } from '@/components/ui-custom/Pagination';

function formatRp(v: number) {
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function CategoryTable({ data, isLoading }: { data: CategoryReportItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              {['Kategori Layanan', 'Jumlah Layanan', 'Total Sesi / Qty', 'Total Omzet (Revenue)', 'Kontribusi'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#bcc9c6]/10 animate-pulse">
                <td className="px-4 py-3"><div className="h-4 w-32 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-16 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 bg-[#eff4ff] rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#bcc9c6]">
        <span className="material-symbols-outlined text-4xl">category</span>
        <p className="text-sm text-[#3d4947]">Belum ada transaksi layanan pada rentang tanggal ini</p>
      </div>
    );
  }

  const grandTotalRevenue = data.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
  const grandTotalQty = data.reduce((sum, item) => sum + (Number(item.total_qty) || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
            {['Kategori Layanan', 'Jumlah Layanan', 'Total Sesi / Qty', 'Total Omzet (Revenue)', 'Kontribusi'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const revenue = Number(row.total_revenue) || 0;
            const percentage = grandTotalRevenue > 0 ? ((revenue / grandTotalRevenue) * 100).toFixed(1) : '0';
            return (
              <tr key={row.category} className="border-b border-[#bcc9c6]/10 hover:bg-[#f0fdf9]/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#0b1c30]">{row.category_label || row.category}</span>
                    <span className="text-[10px] text-[#6d7a77] uppercase bg-[#eff4ff] px-2 py-0.5 rounded-full font-mono">{row.category}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{row.service_count} jenis</td>
                <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums font-medium">{row.total_qty} sesi</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#00685f] tabular-nums">
                  {formatRp(revenue)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-[#eff4ff] rounded-full h-2 overflow-hidden">
                      <div className="bg-[#00685f] h-2 rounded-full" style={{ width: `${Math.min(100, Number(percentage))}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-[#3d4947]">{percentage}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#eff4ff]/70 font-semibold border-t-2 border-[#bcc9c6]">
            <td className="px-4 py-3 text-sm text-[#0b1c30]">Total Seluruh Kategori</td>
            <td className="px-4 py-3 text-sm text-[#0b1c30]">—</td>
            <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{grandTotalQty} sesi</td>
            <td className="px-4 py-3 text-sm text-[#00685f] tabular-nums">{formatRp(grandTotalRevenue)}</td>
            <td className="px-4 py-3 text-sm text-[#3d4947]">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DailyTable({ data, isLoading }: { data: DailyReport[]; isLoading: boolean }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              {['Tanggal', 'Kunjungan', 'Revenue', 'Lunas', 'Belum Lunas'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, i) => (
              <tr key={i} className="border-b border-[#bcc9c6]/10 animate-pulse">
                <td className="px-4 py-3"><div className="h-4 w-24 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#bcc9c6]">
        <span className="material-symbols-outlined text-4xl">table_view</span>
        <p className="text-sm text-[#3d4947]">Tidak ada data untuk rentang tanggal ini</p>
      </div>
    );
  }

  const totals = data.reduce((acc, row) => ({
    visit_count:  acc.visit_count  + row.visit_count,
    revenue:      acc.revenue      + row.revenue,
    paid_count:   acc.paid_count   + row.paid_count,
    unpaid_count: acc.unpaid_count + row.unpaid_count,
  }), { visit_count: 0, revenue: 0, paid_count: 0, unpaid_count: 0 });

  const totalItems = data.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              {['Tanggal', 'Kunjungan', 'Revenue', 'Lunas', 'Belum Lunas'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr key={row.date} className="border-b border-[#bcc9c6]/10 hover:bg-[#f0fdf9]/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-[#0b1c30]">
                  {new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                </td>
                <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{row.visit_count}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#00685f] tabular-nums">{formatRp(row.revenue)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#14532d]">{row.paid_count}</span>
                </td>
                <td className="px-4 py-3">
                  {row.unpaid_count > 0
                    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e]">{row.unpaid_count}</span>
                    : <span className="text-xs text-[#bcc9c6]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#eff4ff]/70 font-semibold border-t-2 border-[#bcc9c6]">
              <td className="px-4 py-3 text-sm text-[#0b1c30]">Total</td>
              <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{totals.visit_count}</td>
              <td className="px-4 py-3 text-sm text-[#00685f] tabular-nums">{formatRp(totals.revenue)}</td>
              <td className="px-4 py-3 text-sm text-[#14532d] tabular-nums">{totals.paid_count}</td>
              <td className="px-4 py-3 text-sm text-[#92400e] tabular-nums">{totals.unpaid_count}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalItems > perPage && (
        <Pagination
          currentPage={page}
          lastPage={lastPage}
          total={totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
          perPageOptions={[5, 10, 20]}
          itemName="hari"
        />
      )}
    </div>
  );
}

function WeeklyTable({ data, isLoading }: { data: WeeklyReport[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              {['Minggu', 'Kunjungan', 'Revenue', 'Lunas', 'Belum Lunas'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-[#bcc9c6]/10 animate-pulse">
                <td className="px-4 py-3"><div className="h-4 w-32 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#bcc9c6]">
        <span className="material-symbols-outlined text-4xl">table_view</span>
        <p className="text-sm text-[#3d4947]">Tidak ada data untuk rentang tanggal ini</p>
      </div>
    );
  }

  const totals = data.reduce((acc, row) => ({
    visit_count:  acc.visit_count  + row.visit_count,
    revenue:      acc.revenue      + row.revenue,
    paid_count:   acc.paid_count   + row.paid_count,
    unpaid_count: acc.unpaid_count + row.unpaid_count,
  }), { visit_count: 0, revenue: 0, paid_count: 0, unpaid_count: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
            {['Minggu', 'Kunjungan', 'Revenue', 'Lunas', 'Belum Lunas'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.week_start} className="border-b border-[#bcc9c6]/10 hover:bg-[#f0fdf9]/50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-[#0b1c30]">{row.week_label}</td>
              <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{row.visit_count}</td>
              <td className="px-4 py-3 text-sm font-semibold text-[#00685f] tabular-nums">{formatRp(row.revenue)}</td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#14532d]">{row.paid_count}</span>
              </td>
              <td className="px-4 py-3">
                {row.unpaid_count > 0
                  ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e]">{row.unpaid_count}</span>
                  : <span className="text-xs text-[#bcc9c6]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#eff4ff]/70 font-semibold border-t-2 border-[#bcc9c6]">
            <td className="px-4 py-3 text-sm text-[#0b1c30]">Total</td>
            <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{totals.visit_count}</td>
            <td className="px-4 py-3 text-sm text-[#00685f] tabular-nums">{formatRp(totals.revenue)}</td>
            <td className="px-4 py-3 text-sm text-[#14532d] tabular-nums">{totals.paid_count}</td>
            <td className="px-4 py-3 text-sm text-[#92400e] tabular-nums">{totals.unpaid_count}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const defaultDailyRange: DateRange = {
  start: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
  end:   format(new Date(), 'yyyy-MM-dd'),
  label: '30 Hari Terakhir',
};

const defaultWeeklyRange: DateRange = {
  start: format(subWeeks(new Date(), 7), 'yyyy-MM-dd'),
  end:   format(new Date(), 'yyyy-MM-dd'),
  label: '8 Minggu Terakhir',
};

export default function ReportsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isTerapis = user?.role === 'terapis';

  const [dailyRange, setDailyRange] = useState<DateRange>(defaultDailyRange);
  const [weeklyRange, setWeeklyRange] = useState<DateRange>(defaultWeeklyRange);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'category'>('daily');

  // Filter terapis — hanya dipakai/ditampilkan untuk owner/pj_klinik.
  // Untuk role terapis, filter ini tidak dirender dan backend otomatis scope ke user login.
  const [therapistId, setTherapistId] = useState<number | undefined>(undefined);

  const year = useMemo(() => new Date(dailyRange.start).getFullYear(), [dailyRange.start]);

  const { data: dailyData, isLoading: dailyLoading, isError: dailyError } = useDailyReport({
    start: dailyRange.start,
    end:   dailyRange.end,
    therapist_id: isTerapis ? undefined : therapistId,
  });

  const { data: weeklyData, isLoading: weeklyLoading, isError: weeklyError } = useWeeklyReport({
    start: weeklyRange.start,
    end:   weeklyRange.end,
    therapist_id: isTerapis ? undefined : therapistId,
  });

  const { data: monthlyData, isLoading: monthlyLoading, isError: monthlyError } = useMonthlyReport({
    year,
    therapist_id: isTerapis ? undefined : therapistId,
  });

  const { data: categoryData, isLoading: categoryLoading, isError: categoryError } = useCategoryReport({
    start: dailyRange.start,
    end:   dailyRange.end,
  });

  const handleExport = () => {
    try {
      if (activeTab === 'daily') {
        const rows = dailyData ?? [];
        if (!rows.length) {
          toast.info('Tidak Ada Data', 'Tidak ada data harian untuk diekspor.');
          return;
        }
        exportToXlsx<DailyReport>(
          rows,
          [
            {
              key: 'date',
              label: 'Tanggal',
              format: (v) => format(new Date(v as string), 'd MMMM yyyy', { locale: localeId }),
            },
            { key: 'visit_count', label: 'Jumlah Kunjungan', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'revenue', label: 'Total Revenue (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'billing_revenue', label: 'Revenue Billing Manual (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'package_revenue', label: 'Revenue Paket Terapi (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'paid_count', label: 'Tagihan Lunas', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'unpaid_count', label: 'Tagihan Belum Lunas', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          ],
          `Laporan_Harian_${dailyRange.start}_sd_${dailyRange.end}`,
          'Laporan Harian'
        );
        toast.success('Export Berhasil', `Laporan harian ${dailyRange.label} berhasil diunduh.`);
      } else if (activeTab === 'weekly') {
        const rows = weeklyData ?? [];
        if (!rows.length) {
          toast.info('Tidak Ada Data', 'Tidak ada data mingguan untuk diekspor.');
          return;
        }
        exportToXlsx<WeeklyReport>(
          rows,
          [
            { key: 'week_label', label: 'Minggu' },
            { key: 'week_start', label: 'Mulai', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: localeId }) : '—' },
            { key: 'week_end', label: 'Selesai', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: localeId }) : '—' },
            { key: 'visit_count', label: 'Jumlah Kunjungan', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'revenue', label: 'Total Revenue (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'billing_revenue', label: 'Revenue Billing Manual (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'package_revenue', label: 'Revenue Paket Terapi (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'paid_count', label: 'Tagihan Lunas', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'unpaid_count', label: 'Tagihan Belum Lunas', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          ],
          `Laporan_Mingguan_${weeklyRange.start}_sd_${weeklyRange.end}`,
          'Laporan Mingguan'
        );
        toast.success('Export Berhasil', `Laporan mingguan ${weeklyRange.label} berhasil diunduh.`);
      } else if (activeTab === 'category') {
        const rows = categoryData ?? [];
        if (!rows.length) {
          toast.info('Tidak Ada Data', 'Tidak ada data kategori untuk diekspor.');
          return;
        }
        exportToXlsx<CategoryReportItem>(
          rows,
          [
            { key: 'category_label', label: 'Kategori' },
            { key: 'category', label: 'Kode Kategori' },
            { key: 'service_count', label: 'Jenis Layanan', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'total_qty', label: 'Jumlah Sesi/Tindakan', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'total_revenue', label: 'Total Revenue (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          ],
          `Laporan_Kategori_${dailyRange.start}_sd_${dailyRange.end}`,
          'Laporan Kategori'
        );
        toast.success('Export Berhasil', `Laporan kategori ${dailyRange.label} berhasil diunduh.`);
      } else {
        const rows = monthlyData ?? [];
        if (!rows.length) {
          toast.info('Tidak Ada Data', 'Tidak ada data bulanan untuk diekspor.');
          return;
        }
        exportToXlsx<MonthlyRevenue>(
          rows,
          [
            { key: 'month_label', label: 'Bulan' },
            { key: 'visit_count', label: 'Jumlah Kunjungan', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'revenue', label: 'Total Revenue (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'billing_revenue', label: 'Revenue Billing Manual (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
            { key: 'package_revenue', label: 'Revenue Paket Terapi (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          ],
          `Laporan_Bulanan_${year}`,
          'Laporan Bulanan'
        );
        toast.success('Export Berhasil', `Laporan bulanan tahun ${year} berhasil diunduh.`);
      }
    } catch (err) {
      console.error('Export gagal:', err);
      toast.error('Export Gagal', 'Terjadi kesalahan saat mengekspor laporan.');
    }
  };

  const hasError =
    (activeTab === 'daily' && dailyError) ||
    (activeTab === 'weekly' && weeklyError) ||
    (activeTab === 'monthly' && monthlyError) ||
    (activeTab === 'category' && categoryError);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">
            {isTerapis ? 'Rekap Laporan Saya' : 'Laporan Klinik'}
          </h2>
          <p className="text-sm text-[#6d7a77] mt-0.5">
            {isTerapis
              ? 'Ringkasan kunjungan dan pendapatan dari sesi Anda'
              : 'Ringkasan pendapatan dan kunjungan pasien'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter terapis — hanya untuk owner/pj_klinik. Role terapis otomatis
              melihat data miliknya sendiri, jadi dropdown ini tidak relevan. */}
          {!isTerapis && activeTab !== 'category' && (
            <TherapistFilterSelect value={therapistId} onChange={setTherapistId} />
          )}

          {(activeTab === 'daily' || activeTab === 'category') && <DateRangePicker value={dailyRange} onChange={setDailyRange} />}
          {activeTab === 'weekly' && <DateRangePicker value={weeklyRange} onChange={setWeeklyRange} />}

          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              activeTab === 'category'
                ? 'bg-[#14532d] text-white hover:bg-[#166534]'
                : 'bg-white border border-[#bcc9c6] text-[#3d4947] hover:border-[#00685f] hover:text-[#00685f]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {activeTab === 'category' ? 'table_view' : 'download'}
            </span>
            <span>{activeTab === 'category' ? 'Export Excel Kategori (.xlsx)' : 'Export .xlsx'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-[#eff4ff] rounded-2xl p-1.5 w-fit border border-[#bcc9c6]/30 shadow-xs">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'daily'
              ? 'bg-white text-[#00685f] shadow-sm font-bold'
              : 'text-[#3d4947] hover:text-[#00685f]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">calendar_today</span>
          <span>Harian</span>
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'weekly'
              ? 'bg-white text-[#00685f] shadow-sm font-bold'
              : 'text-[#3d4947] hover:text-[#00685f]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">date_range</span>
          <span>Mingguan</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'monthly'
              ? 'bg-white text-[#00685f] shadow-sm font-bold'
              : 'text-[#3d4947] hover:text-[#00685f]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">stacked_line_chart</span>
          <span>Bulanan</span>
        </button>

        <button
          onClick={() => setActiveTab('category')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'category'
              ? 'bg-[#00685f] text-white shadow-sm font-bold'
              : 'text-[#00685f] bg-[#00685f]/10 hover:bg-[#00685f]/20 font-semibold'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">category</span>
          <span>Per Kategori</span>
        </button>
      </div>

      {activeTab === 'category' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#e0f4f1]/80 border border-[#00685f]/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00685f] text-[24px]">category</span>
            <div>
              <p className="text-xs font-bold text-[#00685f]">Laporan Omzet Per Kategori Layanan</p>
              <p className="text-xs text-[#3d4947] mt-0.5">
                Mengelompokkan performa pendapatan klinik ke 5 kategori resmi: Fisioterapi Dewasa, Okupasi Terapi (OT), Terapi Wicara (TW), Observasi, dan Obat &amp; Alat.
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-xl bg-[#14532d] text-white text-xs font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            Export .xlsx
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#bcc9c6]">
          <h3 className="text-sm font-semibold text-[#0b1c30]">
            {activeTab === 'monthly'
              ? `Tren Bulanan ${year}`
              : activeTab === 'weekly'
                ? `Tren Mingguan — ${weeklyRange.label}`
                : activeTab === 'category'
                  ? `Distribusi Revenue & Volume Per Kategori — ${dailyRange.label}`
                  : `Tren Harian — ${dailyRange.label}`}
          </h3>
        </div>

        {hasError ? (
          <div className="flex items-center gap-3 bg-[#ffdad6]/30 rounded-xl px-4 py-3 text-sm text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            <span>Gagal memuat data laporan. Periksa koneksi dan coba lagi.</span>
          </div>
        ) : activeTab === 'monthly' ? (
          <RevenueChart data={monthlyData ?? []} isLoading={monthlyLoading} variant="bar" height={260} />
        ) : activeTab === 'weekly' ? (
          <RevenueChart
            data={(weeklyData ?? []).map((w) => ({
              month: 0,
              month_label: w.week_label.replace(/^Minggu \d+ /, ''),
              revenue: w.revenue,
              visit_count: w.visit_count,
            }))}
            isLoading={weeklyLoading}
            variant="area"
            height={260}
          />
        ) : activeTab === 'category' ? (
          <RevenueChart
            data={(categoryData ?? []).map((c, i) => ({
              month: i + 1,
              month_label: c.category_label,
              revenue: c.total_revenue,
              visit_count: c.total_qty,
            }))}
            isLoading={categoryLoading}
            variant="bar"
            height={260}
          />
        ) : (
          <RevenueChart
            data={(dailyData ?? []).map((d) => ({
              month: 0,
              month_label: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              revenue: d.revenue,
              visit_count: d.visit_count,
            }))}
            isLoading={dailyLoading}
            variant="area"
            height={260}
          />
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#bcc9c6] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#00685f]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {activeTab === 'daily' ? 'calendar_today' : activeTab === 'weekly' ? 'date_range' : activeTab === 'category' ? 'category' : 'calendar_month'}
          </span>
          <h3 className="text-sm font-semibold text-[#0b1c30]">
            {activeTab === 'daily' ? 'Detail Harian' : activeTab === 'weekly' ? 'Detail Mingguan' : activeTab === 'category' ? 'Ringkasan Pendapatan Per Kategori' : 'Ringkasan Bulanan'}
          </h3>
        </div>

        {activeTab === 'daily' ? (
          <DailyTable data={dailyData ?? []} isLoading={dailyLoading} />
        ) : activeTab === 'weekly' ? (
          <WeeklyTable data={weeklyData ?? []} isLoading={weeklyLoading} />
        ) : activeTab === 'category' ? (
          <CategoryTable data={categoryData ?? []} isLoading={categoryLoading} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
                  {['Bulan', 'Kunjungan', 'Revenue'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyLoading
                  ? Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#bcc9c6]/10 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-[#eff4ff] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-8 bg-[#eff4ff] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 bg-[#eff4ff] rounded" /></td>
                    </tr>
                  ))
                  : (monthlyData ?? []).map((m) => (
                    <tr key={m.month} className="border-b border-[#bcc9c6]/10 hover:bg-[#f0fdf9]/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#0b1c30]">{m.month_label}</td>
                      <td className="px-4 py-3 text-sm text-[#0b1c30] tabular-nums">{m.visit_count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#00685f] tabular-nums">
                        {m.revenue > 0 ? formatRp(m.revenue) : <span className="text-[#bcc9c6]">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}