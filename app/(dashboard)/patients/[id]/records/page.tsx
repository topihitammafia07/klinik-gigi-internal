'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { usePatient } from '@/hooks/usePatients';
import { usePatientMedicalRecords } from '@/hooks/useMedicalRecords';
import type { MedicalRecord } from '@/types/medical-record';
import { Pagination } from '@/components/ui-custom/Pagination';

export default function PatientRecordsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = Number(params.id);

  // ?from= tells us who sent us here:
  //   "patients"        -> back goes to /patients/{id}
  //   "medical-records" -> back goes to /medical-records
  //   default           -> /medical-records
  const from = searchParams.get('from') ?? 'medical-records';

  const backHref =
    from === 'patients'
      ? `/patients/${patientId}`
      : '/medical-records';

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId);
  const { data: recordsData, isLoading: loadingRecords } = usePatientMedicalRecords(patientId);
  const records: MedicalRecord[] = recordsData?.data ?? [];

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  if (loadingPatient || loadingRecords) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-8 w-8 text-[#00685f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const totalRecords = records.length;
  const lastPage = Math.max(1, Math.ceil(totalRecords / perPage));
  const paginatedRecords = records.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-2 rounded-xl border border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Histori Rekam Medis</h1>
          {patient && (
            <p className="text-sm text-[#3d4947] mt-0.5">
              {patient.full_name} · {patient.medical_record_number}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="bg-[#00685f]/5 border border-[#00685f]/20 rounded-xl px-5 py-4">
          <p className="text-sm text-[#3d4947]">
            Total <strong className="text-[#00685f]">{records.length}</strong> rekam medis tersimpan
          </p>
        </div>
      )}

      {/* Records accordion */}
      {records.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-[#bcc9c6] mb-3">description</span>
          <p className="text-base font-medium text-[#0b1c30]">Belum ada rekam medis</p>
          <p className="text-sm text-[#3d4947] mt-1">Rekam medis akan muncul setelah sesi terapi diisi</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedRecords.map((rec, idx) => {
              const isOpen = expandedId === rec.id;
              const visitDate = rec.visit?.visit_date;
              const recordIndex = records.length - ((page - 1) * perPage + idx);

              return (
                <div key={rec.id} className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : rec.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8f9ff] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {recordIndex}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0b1c30]">
                          {visitDate
                            ? format(new Date(visitDate + 'T00:00:00'), 'd MMMM yyyy', { locale: localeId })
                            : `Kunjungan #${rec.visit_id}`}
                        </p>
                        <p className="text-xs text-[#3d4947]">
                          {rec.visit?.therapy_type ?? 'Terapi'} · {rec.visit?.therapist?.name ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {rec.icf_codes && rec.icf_codes.length > 0 && (
                        <span className="text-xs text-[#00685f] bg-[#00685f]/10 px-2 py-0.5 rounded-full font-medium">
                          {rec.icf_codes.length} ICF
                        </span>
                      )}
                      <span
                        className="material-symbols-outlined text-[#3d4947] text-[20px] transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#bcc9c6]/40 px-5 py-5 space-y-4">
                      {[
                        { label: 'S — Subjective', value: rec.subjective, accent: 'text-[#0058be] bg-[#eff6ff]' },
                        { label: 'O — Objective', value: rec.objective, accent: 'text-[#006b2d] bg-[#f0fdf4]' },
                        { label: 'A — Assessment', value: rec.assessment, accent: 'text-[#c2410c] bg-[#fff7ed]' },
                        { label: 'P — Plan', value: rec.plan, accent: 'text-[#6d28d9] bg-[#f5f3ff]' },
                        { label: 'Tindakan Terapi', value: rec.therapy_action, accent: 'text-[#00685f] bg-[#ecfdf5]' },
                        { label: 'Catatan Perkembangan', value: rec.progress_notes, accent: 'text-[#3d4947] bg-[#f8f9ff]' },
                      ].map(({ label, value, accent }) => (
                        <div key={label}>
                          <p className={`inline-flex text-xs font-bold px-2 py-0.5 rounded mb-1.5 ${accent}`}>
                            {label}
                          </p>
                          <p className="text-sm text-[#0b1c30] whitespace-pre-wrap leading-relaxed">{value}</p>
                        </div>
                      ))}

                      {rec.icf_codes && rec.icf_codes.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[#3d4947] uppercase tracking-wider mb-2">Kode ICF</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.icf_codes.map((code) => (
                              <span
                                key={code}
                                className="inline-flex items-center px-2.5 py-1 bg-[#00685f]/10 text-[#00685f] text-xs font-semibold rounded-full border border-[#00685f]/20 font-mono"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-[#6d7a77]">
                        Dibuat: {format(new Date(rec.created_at), 'd MMM yyyy HH:mm', { locale: localeId })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalRecords > perPage && (
            <Pagination
              currentPage={page}
              lastPage={lastPage}
              total={totalRecords}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setPage(1);
              }}
              perPageOptions={[5, 10, 20]}
              itemName="rekam medis"
            />
          )}
        </div>
      )}
    </div>
  );
}