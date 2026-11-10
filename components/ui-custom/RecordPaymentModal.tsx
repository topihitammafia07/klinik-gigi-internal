'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';

const PAYMENT_METHODS = ['Cash', 'Transfer Bank', 'QRIS', 'Debit', 'Asuransi'] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface RecordPaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  onClose: () => void;
  onConfirm: (payload: { amount: number; payment_method?: string; notes?: string }) => void;
  isLoading?: boolean;
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function RecordPaymentModal({
  isOpen,
  totalAmount,
  paidAmount,
  remainingAmount,
  onClose,
  onConfirm,
  isLoading,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setMethod('');
    setNotes('');
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isLoading, onClose]);

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= remainingAmount;
  const projectedRemaining = useMemo(
    () => Math.max(0, remainingAmount - (Number.isFinite(numericAmount) ? numericAmount : 0)),
    [numericAmount, remainingAmount],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup modal"
        onClick={() => { if (!isLoading) onClose(); }}
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-[#bcc9c6]/60 px-5 py-4 sm:px-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00685f]/10 text-[#00685f]">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div>
            <h2 className="font-bold text-[#0b1c30]">Catat Pembayaran / DP</h2>
            <p className="mt-0.5 text-xs text-[#3d4947]">Setiap pembayaran disimpan sebagai transaksi dan status invoice diperbarui otomatis.</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#f8f9ff] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77]">Total</p>
              <p className="mt-1 text-xs font-bold text-[#0b1c30] sm:text-sm">{rupiah(totalAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#00685f]/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77]">Sudah Bayar</p>
              <p className="mt-1 text-xs font-bold text-[#00685f] sm:text-sm">{rupiah(paidAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#fff4e5] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77]">Sisa</p>
              <p className="mt-1 text-xs font-bold text-[#8a5a00] sm:text-sm">{rupiah(remainingAmount)}</p>
            </div>
          </div>

          <div>
            <label htmlFor="payment-amount" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
              Nominal diterima
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
              <input
                id="payment-amount"
                type="text"
                inputMode="numeric"
                value={formatNumberWithDots(amount)}
                onChange={(event) => {
                  const num = parseNumberFromDots(event.target.value);
                  setAmount(num ? String(num) : '');
                }}
                placeholder="Masukkan nominal DP / pembayaran"
                className="h-12 w-full rounded-xl border border-[#bcc9c6] pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10"
              />
            </div>
            {amount && !validAmount && (
              <p className="mt-1.5 text-xs text-[#ba1a1a]">Nominal harus lebih dari Rp0 dan tidak boleh melebihi sisa tagihan.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Metode pembayaran</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMethod(item)}
                  className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    method === item
                      ? 'border-[#00685f] bg-[#00685f]/10 text-[#00685f]'
                      : 'border-[#bcc9c6] text-[#3d4947] hover:border-[#00685f]/40'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="payment-notes" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Catatan</label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Opsional, mis. DP pertama / pelunasan"
              className="w-full resize-y rounded-xl border border-[#bcc9c6] px-3 py-2.5 text-sm outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10"
            />
          </div>

          {validAmount && (
            <div className={`rounded-xl border px-4 py-3 ${projectedRemaining === 0 ? 'border-[#00685f]/20 bg-[#00685f]/5' : 'border-[#0058be]/20 bg-[#eff6ff]'}`}>
              <p className="text-xs font-semibold text-[#0b1c30]">
                Setelah transaksi ini: {projectedRemaining === 0 ? 'invoice menjadi Lunas' : `sisa ${rupiah(projectedRemaining)} dan status menjadi Sebagian`}.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#bcc9c6]/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-11 rounded-xl border border-[#bcc9c6] px-5 text-sm font-semibold text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!validAmount || !method || isLoading}
            onClick={() => onConfirm({
              amount: numericAmount,
              payment_method: method || undefined,
              notes: notes.trim() || undefined,
            })}
            className="h-11 rounded-xl gradient-btn px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? 'Menyimpan...' : 'Catat Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
}
