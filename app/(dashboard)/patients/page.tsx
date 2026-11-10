'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePatients, useDeletePatient, useUpdatePatientSince } from '@/hooks/usePatients';
import { Patient, PatientStatus } from '@/types/patient';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { calculateAge } from '@/lib/utils';
import apiClient from '@/lib/axios';
import { exportToXlsx } from '@/lib/exportToXlsx';
import { PatientStatusBadge } from '@/components/ui-custom/PatientStatusBadge';
import { PatientSinceModal } from '@/components/ui-custom/PatientSinceModal';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Pagination } from '@/components/ui-custom/Pagination';

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<PatientStatus | ''>(
    (searchParams.get('status') as PatientStatus) || ''
  );
  const [isExporting, setIsExporting] = useState(false);
  const [sinceModalPatient, setSinceModalPatient] = useState<Patient | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError } = usePatients({
    search: debouncedSearch,
    page,
    per_page: perPage,
    status: statusFilter || undefined,
  });
  const deletePatient = useDeletePatient();
  const updatePatientSince = useUpdatePatientSince(sinceModalPatient?.id ?? 0);
  const { confirm, dialogProps } = useConfirmDialog();

  // Sync URL params
  const updateURL = useCallback((s: string, p: number, status: PatientStatus | '') => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (p > 1) params.set('page', String(p));
    if (status) params.set('status', status);
    router.replace(`/patients${params.toString() ? `?${params}` : ''}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    setPage(1);
    updateURL(debouncedSearch, 1, statusFilter);
  }, [debouncedSearch, statusFilter, updateURL]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateURL(debouncedSearch, newPage, statusFilter);
  };

  const handleDelete = (patient: Patient) => {
    confirm({
      title: `Hapus data pasien ${patient.full_name}?`,
      description: 'Tindakan ini tidak dapat dibatalkan.',
      variant: 'danger',
      confirmLabel: 'Ya, Hapus',
      onConfirm: () => deletePatient.mutateAsync(patient.id),
    });
  };

  const handleConfirmPatientSince = async (date: string) => {
    if (!sinceModalPatient) return;
    try {
      await updatePatientSince.mutateAsync(date);
      setSinceModalPatient(null);
    } catch (err) {
      console.error('Gagal update tanggal terdaftar:', err);
      alert('Gagal menyimpan tanggal. Coba lagi.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch semua pasien (tanpa paginasi) untuk export
      const { data: res } = await apiClient.get('/patients', {
        params: { search: debouncedSearch || undefined, status: statusFilter || undefined, per_page: 1000 },
      });
      const allPatients: Patient[] = res?.data?.data ?? [];

      const canViewPhone = hasRole('owner', 'resepsionis');

      exportToXlsx<Patient>(
        allPatients,
        [
          { key: 'medical_record_number', label: 'No. Rekam Medis' },
          { key: 'full_name', label: 'Nama Lengkap' },
          { key: 'gender', label: 'Jenis Kelamin', format: (v) => (v === 'male' ? 'Laki-laki' : 'Perempuan') },
          { key: 'birth_date', label: 'Tanggal Lahir', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: idLocale }) : '—' },
          { key: 'birth_date', label: 'Usia', format: (v) => v ? calculateAge(v as string).replace('Usia: ', '') : '—' },
          ...(canViewPhone ? [{ key: 'phone', label: 'No. Telepon' } as const] : []),
          { key: 'address', label: 'Alamat' },
          { key: 'parent_name', label: 'Nama Orang Tua / Wali' },
          { key: 'emergency_contact', label: 'Kontak Darurat' },
          { key: 'allergy_notes', label: 'Catatan Alergi' },
          { key: 'patient_since', label: 'Terdaftar Sejak', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: idLocale }) : '—' },
          { key: 'patient_status', label: 'Status', format: (v) => (v === 'old' ? 'Pasien Lama' : 'Pasien Baru') },
          { key: 'visits_count', label: 'Jumlah Kunjungan', format: (v: unknown) => Number(v ?? 0) },
          { key: 'last_visit_date', label: 'Kunjungan Terakhir', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: idLocale }) : '—' },
          { key: 'active_packages_count', label: 'Paket Terapi Aktif', format: (v: unknown) => Number(v ?? 0) },
          { key: 'total_billed', label: 'Total Tagihan (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          { key: 'total_unpaid', label: 'Belum Dibayar (Rp)', format: (v) => Number(v ?? 0).toLocaleString('id-ID') },
          { key: 'created_at', label: 'Dibuat Pada', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy', { locale: idLocale }) : '—' },
          { key: 'updated_at', label: 'Terakhir Diupdate', format: (v) => v ? format(new Date(v as string), 'd MMM yyyy HH:mm', { locale: idLocale }) : '—' },
        ],
        `Data_Pasien_${format(new Date(), 'yyyyMMdd')}`,
        'Pasien'
      );
    } catch (err) {
      console.error('Export gagal:', err);
      alert('Export gagal. Periksa koneksi dan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const patients = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-10">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Manajemen Pasien</h2>
          <p className="text-sm text-[#3d4947] mt-1">
            Kelola data pasien, histori terapi, dan progress pemulihan secara terintegrasi.
          </p>
        </div>
        {hasRole('owner', 'pj_klinik', 'resepsionis') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg border border-[#bcc9c6]/40 text-[#00685f] text-sm font-medium hover:bg-[#eff4ff] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export .xlsx
                </>
              )}
            </button>
            <Link
              href="/patients/new"
              prefetch={false}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#00685f] text-white rounded-lg text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Pasien
            </Link>
          </div>
        )}
      </section>

      {/* Table Section */}
      <section className="flex flex-col gap-3">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-2xl border border-[#bcc9c6]/30 shadow-sm">
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PatientStatus | '')}
              className="px-3 py-2 bg-[#eff4ff] text-[#00685f] rounded-lg text-xs font-medium border-none focus:ring-2 focus:ring-[#00685f]/20 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="new">Pasien Baru</option>
              <option value="old">Pasien Lama</option>
            </select>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, ID, atau no. telepon..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#bcc9c6]/50 bg-[#f8f9ff] text-sm text-[#0b1c30] placeholder:text-[#3d4947]/60 focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Profile & ID</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden lg:table-cell">Alamat</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden sm:table-cell">Demografi</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden md:table-cell">Terdaftar Sejak</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/10">
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-[#eff4ff] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {isError && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#ba1a1a] text-sm">
                      <span className="material-symbols-outlined text-3xl block mb-2">error_outline</span>
                      Gagal memuat data pasien. Periksa koneksi API.
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && patients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#3d4947] text-sm">
                      <span className="material-symbols-outlined text-4xl text-[#bcc9c6] block mb-3">person_search</span>
                      {debouncedSearch ? `Tidak ada pasien ditemukan untuk "${debouncedSearch}"` : 'Belum ada data pasien.'}
                    </td>
                  </tr>
                )}

                {!isLoading && patients.map((patient: Patient) => (
                  <tr key={patient.id} className="hover:bg-[#f0fdf9]/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#00685f]/15 text-[#00685f] flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {patient.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30] leading-tight">{patient.full_name}</p>
                          <p className="text-xs text-[#3d4947] font-mono">{patient.medical_record_number}</p>
                          {hasRole('owner', 'resepsionis') && (
                            <p className="text-xs text-[#6d7a77] sm:hidden">{patient.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell max-w-[220px]">
                      <p className="text-sm text-[#0b1c30] line-clamp-2">
                        {patient.address || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm text-[#0b1c30]">
                        {patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                      </p>
                      {hasRole('owner', 'resepsionis') && (
                        <p className="text-xs text-[#3d4947]">{patient.phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <PatientStatusBadge status={patient.patient_status} />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#0b1c30]">
                          {format(new Date(patient.patient_since), 'd MMM yyyy', { locale: idLocale })}
                        </p>
                        {hasRole('owner', 'pj_klinik', 'resepsionis') && (
                          <button
                            onClick={() => setSinceModalPatient(patient)}
                            title="Ubah tanggal terdaftar"
                            className="p-1 text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/patients/${patient.id}`}
                          prefetch={false}
                          className="p-1.5 text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] rounded-md transition-colors"
                          title="Detail"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                        {hasRole('owner', 'pj_klinik', 'resepsionis') && (
                          <Link
                            href={`/patients/${patient.id}/edit`}
                            prefetch={false}
                            className="p-1.5 text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] rounded-md transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                        )}
                        {hasRole('owner', 'pj_klinik') && (
                          <button
                            onClick={() => handleDelete(patient)}
                            className="p-1.5 text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded-md transition-colors"
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <Pagination
              page={meta.current_page}
              totalPages={meta.last_page}
              total={meta.total}
              perPage={perPage}
              perPageOptions={[5, 10, 25]}
              itemName="pasien"
              onPageChange={handlePageChange}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setPage(1);
              }}
            />
          )}
        </div>
      </section>

      <PatientSinceModal
        isOpen={!!sinceModalPatient}
        currentDate={sinceModalPatient?.patient_since ?? ''}
        onClose={() => setSinceModalPatient(null)}
        onConfirm={handleConfirmPatientSince}
        isLoading={updatePatientSince.isPending}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}