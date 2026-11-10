'use client';

import { useState } from 'react';
import { useCreateVisit } from '@/hooks/useVisits';
import type { Appointment } from '@/types/appointment';

interface CreateVisitModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateVisitModal({ appointment, onClose, onSuccess }: CreateVisitModalProps) {
  const { mutateAsync: createVisit, isPending } = useCreateVisit();

  // Pre-fill complaint dari notes booking landing page (symptoms yang diisi pasien saat booking)
  const [complaint, setComplaint] = useState(appointment.notes ?? '');
  const [diagnosis, setDiagnosis] = useState('');
  const [therapyType, setTherapyType] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!complaint.trim()) {
      setError('Keluhan wajib diisi.');
      return;
    }
    setError('');
    try {
      await createVisit({
        appointment_id: appointment.id,
        complaint: complaint.trim(),
        diagnosis: diagnosis.trim() || undefined,
        therapy_type: therapyType.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Gagal membuat kunjungan. Coba lagi.');
    }
  }

  const labelCls = 'block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5';
  const inputCls =
    'w-full h-10 px-3 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors';
  const textareaCls =
    'w-full px-3 py-2.5 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors resize-none';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#bcc9c6]/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bcc9c6]/40 flex items-center justify-between bg-[#f8f9ff]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">add_circle</span>
            <h2 className="text-base font-semibold text-[#0b1c30]">Buat Kunjungan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#3d4947] hover:bg-[#bcc9c6]/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Appointment info summary */}
        <div className="px-6 pt-5 pb-3">
          <div className="bg-[#f0faf8] border border-[#00685f]/20 rounded-xl px-4 py-3 text-sm space-y-1">
            <p className="font-semibold text-[#0b1c30]">
              {appointment.patient?.full_name ?? `Pasien #${appointment.patient_id}`}
            </p>
            <p className="text-[#3d4947] text-xs">
              {appointment.patient?.medical_record_number} &nbsp;·&nbsp;
              Terapis: {appointment.therapist?.name ?? `#${appointment.therapist_id}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-4">
          {/* Complaint — required */}
          <div>
            <label className={labelCls}>
              Keluhan <span className="text-[#ba1a1a]">*</span>
            </label>
            {appointment.notes && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-[#00685f] bg-[#f0faf8] border border-[#00685f]/20 rounded-lg px-3 py-1.5">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Diisi otomatis dari keluhan saat booking — silakan sesuaikan bila perlu.
              </div>
            )}
            <textarea
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Tulis keluhan pasien..."
              className={`${textareaCls} ${error && !complaint.trim() ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/20 focus:border-[#ba1a1a]' : ''}`}
            />
          </div>

          {/* Therapy type */}
          <div>
            <label className={labelCls}>Jenis Terapi</label>
            <input
              type="text"
              value={therapyType}
              onChange={(e) => setTherapyType(e.target.value)}
              placeholder="Contoh: Fisioterapi manual"
              className={inputCls}
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className={labelCls}>Diagnosis Awal</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Opsional"
              className={inputCls}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#ffdad6]/50 border border-[#ba1a1a]/20 rounded-xl text-sm text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl border border-[#bcc9c6] text-sm font-semibold text-[#3d4947] hover:bg-[#f0f0f0] transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl gradient-btn text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  Buat Kunjungan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}