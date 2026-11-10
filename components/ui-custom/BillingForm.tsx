'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn, calculateAge } from '@/lib/utils';
import { useTherapyServices } from '@/hooks/useBilling';
import { useVisits } from '@/hooks/useVisits';
import { usePatient } from '@/hooks/usePatients';
import { useActivePackages } from '@/hooks/useTreatmentPackages';
import { useDebounce } from '@/hooks/useDebounce';
import apiClient from '@/lib/axios';
import type { Patient } from '@/types/patient';
import type { BillingFormData } from '@/types/billing';
import type { TreatmentPackage } from '@/types/treatment-package';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';

// ─── Schema ────────────────────────────────────────────────────

const billingItemSchema = z.object({
  service_id: z.number({ error: 'Pilih layanan' }).min(1, 'Pilih layanan'),
  qty:        z.number({ error: 'Qty harus angka' }).min(1, 'Qty minimal 1'),
  price:      z.number({ error: 'Harga harus angka' }).min(0, 'Harga tidak valid'),
});

const billingSchema = z.object({
  patient_id: z.number({ error: 'Pilih pasien' }).min(1, 'Pilih pasien'),
  visit_id:   z.number({ error: 'Pilih kunjungan' }).min(1, 'Pilih kunjungan'),
  items:      z.array(billingItemSchema).min(1, 'Tambahkan minimal 1 item'),
});

type BillingSchema = z.infer<typeof billingSchema>;

// ─── Helper ────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

// ─── Props ─────────────────────────────────────────────────────

interface BillingFormProps {
  onSubmit: (data: BillingFormData) => void;
  isLoading?: boolean;
  initialPatientId?: number;
  initialVisitId?: number;
}

// ─── Component ─────────────────────────────────────────────────

