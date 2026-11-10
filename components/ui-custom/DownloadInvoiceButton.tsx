'use client';

import { useState } from 'react';
import type { Billing } from '@/types/billing';
import { useToast } from '@/components/ui-custom/Toast';
import { useMarkBillingPrinted } from '@/hooks/useBilling';

interface DownloadInvoiceButtonProps {
  billing: Billing;
}

export function DownloadInvoiceButton({ billing }: DownloadInvoiceButtonProps) {
  const [generating, setGenerating] = useState(false);
  const toast = useToast();
  const markPrinted = useMarkBillingPrinted(billing.id);

  function handlePrint() {
    const printWindow = window.open(`/invoice-print/${billing.id}?auto=1`, '_blank');

    if (printWindow) {
      printWindow.opener = null;
    } else {
      toast.error('Jendela cetak diblokir', 'Izinkan pop-up untuk localhost:3000 lalu coba cetak kembali.');
    }
  }

  async function handleDownload() {
    setGenerating(true);

    try {
      // Import dinamis menjaga renderer PDF tetap murni di browser dan tidak ikut
      // dievaluasi pada jalur server Next.js.
      const [{ pdf }, { InvoicePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./InvoicePdf'),
      ]);

      let printableBilling = billing;
      if (!billing.is_draft_from_booking && !billing.printed_at) {
        try {
          printableBilling = await markPrinted.mutateAsync();
        } catch (markError) {
          console.error('Failed to mark invoice as printed before PDF generation', markError);
        }
      }

      const logoSrc = `${window.location.origin}/assets/logo.png`;
      const blob = await pdf(<InvoicePdf billing={printableBilling} logoSrc={logoSrc} />).toBlob();
      const url = URL.createObjectURL(blob);
      const patientSlug = (printableBilling.patient?.full_name ?? 'pasien')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      const link = document.createElement('a');

      link.href = url;
      link.download = `${billing.is_draft_from_booking ? 'DRAFT-' : ''}INV-${patientSlug}-${String(billing.id).padStart(6, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Jangan revoke synchronously; sebagian browser masih membaca blob sesaat
      // setelah click() dipanggil.
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);

    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      toast.error(
        'Invoice PDF gagal dibuat',
        'Gunakan tombol Cetak sebagai jalur utama. Jika masih gagal, periksa Console browser untuk detail error.',
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={handlePrint}
        className="flex h-10 items-center gap-2 rounded-xl bg-[#00685f] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#008378]"
      >
        <span className="material-symbols-outlined text-[18px]">print</span>
        Cetak
      </button>

      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="flex h-10 items-center gap-2 rounded-xl border border-[#bcc9c6] px-4 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff] disabled:opacity-60"
      >
        <span className={`material-symbols-outlined text-[18px] ${generating ? 'animate-spin' : ''}`}>
          {generating ? 'progress_activity' : 'download'}
        </span>
        {generating ? 'Membuat PDF...' : 'Unduh PDF'}
      </button>
    </div>
  );
}
