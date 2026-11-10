'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useBilling, useUpdatePaymentStatus, useConfirmBillingDraft, useRecordBillingPayment } from '@/hooks/useBilling';
import { PaymentStatusModal } from '@/components/ui-custom/PaymentStatusModal';
import { RecordPaymentModal } from '@/components/ui-custom/RecordPaymentModal';
import { DownloadInvoiceButton } from '@/components/ui-custom/DownloadInvoiceButton';
import { useToast } from '@/components/ui-custom/Toast';
import { useAuth } from '@/contexts/AuthContext';
import type { PaymentStatus, RecordPaymentData } from '@/types/billing';
import { getApiErrorMessage } from '@/lib/api-error';

const RECEPTIONIST_EXPIRED_MESSAGE =
  'Invoice ini sudah melewati 24 jam pencetakan, hubungi Owner untuk keperluan perubahan';

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

export default function BillingDetailPage() {
  const params = useParams();
  const billingId = Number(params.id);
  const toast = useToast();
  const { hasRole } = useAuth();

  const { data: billing, isLoading, error } = useBilling(billingId);
  const { mutateAsync: updatePayment, isPending: updating } = useUpdatePaymentStatus(billingId);
  const { mutateAsync: confirmDraft, isPending: confirming } = useConfirmBillingDraft(billingId);
  const recordPayment = useRecordBillingPayment(billingId);

  const [modalOpen, setModalOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  // Resepsionis hanya boleh operasi Read & Update selama invoice belum
  // melewati 24 jam sejak tercetak. Owner/PJ Klinik tidak terkena batasan ini.
  const isReceptionistLocked =
    hasRole('resepsionis') && !!billing?.is_locked_for_receptionist;

  // Billing yang dicover paket sudah lunas otomatis saat redeem — tidak ada
  // status pembayaran manual yang bisa diubah lagi untuk invoice ini.
  const isPackageCovered = !!billing?.is_package_covered;
  const hasPaymentLedger = (billing?.payments?.length ?? 0) > 0;
  const isLegacyPaidWithoutLedger = billing?.payment_status === 'paid' && !hasPaymentLedger;

  // Invoice draft dari Booking hanya boleh dikonfirmasi setelah kunjungan
  // pasien selesai dicatat resepsionis (visit status done).
  const isVisitDone = billing?.visit?.status === 'done';

  async function handlePaymentConfirm(status: PaymentStatus, method?: string) {
    try {
      await updatePayment({ payment_status: status, payment_method: method });
      setModalOpen(false);
      toast.success('Status pembayaran diperbarui', `Invoice ditandai sebagai ${STATUS_LABEL[status]}.`);
    } catch (err: unknown) {
      toast.error('Gagal memperbarui pembayaran', getApiErrorMessage(err, 'Terjadi kesalahan. Silakan coba lagi.'));
      setModalOpen(false);
    }
  }

  async function handleConfirmDraft() {
    try {
      await confirmDraft();
      toast.success('Invoice dikonfirmasi', 'Badge draft dari Booking telah dihapus.');
    } catch (err: unknown) {
      toast.error('Gagal mengonfirmasi invoice', getApiErrorMessage(err, 'Terjadi kesalahan. Silakan coba lagi.'));
    }
  }

  async function handleRecordPayment(payload: RecordPaymentData) {
    try {
      const updatedBilling = await recordPayment.mutateAsync(payload);
      setRecordPaymentOpen(false);
      const remaining = updatedBilling.remaining_amount ?? 0;
      toast.success(
        remaining <= 0 ? 'Pembayaran lunas' : 'Pembayaran berhasil dicatat',
        remaining <= 0
          ? 'Tagihan pasien sudah dinyatakan lunas.'
          : `Sisa tagihan ${formatRupiah(remaining)}. Status invoice otomatis menjadi Sebagian.`,
      );
    } catch (err: unknown) {
      toast.error('Pembayaran gagal dicatat', getApiErrorMessage(err, 'Periksa nominal pembayaran dan coba kembali.'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-8 w-8 text-[#00685f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <p className="text-base font-medium text-[#0b1c30]">Invoice tidak ditemukan</p>
        <Link href="/billing" className="text-sm text-[#00685f] hover:underline font-medium">← Kembali ke daftar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/billing"
          className="p-2 rounded-xl border border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0b1c30]">
            Invoice <span className="font-mono text-[#00685f]">INV-{String(billing.id).padStart(6, '0')}</span>
          </h1>
          <p className="text-sm text-[#3d4947] mt-0.5">
            {format(new Date(billing.created_at), 'd MMMM yyyy', { locale: localeId })}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[billing.payment_status]}`}>
          {STATUS_LABEL[billing.payment_status]}
        </span>
        {billing.is_draft_from_booking && (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#fff4e5] text-[#8a5a00] border border-[#8a5a00]/20">
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            Draft, dari Booking
          </span>
        )}
        <DownloadInvoiceButton billing={billing} />
      </div>

      {/* Draft-from-booking banner — invoice ini auto-generate saat pasien booking
          via landing page, belum divalidasi resepsionis (qty/layanan/harga bisa
          masih perlu disesuaikan sesuai hasil kunjungan aktual). */}
      {billing.is_draft_from_booking && (
        <div className="rounded-xl border border-[#8a5a00]/30 bg-[#fff4e5] px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#8a5a00] text-[22px]">edit_note</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0b1c30]">
              Invoice ini otomatis terbentuk dari Booking landing page
            </p>
            <p className="text-xs text-[#3d4947] mt-0.5">
              Periksa dan sesuaikan layanan/qty/harga sesuai hasil kunjungan, lalu konfirmasi.
            </p>
          </div>
          {!isReceptionistLocked && (
            isVisitDone ? (
              <button
                onClick={handleConfirmDraft}
                disabled={confirming}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-[#8a5a00] text-white disabled:opacity-60 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                {confirming ? 'Mengonfirmasi...' : 'Konfirmasi Invoice'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="material-symbols-outlined text-[#8a5a00] text-[16px]">lock</span>
                <span className="text-xs font-semibold text-[#8a5a00]">Selesaikan dahulu Kunjungan Pasien ini</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Package-covered banner — tampil menonjol di atas supaya jelas invoice ini
          dibayar via paket sesi, bukan pembayaran manual */}
      {isPackageCovered && (
        <div className="rounded-xl border border-[#00685f]/30 bg-[#00685f]/5 px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00685f] text-[22px]">confirmation_number</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0b1c30]">
              Dibayar via Paket Terapi{billing.package ? ` — ${billing.package.name}` : ''}
            </p>
            {billing.package && (
              <p className="text-xs text-[#3d4947] mt-0.5">
                Sesi terpakai {billing.package.used_sessions} / {billing.package.total_sessions} •
                {' '}Sisa {billing.package.remaining_sessions} sesi
              </p>
            )}
          </div>
          {(billing.patient_id || billing.patient?.id) && (
            <Link
              href={`/patients/${billing.patient_id ?? billing.patient?.id}?from=billing`}
              className="text-xs font-semibold text-[#00685f] hover:underline whitespace-nowrap"
            >
              Lihat Paket →
            </Link>
          )}
        </div>
      )}

      {/* Patient & Visit info */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#0b1c30] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00685f] text-[18px]">person</span>
          Informasi Pasien & Kunjungan
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#3d4947] uppercase tracking-wider font-semibold mb-1">Pasien</p>
            <p className="text-[#0b1c30] font-medium">{billing.patient?.full_name ?? `#${billing.patient_id}`}</p>
            <p className="text-xs text-[#3d4947]">{billing.patient?.medical_record_number}</p>
          </div>
          <div>
            <p className="text-xs text-[#3d4947] uppercase tracking-wider font-semibold mb-1">Metode Bayar</p>
            <p className="text-[#0b1c30]">
              {isPackageCovered ? 'Paket Terapi (Prabayar)' : billing.payment_method ?? '—'}
            </p>
          </div>
          {billing.visit && (
            <>
              <div>
                <p className="text-xs text-[#3d4947] uppercase tracking-wider font-semibold mb-1">Tanggal Kunjungan</p>
                <p className="text-[#0b1c30]">
                  {format(new Date(billing.visit.visit_date + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#3d4947] uppercase tracking-wider font-semibold mb-1">Jenis Terapi</p>
                <p className="text-[#0b1c30]">{billing.visit.therapy_type}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Billing items */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 bg-[#f8f9ff]">
          <h2 className="text-base font-semibold text-[#0b1c30] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[18px]">receipt_long</span>
            Item Tagihan
          </h2>
        </div>

        {billing.items && billing.items.length > 0 ? (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                  <th className="px-5 py-3">Layanan</th>
                  <th className="px-5 py-3 text-center">Qty</th>
                  <th className="px-5 py-3 text-right">Harga Satuan</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/20">
                {billing.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30] font-medium">
                      {item.service?.name ?? `Layanan #${item.service_id}`}
                      {item.service?.category && (
                        <p className="text-xs text-[#3d4947] font-normal">{item.service.category}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30] text-center">{item.qty}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30] text-right">{renderAmount(item.price)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0b1c30] text-right">{renderAmount(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-[#bcc9c6]/40 bg-[#00685f]/5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0b1c30]">Total</p>
                <p className="text-xl font-bold text-[#00685f]">{renderAmount(billing.total_amount)}</p>
              </div>
              {isPackageCovered && (
                <p className="text-xs text-[#3d4947]">
                  {billing.total_amount && billing.total_amount > 0
                    ? 'Nilai paket tercatat di sesi pertama ini — sesi berikutnya akan tercatat Rp0 karena sudah dibayar di muka.'
                    : 'Sudah dibayar di muka pada sesi pertama pemakaian paket — tidak ada tagihan baru untuk sesi ini.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-[#3d4947]">
            Tidak ada item tagihan
          </div>
        )}
      </div>

      {/* Batch 2 — biaya tambahan seperti biaya pendaftaran disimpan terpisah
          dari item layanan agar snapshot invoice lama tetap utuh. */}
      {(billing.charges?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#bcc9c6]/60 bg-white shadow-sm">
          <div className="border-b border-[#bcc9c6]/40 bg-[#f8f9ff] px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0b1c30]">
              <span className="material-symbols-outlined text-[18px] text-[#00685f]">post_add</span>
              Biaya Tambahan
            </h2>
          </div>
          <div className="divide-y divide-[#bcc9c6]/20">
            {billing.charges?.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-[#0b1c30]">{charge.label}</p>
                  <p className="text-xs text-[#6d7a77]">{charge.type === 'registration' ? 'Biaya pendaftaran sebelum tindakan' : charge.type}</p>
                </div>
                <p className="text-sm font-bold text-[#0b1c30]">{renderAmount(charge.subtotal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail & Transaksi Pembayaran */}
      {!billing.price_hidden && (
        <div className="rounded-xl border border-[#bcc9c6]/60 bg-white p-5 shadow-sm sm:p-6 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#0b1c30]">
                <span className="material-symbols-outlined text-[18px] text-[#00685f]">payments</span>
                Pembayaran Tagihan
              </h2>
              <p className="mt-0.5 text-xs text-[#3d4947]">
                {isPackageCovered
                  ? 'Tagihan dicover oleh paket terapi pasien.'
                  : (billing.remaining_amount ?? 0) <= 0
                  ? 'Tagihan telah lunas sepenuhnya.'
                  : 'Catat pembayaran uang muka (DP) atau pelunasan tagihan pasien.'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!isPackageCovered && !isReceptionistLocked && (
                <>
                  {(billing.remaining_amount ?? 0) > 0 && !billing.is_draft_from_booking && (
                    <button
                      type="button"
                      onClick={() => setRecordPaymentOpen(true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00685f] px-4 text-sm font-semibold text-white hover:bg-[#008378] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_card</span>
                      Catat Pembayaran / DP
                    </button>
                  )}
                  {!hasPaymentLedger && !billing.is_draft_from_booking && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#bcc9c6] bg-white px-4 text-sm font-semibold text-[#0b1c30] hover:bg-[#f8f9ff] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      Ubah Status
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Ringkasan Nominal */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f8f9ff] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Total Tagihan</p>
              <p className="mt-1 text-lg font-bold text-[#0b1c30]">{renderAmount(billing.total_amount)}</p>
            </div>
            <div className="rounded-xl bg-[#00685f]/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Sudah Diterima</p>
              <p className="mt-1 text-lg font-bold text-[#00685f]">{renderAmount(billing.paid_amount)}</p>
            </div>
            <div className="rounded-xl bg-[#fff4e5] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Sisa Tagihan</p>
              <p className="mt-1 text-lg font-bold text-[#8a5a00]">{renderAmount(billing.remaining_amount)}</p>
            </div>
          </div>

          {/* Notifikasi Status Khusus */}
          {isPackageCovered && (
            <div className="flex items-start gap-2 rounded-xl border border-[#00685f]/20 bg-[#00685f]/5 px-4 py-3">
              <span className="material-symbols-outlined text-[#00685f] text-[18px] mt-0.5">check_circle</span>
              <p className="text-sm text-[#0b1c30] font-medium">
                Invoice ini lunas otomatis karena dibayar menggunakan paket terapi.
              </p>
            </div>
          )}

          {isReceptionistLocked && (
            <div className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/40 px-4 py-3">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5">lock</span>
              <p className="text-sm text-[#ba1a1a] font-medium">{RECEPTIONIST_EXPIRED_MESSAGE}</p>
            </div>
          )}

          {billing.is_draft_from_booking && (
            <div className="flex items-start gap-2 rounded-xl border border-[#8a5a00]/20 bg-[#fff4e5] px-4 py-3">
              <span className="material-symbols-outlined text-[#8a5a00] text-[18px] mt-0.5">lock</span>
              <p className="text-sm text-[#8a5a00] font-medium">
                Konfirmasi invoice ini terlebih dahulu sebelum bisa memproses pembayaran.
              </p>
            </div>
          )}

          {/* Riwayat Transaksi */}
          {!isPackageCovered && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Riwayat Pembayaran</p>
              {(billing.payments?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-[#bcc9c6] px-4 py-5 text-center text-xs text-[#6d7a77]">
                  Belum ada catatan transaksi pembayaran untuk invoice ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#bcc9c6]/30">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-[#f8f9ff] text-xs text-[#3d4947]">
                      <tr>
                        <th className="px-4 py-3 text-left">Waktu</th>
                        <th className="px-4 py-3 text-left">Metode</th>
                        <th className="px-4 py-3 text-left">Catatan</th>
                        <th className="px-4 py-3 text-left">Dicatat oleh</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#bcc9c6]/20">
                      {billing.payments?.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-[#3d4947]">
                            {payment.paid_at ? format(new Date(payment.paid_at), 'd MMM yyyy, HH:mm', { locale: localeId }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-[#0b1c30]">{payment.payment_method ?? '—'}</td>
                          <td className="max-w-[220px] px-4 py-3 text-[#3d4947]">{payment.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-[#3d4947]">{payment.recorded_by ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#00685f]">{renderAmount(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isPackageCovered && !billing.price_hidden && (
        <RecordPaymentModal
          isOpen={recordPaymentOpen}
          totalAmount={billing.total_amount ?? 0}
          paidAmount={billing.paid_amount ?? 0}
          remainingAmount={billing.remaining_amount ?? 0}
          onClose={() => setRecordPaymentOpen(false)}
          onConfirm={handleRecordPayment}
          isLoading={recordPayment.isPending}
        />
      )}

      {!isPackageCovered && !hasPaymentLedger && (
        <PaymentStatusModal
          isOpen={modalOpen}
          currentStatus={billing.payment_status}
          onClose={() => setModalOpen(false)}
          onConfirm={handlePaymentConfirm}
          isLoading={updating}
        />
      )}
    </div>
  );
}