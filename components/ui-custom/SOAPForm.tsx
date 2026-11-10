'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { IcfBrowserModal } from './IcfBrowserModal';
import type { MedicalRecord, MedicalRecordFormData, IcfCode } from '@/types/medical-record';

// ─── Schema ────────────────────────────────────────────────────

const soapSchema = z.object({
  subjective:     z.string().min(1, 'Subjective wajib diisi'),
  objective:      z.string().min(1, 'Objective wajib diisi'),
  assessment:     z.string().min(1, 'Assessment wajib diisi'),
  plan:           z.string().min(1, 'Plan wajib diisi'),
  therapy_action: z.string().min(1, 'Tindakan terapi wajib diisi'),
  progress_notes: z.string().min(1, 'Catatan progres wajib diisi'),
});

type SoapSchema = z.infer<typeof soapSchema>;

// ─── Props ─────────────────────────────────────────────────────

interface SOAPFormProps {
  visitId: number;
  defaultValues?: MedicalRecord;
  onSubmit: (data: MedicalRecordFormData) => void;
  isLoading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────

export function SOAPForm({ visitId, defaultValues, onSubmit, isLoading }: SOAPFormProps) {
  // ICF state
  const [icfModal, setIcfModal] = useState<'assessment' | 'plan' | null>(null);
  const [icfCodesAssessment, setIcfCodesAssessment] = useState<IcfCode[]>(
    defaultValues?.icf_codes?.map((c) => ({ code: c, title: c })) ?? []
  );
  const [icfCodesPlan, setIcfCodesPlan] = useState<IcfCode[]>([]);

  const allSelectedCodes = [
    ...icfCodesAssessment.map((c) => c.code),
    ...icfCodesPlan.map((c) => c.code),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SoapSchema>({
    resolver: zodResolver(soapSchema),
    defaultValues: {
      subjective:     defaultValues?.subjective     ?? '',
      objective:      defaultValues?.objective      ?? '',
      assessment:     defaultValues?.assessment     ?? '',
      plan:           defaultValues?.plan           ?? '',
      therapy_action: defaultValues?.therapy_action ?? '',
      progress_notes: defaultValues?.progress_notes ?? '',
    },
  });

  function handleSelectIcf(code: IcfCode) {
    if (icfModal === 'assessment') {
      setIcfCodesAssessment((prev) =>
        prev.find((c) => c.code === code.code) ? prev : [...prev, code]
      );
    } else if (icfModal === 'plan') {
      setIcfCodesPlan((prev) =>
        prev.find((c) => c.code === code.code) ? prev : [...prev, code]
      );
    }
  }

  function removeIcfCode(code: string, section: 'assessment' | 'plan') {
    if (section === 'assessment') {
      setIcfCodesAssessment((prev) => prev.filter((c) => c.code !== code));
    } else {
      setIcfCodesPlan((prev) => prev.filter((c) => c.code !== code));
    }
  }

  function onFormSubmit(values: SoapSchema) {
    onSubmit({
      ...values,
      visit_id: visitId,
      icf_codes: allSelectedCodes,
    });
  }

  const textareaCls = (err?: boolean) =>
    cn(
      'w-full rounded-xl border text-sm text-[#0b1c30] bg-white px-4 py-3 resize-none',
      'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors',
      err ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]'
    );

  const soapSections: {
    key: keyof SoapSchema;
    label: string;
    placeholder: string;
    accent: string;
    rows: number;
    icfTarget?: 'assessment' | 'plan';
  }[] = [
    {
      key: 'subjective',
      label: 'S — Subjective',
      placeholder: 'Keluhan yang disampaikan pasien...',
      accent: 'bg-[#eff4ff] text-[#0058be]',
      rows: 3,
    },
    {
      key: 'objective',
      label: 'O — Objective',
      placeholder: 'Hasil pemeriksaan fisik dan observasi terapis...',
      accent: 'bg-[#f0fdf4] text-[#006b2d]',
      rows: 3,
    },
    {
      key: 'assessment',
      label: 'A — Assessment',
      placeholder: 'Diagnosa dan analisis kondisi pasien...',
      accent: 'bg-[#fff7ed] text-[#c2410c]',
      rows: 3,
      icfTarget: 'assessment',
    },
    {
      key: 'plan',
      label: 'P — Plan',
      placeholder: 'Rencana terapi dan intervensi ke depan...',
      accent: 'bg-[#f5f3ff] text-[#6d28d9]',
      rows: 3,
      icfTarget: 'plan',
    },
    {
      key: 'therapy_action',
      label: 'Tindakan Terapi',
      placeholder: 'Tindakan yang sudah dilakukan pada sesi ini...',
      accent: 'bg-[#ecfdf5] text-[#00685f]',
      rows: 3,
    },
    {
      key: 'progress_notes',
      label: 'Catatan Perkembangan',
      placeholder: 'Catatan perkembangan, respons pasien, perubahan kondisi...',
      accent: 'bg-[#f8f9ff] text-[#3d4947]',
      rows: 4,
    },
  ];

  return (
    <>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
        {soapSections.map((section) => {
          const icfCodes =
            section.icfTarget === 'assessment'
              ? icfCodesAssessment
              : section.icfTarget === 'plan'
              ? icfCodesPlan
              : [];

          return (
            <div key={section.key}>
              <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-[#0b1c30]">
                  <span className={cn('text-xs px-2 py-0.5 rounded font-bold', section.accent)}>
                    {section.label.split(' — ')[0]}
                  </span>
                  {section.label.includes(' — ')
                    ? section.label.split(' — ')[1]
                    : section.label}
                  <span className="text-[#ba1a1a]">*</span>
                </label>

                {/* ICF button for Assessment and Plan */}
                {section.icfTarget && (
                  <button
                    type="button"
                    onClick={() => setIcfModal(section.icfTarget!)}
                    className="flex w-fit items-center gap-1.5 rounded-lg border border-[#00685f]/30 bg-[#00685f]/5 px-3 py-1.5 text-xs font-semibold text-[#00685f] transition-colors hover:bg-[#00685f]/10"
                  >
                    <span className="material-symbols-outlined text-[14px]">manage_search</span>
                    Cari Kode ICF
                  </button>
                )}
              </div>

              <textarea
                {...register(section.key)}
                rows={section.rows}
                placeholder={section.placeholder}
                className={textareaCls(!!errors[section.key])}
              />
              {errors[section.key] && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors[section.key]?.message}</p>
              )}

              {/* ICF code badges */}
              {section.icfTarget && icfCodes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {icfCodes.map((c) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00685f]/10 text-[#00685f] text-xs font-semibold rounded-full border border-[#00685f]/20"
                    >
                      <span className="font-mono">{c.code}</span>
                      <span className="text-[#3d4947] font-normal max-w-[120px] truncate">{c.title}</span>
                      <button
                        type="button"
                        onClick={() => removeIcfCode(c.code, section.icfTarget!)}
                        className="ml-0.5 text-[#3d4947] hover:text-[#ba1a1a] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 px-8 gradient-btn text-white rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                <span className="material-symbols-outlined text-[18px]">save</span>
                Simpan Rekam Medis
              </>
            )}
          </button>
        </div>
      </form>

      {/* ICF Browser Modal */}
      <IcfBrowserModal
        isOpen={icfModal !== null}
        onClose={() => setIcfModal(null)}
        onSelect={handleSelectIcf}
        selectedCodes={allSelectedCodes}
      />
    </>
  );
}