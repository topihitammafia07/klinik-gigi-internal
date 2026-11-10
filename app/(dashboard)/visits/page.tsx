'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useVisits } from '@/hooks/useVisits';
import { useTherapists } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/axios';
import { exportToXlsx } from '@/lib/exportToXlsx';
import type { VisitStatus, PatientVisit } from '@/types/visit';
import { Pagination } from '@/components/ui-custom/Pagination';

const STATUS_BADGE: Record<VisitStatus, string> = {
  waiting: 'bg-[#fef9c3] text-[#854d0e] border border-[#854d0e]/20',
  ongoing: 'bg-[#eff6ff] text-[#1e40af] border border-[#1e40af]/20',
  done:    'bg-[#ecfdf5] text-[#065f46] border border-[#065f46]/20',
};
const STATUS_LABEL: Record<VisitStatus, string> = {
  waiting: 'Menunggu',
  ongoing: 'Berlangsung',
  done:    'Selesai',
};

export default function VisitsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fromPatientId = searchParams.get('patient_id');
  const fromContext = fromPatientId ? 'patients' : undefined;
  const [filterStatus, setFilterStatus] = useState<VisitStatus | ''>('');
  const [filterTherapistId, setFilterTherapistId] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  const params: Record<string, unknown> = { page, per_page: perPage };
  if (filterStatus) params.status = filterStatus;
  if (fromPatientId) params.patient_id = parseInt(fromPatientId);
  if (filterTherapistId) params.therapist_id = filterTherapistId;

  const { data, isLoading, error } = useVisits(params as Parameters<typeof useVisits>[0]);
  const { data: therapists } = useTherapists();

  const visits = data?.data ?? [];
  const meta   = data?.meta;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportParams: Record<string, unknown> = { per_page: 1000 };
      if (filterStatus) exportParams.status = filterStatus;
      if (fromPatientId) exportParams.patient_id = parseInt(fromPatientId);
      if (filterTherapistId) exportParams.therapist_id = filterTherapistId;

      const { data: res } = await apiClient.get('/visits', { params: exportParams });
      const allVisits: PatientVisit[] = res?.data?.data ?? [];

      exportToXlsx<PatientVisit>(
        allVisits,
        [
          { key: 'id', label: 'ID Kunjungan' },
          { key: 'visit_date', label: 'Tanggal Kunjungan', format: (v) => v ? format(new Date(`${v}T00:00:00`), 'd MMM yyyy', { locale: localeId }) : '—' },
          { key: 'patient', label: 'No. Rekam Medis', format: (_, row) => row.patient?.medical_record_number ?? '—' },
          { key: 'patient', label: 'Nama Pasien', format: (_, row) => row.patient?.full_name ?? `#${row.patient_id}` },
          { key: 'therapist', label: 'Terapis', format: (_, row) => (row.therapist as { name?: string } | undefined)?.name ?? `#${row.therapist_id}` },
          { key: 'receptionist', label: 'Resepsionis', format: (_, row) => (row.receptionist as { name?: string } | undefined)?.name ?? '—' },
          { key: 'appointment', label: 'Jadwal Appointment', format: (_, row) => {
            const appt = row.appointment as { appointment_date?: string; time_start?: string; time_end?: string } | undefined;
            if (!appt?.appointment_date) return '—';
            const date = format(new Date(`${appt.appointment_date}T00:00:00`), 'd MMM yyyy', { locale: localeId });
            return appt.time_start && appt.time_end ? `${date}, ${appt.time_start}–${appt.time_end}` : date;
          } },
          { key: 'complaint', label: 'Keluhan' },
          { key: 'therapy_type', label: 'Jenis Terapi' },
          { key: 'diagnosis', label: 'Diagnosis' },
          { key: 'status', label: 'Status', format: (v) => STATUS_LABEL[v as VisitStatus] ?? String(v) },
          { key: 'has_medical_record', label: 'Rekam Medis', format: (v) => (v ? 'Ada' : 'Belum Ada') },
          { key: 'has_billing', label: 'Tagihan', format: (v) => (v ? 'Ada' : 'Belum Ada') },
          { key: 'created_at', label: 'Dibuat', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: localeId }) : '—' },
        ],
        `Data_Kunjungan_${format(new Date(), 'yyyyMMdd')}`,
        'Kunjungan'
      );
    } catch (err) {
      console.error('Export gagal:', err);
      alert('Export gagal. Periksa koneksi dan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Kunjungan Pasien</h1>
          <p className="text-sm text-[#3d4947] mt-1">
            {fromPatientId
              ? 'Riwayat kunjungan pasien ini'
              : 'Daftar kunjungan dan status terapi'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {fromPatientId && (
            <Link
              href={`/patients/${fromPatientId}`}
              prefetch={false}
              className="flex items-center gap-1.5 text-sm text-[#00685f] hover:text-[#00685f]/80 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span className="hover:underline">Kembali ke Detail Pasien</span>
            </Link>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#bcc9c6] text-[#3d4947] text-sm rounded-lg hover:border-[#00685f] hover:text-[#00685f] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mengekspor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export .xlsx
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as VisitStatus | ''); setPage(1); }}
            className="h-10 pl-4 pr-10 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
          >
            <option value="">Semua Status</option>
            <option value="waiting">Menunggu</option>
            <option value="ongoing">Berlangsung</option>
            <option value="done">Selesai</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px] pointer-events-none">expand_more</span>
        </div>

        {user?.role === 'terapis' && (
          <div className="relative">
            <select
              value={filterTherapistId}
              onChange={(e) => { setFilterTherapistId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className="h-10 pl-4 pr-10 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
            >
              <option value="">Semua Terapis</option>
              {therapists?.map((t) => (
                <option key={t.id} value={t.id}>{t.id === user?.id ? `${t.name} (Saya)` : t.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px] pointer-events-none">expand_more</span>
          </div>
        )}

        {(filterStatus || filterTherapistId) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterTherapistId(''); setPage(1); }}
            className="h-10 px-4 rounded-xl border border-[#bcc9c6] text-sm text-[#3d4947] hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 flex items-center justify-between bg-[#f8f9ff]">
          <h2 className="text-base font-semibold text-[#0b1c30]">Daftar Kunjungan</h2>
          {meta && <span className="text-xs text-[#3d4947]">{meta.total} kunjungan</span>}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-[#00685f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-[#ba1a1a] mb-2">error</span>
            <p className="text-sm text-[#3d4947]">Gagal memuat data kunjungan.</p>
          </div>
        )}

        {!isLoading && !error && visits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#bcc9c6] mb-3">local_hospital</span>
            <p className="text-base font-medium text-[#0b1c30]">Tidak ada kunjungan</p>
            <p className="text-sm text-[#3d4947] mt-1">
              {filterStatus ? 'Coba ubah filter status' : 'Belum ada kunjungan tercatat'}
            </p>
          </div>
        )}

        {!isLoading && visits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                  <th className="px-5 py-3">Pasien</th>
                  <th className="px-5 py-3">Terapis</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Keluhan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/20">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#00685f]/10 text-[#00685f] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {visit.patient?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0b1c30]">
                            {visit.patient?.full_name ?? `Pasien #${visit.patient_id}`}
                          </p>
                          <p className="text-xs text-[#3d4947]">
                            {visit.patient?.medical_record_number ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30]">
                      {(visit.therapist as { name?: string } | undefined)?.name ?? `Terapis #${visit.therapist_id}`}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30]">
                      {format(new Date(visit.visit_date + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[#0b1c30] max-w-[200px] truncate">{visit.complaint}</p>
                      <p className="text-xs text-[#3d4947]">{visit.therapy_type}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[visit.status]}`}>
                        {STATUS_LABEL[visit.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={fromContext === 'patients' && fromPatientId ? `/visits/${visit.id}?from=patients&patient_id=${fromPatientId}` : `/visits/${visit.id}`}
                        prefetch={false}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00685f] border border-[#00685f]/30 hover:bg-[#00685f]/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <Pagination
            page={meta.current_page}
            totalPages={meta.last_page}
            total={meta.total}
            perPage={perPage}
            perPageOptions={[5, 10, 25]}
            itemName="kunjungan"
            onPageChange={(p) => setPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}