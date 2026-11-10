'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { usePatientMedicalRecords } from '@/hooks/useMedicalRecords';
import { usePatients } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui-custom/Pagination';

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const [recordPage, setRecordPage] = useState(1);
  const [recordPerPage, setRecordPerPage] = useState(5);

  const { data: patientsData, isLoading: loadingPatients } = usePatients({ search: debouncedSearch || undefined });
  const patients = patientsData?.data ?? [];

  const { data: recordsData, isLoading: loadingRecords } = usePatientMedicalRecords(selectedPatientId ?? 0);
  const records = recordsData?.data ?? [];

  const totalRecords = records.length;
  const lastRecordPage = Math.max(1, Math.ceil(totalRecords / recordPerPage));
  const paginatedRecords = records.slice((recordPage - 1) * recordPerPage, recordPage * recordPerPage);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Rekam Medis Pasien</h1>
          <p className="text-sm text-[#3d4947] mt-1">Kelola histori terapi dan perkembangan pasien</p>
        </div>
      </div>

      {/* Patient search */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
        <p className="text-sm font-semibold text-[#0b1c30] mb-3">Pilih Pasien</p>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor rekam medis..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
          />
        </div>

        {loadingPatients && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#3d4947]">
            <svg className="animate-spin h-4 w-4 text-[#00685f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mencari pasien...
          </div>
        )}

        {!loadingPatients && patients.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patients.slice(0, 8).map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  setSelectedPatientId(patient.id === selectedPatientId ? null : patient.id);
                  setRecordPage(1);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  selectedPatientId === patient.id
                    ? 'border-[#00685f] bg-[#00685f]/5 shadow-sm'
                    : 'border-[#bcc9c6] hover:border-[#00685f]/40 hover:bg-[#f8f9ff]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  selectedPatientId === patient.id ? 'bg-[#00685f] text-white' : 'bg-[#00685f]/10 text-[#00685f]'
                }`}>
                  {patient.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0b1c30] truncate">{patient.full_name}</p>
                  <p className="text-xs text-[#3d4947]">{patient.medical_record_number}</p>
                </div>
                {selectedPatientId === patient.id && (
                  <span className="material-symbols-outlined text-[#00685f] text-[16px] ml-auto flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!loadingPatients && debouncedSearch && patients.length === 0 && (
          <p className="mt-3 text-sm text-[#3d4947]">Pasien tidak ditemukan untuk &quot;{debouncedSearch}&quot;</p>
        )}
      </div>

      {/* Records for selected patient */}
      {selectedPatientId && (
        <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#bcc9c6]/40 bg-[#f8f9ff] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">
                Rekam Medis — {selectedPatient?.full_name}
              </h2>
              <p className="text-xs text-[#3d4947] mt-0.5">{selectedPatient?.medical_record_number}</p>
            </div>
            <Link
              href={`/patients/${selectedPatientId}/records?from=medical-records`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00685f] border border-[#00685f]/30 hover:bg-[#00685f]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              Lihat Lengkap
            </Link>
          </div>

          {loadingRecords && (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-[#00685f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {!loadingRecords && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[#bcc9c6] mb-2">description</span>
              <p className="text-sm font-medium text-[#0b1c30]">Belum ada rekam medis</p>
            </div>
          )}

          {!loadingRecords && records.length > 0 && (
            <div>
              <div className="divide-y divide-[#bcc9c6]/20">
                {paginatedRecords.map((rec) => (
                  <div key={rec.id} className="px-5 py-4 hover:bg-[#f8f9ff] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0b1c30]">
                          {rec.visit?.visit_date
                            ? format(new Date(rec.visit.visit_date + 'T00:00:00'), 'd MMMM yyyy', { locale: localeId })
                            : `Kunjungan #${rec.visit_id}`}
                        </p>
                        <p className="text-xs text-[#3d4947] mt-0.5">{rec.visit?.therapy_type} · {rec.visit?.therapist?.name}</p>
                        <p className="text-sm text-[#3d4947] mt-2 line-clamp-2">{rec.subjective}</p>
                      </div>
                      <Link
                        href={`/visits/${rec.visit_id}?from=medical-records`}
                        prefetch={false}
                        className="flex-shrink-0 p-1.5 rounded-lg text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {totalRecords > recordPerPage && (
                <div className="p-4 border-t border-[#bcc9c6]/20 bg-[#f8f9ff]/50">
                  <Pagination
                    currentPage={recordPage}
                    lastPage={lastRecordPage}
                    total={totalRecords}
                    perPage={recordPerPage}
                    onPageChange={setRecordPage}
                    onPerPageChange={(newPerPage) => {
                      setRecordPerPage(newPerPage);
                      setRecordPage(1);
                    }}
                    perPageOptions={[5, 10, 20]}
                    itemName="rekam medis"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt if no patient selected */}
      {!selectedPatientId && (
        <div className="bg-[#f8f9ff] rounded-xl border border-[#bcc9c6]/60 flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-[#bcc9c6] mb-3">person_search</span>
          <p className="text-base font-medium text-[#0b1c30]">Pilih pasien di atas</p>
          <p className="text-sm text-[#3d4947] mt-1">Cari dan pilih pasien untuk melihat histori rekam medisnya</p>
        </div>
      )}
    </div>
  );
}