export function BillingForm({ onSubmit, isLoading, initialPatientId, initialVisitId }: BillingFormProps) {
  const { data: services = [] } = useTherapyServices();

  // Patient combobox state
  const [patientQuery, setPatientQuery]         = useState('');
  const [patientResults, setPatientResults]     = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient]   = useState<Patient | null>(null);
  const [comboOpen, setComboOpen]               = useState(false);
  const [searchLoading, setSearchLoading]       = useState(false);
  const comboRef                                = useRef<HTMLDivElement>(null);
  const debouncedQuery                          = useDebounce(patientQuery, 300);

  // Paket terapi prabayar state
  const [usePackage, setUsePackage]             = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BillingSchema>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      patient_id: initialPatientId || 0,
      visit_id:   initialVisitId || 0,
      items: [{ service_id: 0, qty: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Watchers
  const watchedItems   = useWatch({ control, name: 'items' }) ?? [];
  const watchedVisitId = useWatch({ control, name: 'visit_id' }) ?? 0;

  // Initial patient loading if initialPatientId is passed
  const { data: loadedInitialPatient } = usePatient(initialPatientId ?? 0);
  useEffect(() => {
    if (loadedInitialPatient && !selectedPatient) {
      selectPatient(loadedInitialPatient);
    }
  }, [loadedInitialPatient]);

  // Initial visit selection
  useEffect(() => {
    if (initialVisitId) {
      setValue('visit_id', initialVisitId, { shouldValidate: true });
    }
  }, [initialVisitId, setValue]);

  // Active treatment packages for the selected patient
  const patientId = selectedPatient?.id ?? 0;
  const { data: activePackages = [], isLoading: packagesLoading } = useActivePackages(patientId);

  // Visits query for the selected patient (done only)
  const { data: visitsData, isLoading: visitsLoading } = useVisits(
    patientId ? { patient_id: patientId, status: 'done' } : {}
  );
  const visits = visitsData?.data ?? [];
  const unbilledVisits = visits.filter((v) => !v.has_billing);

  // Auto-select visit if only 1 unbilled visit exists
  useEffect(() => {
    if (unbilledVisits.length === 1 && (!watchedVisitId || watchedVisitId === 0)) {
      setValue('visit_id', unbilledVisits[0].id, { shouldValidate: true });
    }
  }, [unbilledVisits, watchedVisitId, setValue]);

  // Live total preview
  const previewTotal = watchedItems.reduce((sum, item) => {
    const qty   = Number(item?.qty)   || 0;
    const price = Number(item?.price) || 0;
    return sum + qty * price;
  }, 0);

  // Selected package details (if using package)
  const currentPackage = activePackages.find((p) => p.id === selectedPackageId) ?? null;

  // Patient search query
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
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close combobox on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPatientQuery(p.full_name);
    setValue('patient_id', p.id, { shouldValidate: true });
    setValue('visit_id', initialVisitId || 0);
    setUsePackage(false);
    setSelectedPackageId(null);
    setComboOpen(false);
  }

  function handleServiceChange(index: number, serviceId: number) {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      setValue(`items.${index}.price`, Number(svc.price) || 0, { shouldValidate: true });
    }
  }

  function handleSelectPackage(pkg: TreatmentPackage) {
    setUsePackage(true);
    setSelectedPackageId(pkg.id);

    // Auto-fill items with 1 session of package's service at Rp 0
    setValue(
      'items',
      [
        {
          service_id: pkg.service_id,
          qty: 1,
          price: 0,
        },
      ],
      { shouldValidate: true }
    );
  }

  function handleCancelPackage() {
    setUsePackage(false);
    setSelectedPackageId(null);

    // Restore regular items
    const firstSvc = services[0];
    setValue(
      'items',
      [
        {
          service_id: firstSvc ? firstSvc.id : 0,
          qty: 1,
          price: firstSvc ? Number(firstSvc.price) || 0 : 0,
        },
      ],
      { shouldValidate: true }
    );
  }

  function handleFormSubmit(data: BillingSchema) {
    const payload: BillingFormData = {
      patient_id: data.patient_id,
      visit_id: data.visit_id,
      items: data.items.map((item) => ({
        service_id: Number(item.service_id),
        qty: Number(item.qty),
        price: Number(item.price),
      })),
    };

    if (usePackage && selectedPackageId) {
      payload.package_id = selectedPackageId;
    }

    onSubmit(payload);
  }

  const inputCls = (err?: boolean) =>
    cn(
      'w-full h-10 px-3 rounded-xl border text-sm text-[#0b1c30] bg-white transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]',
      err ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]'
    );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

      {/* ── 1. Patient Combobox ── */}
      <div ref={comboRef} className="relative">
        <label className="block text-sm font-semibold text-[#0b1c30] mb-1.5">
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
                setUsePackage(false);
                setSelectedPackageId(null);
              }
            }}
            onFocus={() => {
              if (patientQuery.length >= 2) setComboOpen(true);
            }}
            placeholder="Ketik nama atau nomor rekam medis pasien..."
            className={cn(inputCls(!!errors.patient_id), 'h-11 pl-10')}
            autoComplete="off"
          />
          {searchLoading && (
            <svg className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00685f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        {errors.patient_id && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.patient_id.message}</p>}

        {/* Autocomplete Dropdown */}
        {comboOpen && patientResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[#bcc9c6] rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {patientResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPatient(p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f0fdf4] transition-colors text-left border-b border-[#bcc9c6]/20 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00685f]/10 text-[#00685f] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30]">{p.full_name}</p>
                    <p className="text-xs text-[#3d4947] font-mono">{p.medical_record_number}</p>
                  </div>
                </div>
                {p.birth_date && (
                  <span className="text-xs text-[#3d4947] bg-[#f8f9ff] px-2 py-0.5 rounded-md">
                    {calculateAge(p.birth_date)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected Patient Card */}
        {selectedPatient && (
          <div className="mt-2.5 flex items-center justify-between px-4 py-2.5 bg-[#f0fdf4] border border-[#00685f]/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#00685f] text-white flex items-center justify-center text-xs font-bold">
                {selectedPatient.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-[#00685f]">{selectedPatient.full_name}</p>
                <p className="text-[11px] text-[#3d4947]">
                  No. RM: <span className="font-mono font-semibold">{selectedPatient.medical_record_number}</span>
                  {selectedPatient.birth_date && ` • Usia ${calculateAge(selectedPatient.birth_date)}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setPatientQuery('');
                setValue('patient_id', 0);
                setValue('visit_id', 0);
                setUsePackage(false);
                setSelectedPackageId(null);
              }}
              className="text-xs text-[#ba1a1a] hover:underline font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Ganti Pasien
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Active Treatment Packages Section ── */}
      {selectedPatient && (
        <div>
          {packagesLoading ? (
            <div className="p-4 border border-[#bcc9c6]/40 rounded-xl bg-[#f8f9ff] text-xs text-[#3d4947] flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#00685f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memeriksa paket terapi aktif pasien...
            </div>
          ) : activePackages.length > 0 ? (
            <div className="rounded-2xl border border-[#00685f]/30 bg-[#f0fdf4] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00685f] text-[20px]">confirmation_number</span>
                  <h3 className="text-sm font-bold text-[#0b1c30]">Paket Terapi Aktif Pasien</h3>
                </div>
                <span className="text-[11px] font-semibold text-[#00685f] bg-[#00685f]/10 px-2.5 py-0.5 rounded-full">
                  {activePackages.length} Paket Tersedia
                </span>
              </div>
              <p className="text-xs text-[#3d4947]">
                Pasien memiliki paket terapi prabayar. Klik &quot;Gunakan Paket&quot; untuk memotong 1 sesi tanpa biaya tagihan tambahan.
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activePackages.map((pkg) => {
                  const isSelected = usePackage && selectedPackageId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className={cn(
                        'p-3 rounded-xl border transition-all text-left flex flex-col justify-between gap-2.5',
                        isSelected
                          ? 'border-[#00685f] bg-white shadow-sm ring-2 ring-[#00685f]/20'
                          : 'border-[#bcc9c6]/60 bg-white hover:border-[#00685f]/40'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[#0b1c30] capitalize">{pkg.name}</p>
                          <span className="text-[10px] font-semibold text-[#065f46] bg-[#ecfdf5] px-2 py-0.5 rounded">
                            Sisa {pkg.remaining_sessions} sesi
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3d4947] mt-0.5">
                          Layanan: <span className="font-semibold text-[#00685f]">{pkg.service?.name ?? 'Terapi'}</span>
                        </p>
                        <p className="text-[10px] text-[#6d7a77] mt-0.5">
                          Terpakai {pkg.used_sessions} dari {pkg.total_sessions} total sesi
                        </p>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00685f]">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Paket Dipilih
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelPackage}
                            className="text-[11px] text-[#ba1a1a] hover:underline font-semibold"
                          >
                            Batalkan
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectPackage(pkg)}
                          className="w-full py-1.5 px-3 rounded-lg border border-[#00685f] text-[#00685f] text-xs font-semibold hover:bg-[#00685f] hover:text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">redeem</span>
                          Gunakan Paket Ini
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {usePackage && currentPackage && (
                <div className="pt-2 border-t border-[#00685f]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <span className="text-[#065f46] font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    1 sesi akan dipotong dari paket <strong>&quot;{currentPackage.name}&quot;</strong>. Total invoice Rp0.
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelPackage}
                    className="text-[#ba1a1a] hover:underline font-semibold text-left sm:text-right"
                  >
                    Kembali ke Bayar Reguler
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── 3. Visit Selector ── */}
      {selectedPatient && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-[#0b1c30]">
              Kunjungan Selesai <span className="text-[#ba1a1a]">*</span>
            </label>
            <Link
              href={`/visits?patient_id=${selectedPatient.id}`}
              target="_blank"
              className="text-xs text-[#00685f] hover:underline font-medium flex items-center gap-1"
            >
              <span>Riwayat Kunjungan</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </Link>
          </div>

          {visitsLoading ? (
            <div className="h-11 px-3 border border-[#bcc9c6] rounded-xl flex items-center gap-2 text-xs text-[#3d4947]">
              <svg className="animate-spin h-4 w-4 text-[#00685f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memuat data kunjungan pasien...
            </div>
          ) : (
            <div className="relative">
              <select
                {...register('visit_id', { valueAsNumber: true })}
                className={cn(inputCls(!!errors.visit_id), 'h-11 appearance-none cursor-pointer pr-10')}
              >
                <option value={0}>-- Pilih Kunjungan yang Selesai --</option>
                {unbilledVisits.length > 0 && (
                  <optgroup label="Kunjungan Siap Ditagih">
                    {unbilledVisits.map((v) => (
                      <option key={v.id} value={v.id}>
                        Kunjungan #{v.id} — {format(new Date(v.visit_date + 'T00:00:00'), 'd MMM yyyy', { locale: idLocale })} — {v.therapy_type} ({v.therapist?.name ?? 'Terapis'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {visits.filter((v) => v.has_billing).length > 0 && (
                  <optgroup label="Sudah Ada Invoice">
                    {visits
                      .filter((v) => v.has_billing)
                      .map((v) => (
                        <option key={v.id} value={v.id} disabled>
                          Kunjungan #{v.id} — {v.visit_date} — {v.therapy_type} (Sudah Diterbitkan Invoice)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>
          )}

          {errors.visit_id && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.visit_id.message}</p>}

          {!visitsLoading && unbilledVisits.length === 0 && (
            <div className="mt-2 p-3.5 rounded-xl border border-[#ba1a1a]/20 bg-[#fff5f5] text-xs text-[#ba1a1a] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] flex-shrink-0 mt-0.5">
                info
              </span>
              <div>
                <p className="font-semibold text-[#ba1a1a]">Belum ada kunjungan selesai yang siap ditagih.</p>
                <p className="text-[#3d4947] mt-0.5">
                  Setiap invoice membutuhkan kunjungan pasien yang sudah berstatus <strong>&quot;Selesai&quot;</strong> oleh terapis.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href={`/visits?patient_id=${selectedPatient.id}`}
                    className="font-semibold text-[#00685f] hover:underline flex items-center gap-1"
                  >
                    <span>Lihat Daftar Kunjungan Pasien</span>
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Billing Items ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-[#0b1c30]">
            Item Layanan / Tindakan <span className="text-[#ba1a1a]">*</span>
          </label>
          {!usePackage && (
            <button
              type="button"
              onClick={() => append({ service_id: 0, qty: 1, price: 0 })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00685f] text-white text-xs font-semibold rounded-lg hover:bg-[#008378] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Tambah Item
            </button>
          )}
        </div>

        {usePackage && currentPackage ? (
          <div className="border border-[#00685f]/30 rounded-xl overflow-hidden bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-[#00685f] tracking-wider">Item Dicover Paket</p>
                <p className="text-sm font-bold text-[#0b1c30] mt-0.5">
                  {currentPackage.service?.name ?? currentPackage.name} (1 Sesi)
                </p>
                <p className="text-xs text-[#3d4947]">
                  Paket: <span className="font-medium text-[#0b1c30]">{currentPackage.name}</span> • Mengurangi 1 sesi prabayar
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block text-xs font-bold text-[#065f46] bg-[#ecfdf5] px-3 py-1 rounded-full border border-[#065f46]/20">
                  Dicover Paket (Rp 0)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-[#bcc9c6]/60 rounded-xl overflow-hidden bg-white">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-[2fr_80px_130px_80px] gap-3 px-4 py-2.5 bg-[#f8f9ff] border-b border-[#bcc9c6]/40 text-xs font-bold text-[#3d4947] uppercase tracking-wider">
              <span>Layanan / Tindakan</span>
              <span>Qty</span>
              <span>Harga Satuan</span>
              <span className="text-right">Aksi</span>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 border-b border-[#bcc9c6]/20 last:border-0 sm:grid-cols-[2fr_80px_130px_80px] sm:items-center"
              >
                {/* Service Selection */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77] sm:hidden">
                    Layanan
                  </label>
                  <div className="relative">
                    <select
                      {...register(`items.${index}.service_id`, {
                        valueAsNumber: true,
                        onChange: (e) => handleServiceChange(index, Number(e.target.value)),
                      })}
                      className={cn(inputCls(!!errors.items?.[index]?.service_id), 'appearance-none pr-8')}
                    >
                      <option value={0}>Pilih layanan / tindakan...</option>
                      <optgroup label="Layanan Terapi & Konsultasi">
                        {services
                          .filter((s) => s.category !== 'obat_alat')
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({Number(s.price) > 0 ? formatRupiah(Number(s.price)) : 'Fleksibel'})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Obat, Alat Medis & Taping (Tambahan Pasien)">
                        {services
                          .filter((s) => s.category === 'obat_alat')
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Input manual kasir)
                            </option>
                          ))}
                      </optgroup>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  {errors.items?.[index]?.service_id && (
                    <p className="mt-0.5 text-[11px] text-[#ba1a1a]">{errors.items[index].service_id?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:contents">
                  {/* Qty */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77] sm:hidden">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register(`items.${index}.qty`, { valueAsNumber: true })}
                      className={cn(inputCls(!!errors.items?.[index]?.qty), 'text-center')}
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77] sm:hidden">
                      Harga
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithDots(watchedItems[index]?.price)}
                      onChange={(e) => {
                        const num = parseNumberFromDots(e.target.value);
                        setValue(`items.${index}.price`, num, { shouldValidate: true });
                      }}
                      className={cn(inputCls(!!errors.items?.[index]?.price), 'font-semibold')}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Remove */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="flex items-center gap-1.5 rounded-lg p-1.5 text-[#3d4947] transition-colors hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    <span className="text-xs font-semibold sm:hidden">Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {typeof errors.items?.message === 'string' && (
          <p className="mt-1 text-xs text-[#ba1a1a]">{errors.items.message}</p>
        )}
      </div>

      {/* ── 5. Preview Total ── */}
      <div className="flex flex-col gap-2 rounded-2xl border border-[#00685f]/20 bg-[#00685f]/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[#3d4947] uppercase tracking-wider font-semibold">Preview Total Invoice</p>
          <p className="text-xs text-[#3d4947] mt-0.5">
            {usePackage
              ? 'Dicover paket terapi — invoice lunas otomatis tanpa pembayaran tunai/transfer'
              : 'Kalkulasi lokal — total tagihan final dikonfirmasi oleh sistem'}
          </p>
        </div>
        <p className="text-2xl font-bold text-[#00685f]">
          {formatRupiah(usePackage ? 0 : previewTotal)}
        </p>
      </div>

      {/* ── 6. Submit Button ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="h-11 px-8 gradient-btn text-white rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menyimpan Invoice...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">
                {usePackage ? 'redeem' : 'receipt_long'}
              </span>
              {usePackage ? 'Buat Invoice & Potong Sesi Paket' : 'Buat Invoice'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}