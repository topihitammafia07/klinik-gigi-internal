'use client';

import { useState, useEffect } from 'react';

interface PatientSinceModalProps {
  isOpen: boolean;
  currentDate: string; // YYYY-MM-DD
  onClose: () => void;
  onConfirm: (date: string) => void;
  isLoading?: boolean;
}

export function PatientSinceModal({
  isOpen,
  currentDate,
  onClose,
  onConfirm,
  isLoading,
}: PatientSinceModalProps) {
  const [date, setDate] = useState(currentDate);

  useEffect(() => {
    if (isOpen) setDate(currentDate);
  }, [isOpen, currentDate]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!date) return;
    onConfirm(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-[#0b1c30]">Ubah Tanggal Terdaftar</h3>
        <p className="text-xs text-[#3d4947] mt-1">
          Tanggal ini menentukan status pasien baru/lama (≥ 6 bulan = pasien lama).
          Perubahan ini tidak mengubah tanggal pembuatan data asli.
        </p>

        <div className="mt-4">
          <label className="block text-xs font-medium text-[#3d4947] mb-1">
            Tanggal Terdaftar
          </label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[#bcc9c6]/50 text-sm text-[#0b1c30] focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#3d4947] hover:bg-[#eff4ff] transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !date}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00685f] text-white hover:bg-[#008378] transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}