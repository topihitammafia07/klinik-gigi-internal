'use client';

import { useTherapists } from '@/hooks/useUsers';

interface TherapistFilterSelectProps {
  value: number | undefined;
  onChange: (therapistId: number | undefined) => void;
}

/**
 * Dropdown untuk filter laporan berdasarkan terapis.
 * Hanya relevan untuk role owner/pj_klinik — untuk role terapis, page pemanggil
 * cukup tidak me-render komponen ini (backend tetap men-scope otomatis).
 */
export function TherapistFilterSelect({ value, onChange }: TherapistFilterSelectProps) {
  const { data: therapists, isLoading } = useTherapists();

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      disabled={isLoading}
      className="px-3 py-2 bg-white border border-[#bcc9c6] text-sm text-[#3d4947] rounded-lg hover:border-[#00685f] transition-colors shadow-sm disabled:opacity-50"
    >
      <option value="">Semua Terapis</option>
      {therapists?.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}