'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useBillings } from '@/hooks/useBilling';
import type { PaymentStatus } from '@/types/billing';
import { Pagination } from '@/components/ui-custom/Pagination';

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid:    'bg-[#ecfdf5] text-[#065f46] border border-[#065f46]/20',
  unpaid:  'bg-[#ffdad6]/60 text-[#ba1a1a] border border-[#ba1a1a]/20',
  partial: 'bg-[#eff6ff] text-[#1e40af] border border-[#1e40af]/20',
};
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid:    'Lunas',
  unpaid:  'Belum Lunas',
  partial: 'Sebagian',
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

// Bila backend mengirim null (invoice lewat 24 jam, requester resepsionis),
// tampilkan strip netral saja — tanpa label atau ikon yang menonjolkan bahwa data disembunyikan.
function renderAmount(amount: number | null) {
  if (amount === null) {
    return <span className="text-[#bcc9c6]">—</span>;
  }
  return formatRupiah(amount);
}

export default function BillingPage() {
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading, error } = useBillings({
    payment_status: filterStatus || undefined,
    page,
    per_page: perPage,
  });

  const billings = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Pembayaran & Billing</h1>
          <p className="text-sm text-[#3d4947] mt-1">Kelola invoice dan status pembayaran pasien</p>
        </div>
        <Link
          href="/billing/new"
          prefetch={false}
          className="inline-flex items-center gap-2 h-10 px-5 gradient-btn text-white rounded-xl text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Buat Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as PaymentStatus | ''); setPage(1); }}
            className="h-10 pl-4 pr-10 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
          >
            <option value="">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="partial">Sebagian</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px] pointer-events-none">expand_more</span>
        </div>
        {filterStatus && (
          <button
            onClick={() => { setFilterStatus(''); setPage(1); }}
            className="h-10 px-4 rounded-xl border border-[#bcc9c6] text-sm text-[#3d4947] hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 flex items-center justify-between bg-[#f8f9ff]">
          <h2 className="text-base font-semibold text-[#0b1c30]">Riwayat Transaksi</h2>
          {meta && <span className="text-xs text-[#3d4947]">{meta.total} invoice</span>}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-[#00685f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-[#ba1a1a] mb-2">error</span>
            <p className="text-sm text-[#3d4947]">Gagal memuat data billing.</p>
          </div>
        )}

        {!isLoading && !error && billings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#bcc9c6] mb-3">receipt_long</span>
            <p className="text-base font-medium text-[#0b1c30]">Tidak ada invoice</p>
            <p className="text-sm text-[#3d4947] mt-1">
              {filterStatus ? 'Coba ubah filter' : 'Belum ada invoice yang dibuat'}
            </p>
          </div>
        )}

        {!isLoading && billings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Pasien</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Metode</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/20">
                {billings.map((billing) => (
                  <tr key={billing.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[#00685f] font-mono">INV-{String(billing.id).padStart(6, '0')}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-[#0b1c30]">
                        {billing.patient?.full_name ?? `Pasien #${billing.patient_id}`}
                      </p>
                      {billing.is_draft_from_booking && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#fff4e5] text-[#8a5a00] text-[11px] font-semibold">
                          <span className="material-symbols-outlined text-[12px]">edit_note</span>
                          Draft, dari Booking
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#3d4947]">
                      {format(new Date(billing.created_at), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#3d4947]">
                      {billing.is_package_covered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00685f]/10 text-[#00685f] text-xs font-semibold">
                          <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                          Paket
                        </span>
                      ) : (
                        billing.payment_method ?? '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0b1c30] text-right">
                      {renderAmount(billing.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[billing.payment_status]}`}>
                        {STATUS_LABEL[billing.payment_status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/billing/${billing.id}`}
                        prefetch={false}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00685f] border border-[#00685f]/30 hover:bg-[#00685f]/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <Pagination
            page={meta.current_page}
            totalPages={meta.last_page}
            total={meta.total}
            perPage={perPage}
            perPageOptions={[5, 10, 25]}
            itemName="invoice"
            onPageChange={(p) => setPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}