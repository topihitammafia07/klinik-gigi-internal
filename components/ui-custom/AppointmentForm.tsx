'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useTherapists } from '@/hooks/useUsers';
import { useDebounce } from '@/hooks/useDebounce';
import apiClient from '@/lib/axios';
import type { Patient } from '@/types/patient';
import type { AppointmentFormData } from '@/types/appointment';

// ─── Schema ────────────────────────────────────────────────────

const appointmentSchema = z
  .object({
    patient_id: z.number({ error: 'Pilih pasien' }).min(1, 'Pilih pasien'),
    therapist_id: z.number({ error: 'Pilih terapis' }).min(1, 'Pilih terapis'),
    appointment_date: z.string().min(1, 'Tanggal wajib diisi'),
    time_start: z.string().min(1, 'Waktu mulai wajib diisi'),
    time_end: z.string().min(1, 'Waktu selesai wajib diisi'),
  })
  .refine((v) => v.time_end > v.time_start, {
    message: 'Waktu selesai harus setelah waktu mulai',
    path: ['time_end'],
  });

type AppointmentSchema = z.infer<typeof appointmentSchema>;

// ─── Props ─────────────────────────────────────────────────────

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => void;
  isLoading?: boolean;
  apiErrors?: Record<string, string>;
  defaultPatientId?: number;
}

// ─── Component ─────────────────────────────────────────────────

export function AppointmentForm({ onSubmit, isLoading, apiErrors, defaultPatientId }: AppointmentFormProps) {
  const { data: therapists = [] } = useTherapists();

  // Patient combobox state
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(patientQuery, 300);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<AppointmentSchema>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: 0,
      therapist_id: 0,
      appointment_date: '',
      time_start: '',
      time_end: '',
    },
  });

  // Sync API errors into form fields
  useEffect(() => {
    if (!apiErrors) return;
    // Map common conflict error field
    if (apiErrors.time_start) setError('time_start', { message: apiErrors.time_start });
    if (apiErrors.time_end) setError('time_end', { message: apiErrors.time_end });
    if (apiErrors.schedule) setError('time_start', { message: apiErrors.schedule });
    if (apiErrors.therapist_id) setError('therapist_id', { message: apiErrors.therapist_id });
  }, [apiErrors, setError]);

  // Pre-fill patient from defaultPatientId (e.g. when coming from patient detail)
  useEffect(() => {
    if (defaultPatientId && defaultPatientId > 0) {
      setValue('patient_id', defaultPatientId, { shouldValidate: true });
    }
  }, [defaultPatientId, setValue]);

  // Debounced patient search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    apiClient
      .get('/patients', { params: { search: debouncedQuery, per_page: 8 } })
      .then((res) => {
        if (!cancelled) setPatientResults(res.data?.data?.data ?? []);
      })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close combobox on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPatientQuery(p.full_name);
    setValue('patient_id', p.id, { shouldValidate: true });
    setComboOpen(false);
  }

  const inputCls = (err?: boolean) =>
    cn(
      'w-full h-11 px-4 rounded-xl border text-sm text-[#0b1c30] bg-white transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]',
      err ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]'
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Patient combobox ── */}
      <div ref={comboRef} className="relative">
        <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
          Pasien <span className="text-[#ba1a1a]">*</span>
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">
            person_search
          </span>
          <input
            type="text"
            value={patientQuery}
            onChange={(e) => {
              setPatientQuery(e.target.value);
              setComboOpen(true);
              if (!e.target.value) {
                setSelectedPatient(null);
                setValue('patient_id', 0);
              }
            }}
            onFocus={() => { if (patientQuery.length >= 2) setComboOpen(true); }}
            placeholder="Ketik nama atau nomor rekam medis..."
            className={cn(inputCls(!!errors.patient_id), 'pl-10')}
            autoComplete="off"
          />
          {searchLoading && (
            <svg className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3d4947]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        {errors.patient_id && (
          <p className="mt-1 text-xs text-[#ba1a1a]">{errors.patient_id.message}</p>
        )}

        {/* Dropdown results */}
        {comboOpen && patientResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[#bcc9c6] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {patientResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPatient(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#eff4ff] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[#00685f]/10 text-[#00685f] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {p.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0b1c30]">{p.full_name}</p>
                  <p className="text-xs text-[#3d4947]">
                    {p.medical_record_number}
                    {p.phone ? <span className="ml-2 text-[#6d7a77]">· {p.phone}</span> : null}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        {comboOpen && patientQuery.length >= 2 && patientResults.length === 0 && !searchLoading && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[#bcc9c6] rounded-xl shadow-lg px-4 py-3 text-sm text-[#3d4947]">
            Pasien tidak ditemukan.
          </div>
        )}

        {/* Selected patient chip */}
        {selectedPatient && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-[#00685f]/10 rounded-lg w-fit max-w-full flex-wrap">
            <span className="text-xs font-semibold text-[#00685f]">{selectedPatient.full_name}</span>
            <span className="text-xs text-[#3d4947]">• {selectedPatient.medical_record_number}</span>
            {selectedPatient.phone && (
              <span className="text-xs text-[#6d7a77]">• {selectedPatient.phone}</span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setPatientQuery('');
                setValue('patient_id', 0);
              }}
              className="text-[#3d4947] hover:text-[#ba1a1a] ml-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Therapist dropdown ── */}
      <div>
        <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
          Terapis <span className="text-[#ba1a1a]">*</span>
        </label>
        <div className="relative">
          <select
            {...register('therapist_id', { valueAsNumber: true })}
            className={cn(inputCls(!!errors.therapist_id), 'appearance-none cursor-pointer pr-10')}
          >
            <option value={0}>-- Pilih Terapis --</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px] pointer-events-none">
            expand_more
          </span>
        </div>
        {errors.therapist_id && (
          <p className="mt-1 text-xs text-[#ba1a1a]">{errors.therapist_id.message}</p>
        )}
      </div>

      {/* ── Date ── */}
      <div>
        <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
          Tanggal <span className="text-[#ba1a1a]">*</span>
        </label>
        <input type="date" {...register('appointment_date')} className={inputCls(!!errors.appointment_date)} />
        {errors.appointment_date && (
          <p className="mt-1 text-xs text-[#ba1a1a]">{errors.appointment_date.message}</p>
        )}
      </div>

      {/* ── Time range ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Jam Mulai <span className="text-[#ba1a1a]">*</span>
          </label>
          <input type="time" {...register('time_start')} className={inputCls(!!errors.time_start)} />
          {errors.time_start && (
            <p className="mt-1 text-xs text-[#ba1a1a]">{errors.time_start.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Jam Selesai <span className="text-[#ba1a1a]">*</span>
          </label>
          <input type="time" {...register('time_end')} className={inputCls(!!errors.time_end)} />
          {errors.time_end && (
            <p className="mt-1 text-xs text-[#ba1a1a]">{errors.time_end.message}</p>
          )}
        </div>
      </div>

      {/* ── Conflict error banner ── */}
      {apiErrors?.message && (
        <div className="flex items-start gap-2 px-4 py-3 bg-[#ffdad6]/40 border border-[#ba1a1a]/30 rounded-xl">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5">warning</span>
          <p className="text-sm text-[#ba1a1a]">{apiErrors.message}</p>
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 gradient-btn text-white rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Menyimpan...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">event_available</span>
            Simpan Jadwal
          </>
        )}
      </button>
    </form>
  );
}