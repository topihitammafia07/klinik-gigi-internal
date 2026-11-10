'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { PaymentStatus } from '@/types/billing';

interface PaymentStatusModalProps {
  isOpen: boolean;
  currentStatus: PaymentStatus;
  onClose: () => void;
  onConfirm: (status: PaymentStatus, method?: string) => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS = ['Cash', 'Transfer Bank', 'QRIS', 'Debit', 'Asuransi'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid:    'Lunas',
  unpaid:  'Belum Lunas',
  partial: 'Sebagian',
};

const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid:    'bg-[#ecfdf5] text-[#065f46] border-[#065f46]/20',
  unpaid:  'bg-[#ffdad6]/40 text-[#ba1a1a] border-[#ba1a1a]/20',
  partial: 'bg-[#eff6ff] text-[#1e40af] border-[#1e40af]/20',
};

// ─── Data pembayaran (placeholder — ganti sesuai klinik) ───────────────────

const QRIS_INFO = {
  imageSrc: '/assets/qr.jpg',
  merchantName: 'Klinik Fisioterapi',
  nmid: 'ID1021145770397',
  nominalInfo: 'Masukkan nominal sesuai tagihan',
};

const BANK_ACCOUNTS = [
  { bank: 'BRI', noRek: '691101012866538', atas: 'Agus Supramono' },
  { bank: 'BSI', noRek: '7209530052', atas: 'Agus Supramono' },
];

// ──────────────────────────────────────────────────────────────────────────

export function PaymentStatusModal({
  isOpen,
  currentStatus,
  onClose,
  onConfirm,
  isLoading,
}: PaymentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>(currentStatus);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [copiedRek, setCopiedRek] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus === 'partial' ? 'unpaid' : currentStatus);
      setSelectedMethod('');
      setCopiedRek(null);
    }
  }, [isOpen, currentStatus]);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoading) onClose();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose, isLoading]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRek(text);
      setTimeout(() => setCopiedRek(null), 2000);
    });
  };

  if (!isOpen) return null;

  const needsMethod = selectedStatus === 'paid' || selectedStatus === 'partial';
  const showQris = needsMethod && selectedMethod === 'QRIS';
  const showTransfer = needsMethod && selectedMethod === 'Transfer Bank';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
        onClick={() => { if (!isLoading) onClose(); }}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#bcc9c6]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00685f]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00685f] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">Update Status Pembayaran</h2>
              <p className="text-xs text-[#3d4947]">
                Status saat ini:{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${STATUS_COLORS[currentStatus]}`}>
                  {STATUS_LABELS[currentStatus]}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Status selector */}
          <div>
            <p className="text-sm font-medium text-[#0b1c30] mb-3">Pilih Status Baru</p>
            <div className="grid grid-cols-2 gap-2">
              {(['paid', 'unpaid'] as PaymentStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSelectedStatus(s); setSelectedMethod(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    selectedStatus === s
                      ? `${STATUS_COLORS[s]} border-current scale-[1.02] shadow-sm`
                      : 'border-[#bcc9c6] text-[#3d4947] hover:border-[#00685f]/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: `'FILL' ${selectedStatus === s ? 1 : 0}` }}>
                    {s === 'paid' ? 'check_circle' : s === 'partial' ? 'timelapse' : 'pending'}
                  </span>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#3d4947]">Pembayaran sebagian tidak diubah sebagai status manual. Gunakan fitur <strong>Catat DP / Pembayaran</strong> agar nominal dan sisa tagihan tercatat.</p>
          </div>

          {/* Payment method (legacy pelunasan penuh) */}
          {needsMethod && (
            <div>
              <label className="block text-sm font-medium text-[#0b1c30] mb-2">
                Metode Pembayaran <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMethod(m)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      selectedMethod === m
                        ? 'border-[#00685f] bg-[#00685f]/10 text-[#00685f]'
                        : 'border-[#bcc9c6] text-[#3d4947] hover:border-[#00685f]/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {m === 'Cash' ? 'payments' : m === 'Transfer Bank' ? 'account_balance' : m === 'QRIS' ? 'qr_code_2' : m === 'Debit' ? 'credit_card' : 'health_and_safety'}
                    </span>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── QRIS Info Panel ─────────────────────────────────────── */}
          {showQris && (
            <div className="rounded-2xl border border-[#00685f]/20 bg-[#f0fdf9] p-4 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-[#00685f] uppercase tracking-wider">Scan QRIS untuk Bayar</p>

              {/* QR Image */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-[#bcc9c6]/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src={QRIS_INFO.imageSrc}
                  alt="QRIS Klinik Fisioterapi"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
              </div>

              {/* Merchant info */}
              <div className="text-center">
                <p className="text-sm font-bold text-[#0b1c30]">{QRIS_INFO.merchantName}</p>
                <p className="text-xs text-[#3d4947] mt-0.5">NMID: {QRIS_INFO.nmid}</p>
              </div>

              <div className="w-full bg-[#dcfce7] rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#14532d]">info</span>
                <p className="text-xs text-[#14532d] font-medium">{QRIS_INFO.nominalInfo}</p>
              </div>
            </div>
          )}

          {/* ─── Transfer Bank Info Panel ─────────────────────────────── */}
          {showTransfer && (
            <div className="rounded-2xl border border-[#0058be]/20 bg-[#eff6ff] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#0058be] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                Nomor Rekening Tujuan
              </p>
              {BANK_ACCOUNTS.map((acc) => (
                <div
                  key={acc.bank}
                  className="bg-white rounded-xl border border-[#bcc9c6]/50 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-[#0b1c30] uppercase">{acc.bank}</p>
                    <p className="text-base font-mono font-bold text-[#0b1c30] tracking-widest mt-0.5">{acc.noRek}</p>
                    <p className="text-xs text-[#3d4947]">a/n {acc.atas}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(acc.noRek)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                      copiedRek === acc.noRek
                        ? 'bg-[#dcfce7] text-[#14532d]'
                        : 'bg-[#eff4ff] text-[#0058be] hover:bg-[#dce9ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedRek === acc.noRek ? 'check' : 'content_copy'}
                    </span>
                    {copiedRek === acc.noRek ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              ))}
              <p className="text-xs text-[#3d4947] text-center">
                Konfirmasi pembayaran setelah transfer berhasil
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#bcc9c6]/60 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-[#bcc9c6] text-sm font-semibold text-[#3d4947] hover:bg-[#eff4ff] transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading || (needsMethod && !selectedMethod)}
            onClick={() => onConfirm(selectedStatus, needsMethod ? selectedMethod : undefined)}
            className="px-5 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memperbarui...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                Konfirmasi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}