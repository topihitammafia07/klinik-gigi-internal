'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useBilling, useMarkBillingPrinted } from '@/hooks/useBilling';

function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

const STATUS_LABEL = {
  paid: 'Lunas',
  unpaid: 'Belum Lunas',
  partial: 'Sebagian',
} as const;

export default function InvoicePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const billingId = Number(params.id);
  const autoPrint = searchParams.get('auto') === '1';
  const { data: billing, isLoading, error } = useBilling(billingId);
  const markPrinted = useMarkBillingPrinted(billingId);
  const autoPrintStarted = useRef(false);

  const serviceSubtotal = useMemo(
    () => billing?.items?.reduce((sum, item) => sum + (item.subtotal ?? 0), 0) ?? 0,
    [billing?.items],
  );
  const chargesSubtotal = useMemo(
    () => billing?.charges?.reduce((sum, charge) => sum + (charge.subtotal ?? 0), 0) ?? 0,
    [billing?.charges],
  );

  useEffect(() => {
    if (!billing || !autoPrint || autoPrintStarted.current) return;
    autoPrintStarted.current = true;

    const currentBilling = billing;

    async function startPrint() {
      try {
        if (!currentBilling.is_draft_from_booking && !currentBilling.printed_at) {
          await markPrinted.mutateAsync();
        }
      } catch (markError) {
        console.error('Failed to mark invoice as printed', markError);
      }

      window.setTimeout(() => window.print(), 180);
    }

    void startPrint();
  }, [autoPrint, billing, markPrinted]);

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Memuat invoice...</div>;
  }

  if (error || !billing) {
    return <div className="min-h-screen grid place-items-center text-sm text-red-700">Invoice tidak dapat dimuat.</div>;
  }

  const invoiceNumber = `INV-${String(billing.id).padStart(6, '0')}`;
  const therapistName = billing.appointment?.therapist_name ?? billing.visit?.therapist_name ?? '—';
  const visitDate = billing.visit?.visit_date ?? billing.appointment?.appointment_date ?? billing.created_at;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-[#0b1c30] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-600">Preview {invoiceNumber}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!billing.is_draft_from_booking && !billing.printed_at) {
                try {
                  await markPrinted.mutateAsync();
                } catch (markError) {
                  console.error('Failed to mark invoice as printed', markError);
                }
              }
              window.print();
            }}
            className="rounded-lg bg-[#00685f] px-4 py-2 text-sm font-semibold text-white"
          >
            Cetak Sekarang
          </button>
        </div>
      </div>

      <article className="invoice-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-10 py-9 shadow-xl print:min-h-0 print:max-w-none print:shadow-none">
        <header className="relative border-b-2 border-[#00685f] pb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.png" alt="Griya Fisioterapi Supra Medika" className="mx-auto h-16 w-auto object-contain" />
          <p className="mt-1 text-[11px] text-slate-600">Jl. Elang 20 Pandowo RT 01 RW 06 Joho Sukoharjo 57513</p>
          <p className="text-[11px] text-slate-600">087736339217 | 081225907486</p>
          <div className="absolute right-0 top-0 text-right">
            <h1 className="text-2xl font-black tracking-wide text-[#00685f]">
              {billing.is_draft_from_booking ? 'TAGIHAN' : 'INVOICE'}
            </h1>
            <p className="font-mono text-xs text-slate-600">{invoiceNumber}</p>
            {billing.is_draft_from_booking && (
              <span className="mt-1 inline-block border border-amber-600 px-2 py-0.5 text-[10px] font-bold text-amber-700">DRAFT / SEMENTARA</span>
            )}
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-8 border border-slate-300 p-4 text-xs">
          <div className="space-y-2">
            <Info label="Nama Pasien" value={billing.patient?.full_name ?? `#${billing.patient_id}`} />
            <Info label="No. Rekam Medis" value={billing.patient?.medical_record_number ?? '—'} />
            <Info label="Tanggal Kunjungan" value={formatDate(visitDate)} />
          </div>
          <div className="space-y-2">
            <Info label="Terapis" value={therapistName} />
            <Info label="Status Bayar" value={STATUS_LABEL[billing.payment_status]} />
            <Info label="Metode Terakhir" value={billing.payment_method ?? '—'} />
          </div>
        </section>

        <section className="mt-6 overflow-hidden border border-slate-300">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-10 px-3 py-2 text-center">No</th>
                <th className="px-3 py-2 text-left">Layanan / Biaya</th>
                <th className="w-16 px-3 py-2 text-center">Qty</th>
                <th className="w-32 px-3 py-2 text-right">Harga</th>
                <th className="w-32 px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {billing.items?.map((item, index) => (
                <tr key={`item-${item.id}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-center">{index + 1}</td>
                  <td className="px-3 py-2 font-medium">{item.service?.name ?? `Layanan #${item.service_id}`}</td>
                  <td className="px-3 py-2 text-center">{item.qty}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(item.price)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
              {billing.charges?.map((charge, index) => (
                <tr key={`charge-${charge.id}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-center">{(billing.items?.length ?? 0) + index + 1}</td>
                  <td className="px-3 py-2 font-medium">{charge.label}</td>
                  <td className="px-3 py-2 text-center">{charge.qty}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(charge.amount)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatRupiah(charge.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 ml-auto w-full max-w-sm text-xs">
          <Summary label="Total Layanan" value={formatRupiah(serviceSubtotal)} />
          {chargesSubtotal > 0 && <Summary label="Biaya Tambahan" value={formatRupiah(chargesSubtotal)} />}
          <div className="mt-2 flex justify-between border-t-2 border-[#00685f] pt-3 text-base font-black">
            <span>Total Tagihan</span>
            <span className="text-[#00685f]">{formatRupiah(billing.total_amount)}</span>
          </div>
          <Summary label="Sudah Dibayar" value={formatRupiah(billing.paid_amount)} />
          <Summary label="Sisa Tagihan" value={formatRupiah(billing.remaining_amount)} />
        </section>


        {billing.is_draft_from_booking && (
          <p className="mt-6 border border-amber-300 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800">
            DRAFT — rincian final dapat berubah setelah tindakan selesai dan invoice dikonfirmasi.
          </p>
        )}

        <footer className="mt-10 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
          Dokumen ini dihasilkan otomatis oleh Sistem Griya Fisioterapi Supra Medika.
        </footer>
      </article>

      <style jsx global>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: white !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-sheet { width: 210mm !important; padding: 12mm 14mm !important; }
        }
      `}</style>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_8px_1fr] gap-1">
      <span className="text-slate-500">{label}</span>
      <span>:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}