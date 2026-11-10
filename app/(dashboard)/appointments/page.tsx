'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAppointments, useCancelAppointment, usePrepareRegistrationFee } from '@/hooks/useAppointments';
import { CreateVisitModal } from '@/components/ui-custom/CreateVisitModal';
import type { AppointmentStatus, Appointment } from '@/types/appointment';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useToast } from '@/components/ui-custom/Toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { Pagination } from '@/components/ui-custom/Pagination';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'bg-[#eff6ff] text-[#1e40af] border border-[#1e40af]/20',
  done:      'bg-[#ecfdf5] text-[#065f46] border border-[#065f46]/20',
  cancelled: 'bg-[#ffdad6]/60 text-[#ba1a1a] border border-[#ba1a1a]/20',
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Terjadwal',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
};

export default function AppointmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading, error } = useAppointments({
    date:   filterDate || undefined,
    status: filterStatus || undefined,
    page,
    per_page: perPage,
  });

  const { mutateAsync: cancelAppointment, isPending: cancelling } = useCancelAppointment();
  const registrationFee = usePrepareRegistrationFee();
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Modal state for creating a visit
  const [createVisitTarget, setCreateVisitTarget] = useState<Appointment | null>(null);
  const [visitCreatedId, setVisitCreatedId] = useState<number | null>(null);

  const { confirm, dialogProps } = useConfirmDialog();

  const appointments = data?.data ?? [];
  const meta         = data?.meta;

  function handleCancel(id: number) {
    confirm({
      title: 'Batalkan jadwal ini?',
      variant: 'warning',
      confirmLabel: 'Ya, Batalkan',
      onConfirm: async () => {
        setCancellingId(id);
        try { await cancelAppointment(id); } finally { setCancellingId(null); }
      },
    });
  }

  function handleVisitCreated(appointmentId: number) {
    setVisitCreatedId(appointmentId);
    setTimeout(() => setVisitCreatedId(null), 4000);
  }

  async function handlePrepareRegistrationFee(appointmentId: number) {
    try {
      const billing = await registrationFee.mutateAsync(appointmentId);
      toast.success('Biaya pendaftaran disiapkan', 'Invoice pra-tindakan sudah dibuat/diperbarui sesuai pengaturan Owner.');
      router.push(`/billing/${billing.id}`);
    } catch (error: unknown) {
      toast.error('Biaya pendaftaran tidak dapat dibuat', getApiErrorMessage(error, 'Periksa pengaturan biaya pendaftaran pasien.'));
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Jadwal Terapi</h1>
          <p className="text-sm text-[#3d4947] mt-1">
            {filterDate
              ? format(new Date(filterDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: localeId })
              : 'Semua tanggal'}
          </p>
        </div>
        <Link
          href="/appointments/new"
          prefetch={false}
          className="inline-flex items-center gap-2 h-10 px-5 gradient-btn text-white rounded-xl text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Buat Jadwal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px]">calendar_today</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            className="h-10 pl-10 pr-4 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as AppointmentStatus | ''); setPage(1); }}
            className="h-10 pl-4 pr-10 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]"
          >
            <option value="">Semua Status</option>
            <option value="scheduled">Terjadwal</option>
            <option value="done">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[16px] pointer-events-none">expand_more</span>
        </div>

        {(filterDate !== '' || filterStatus) && (
          <button
            onClick={() => { setFilterDate(''); setFilterStatus(''); setPage(1); }}
            className="h-10 px-4 rounded-xl border border-[#bcc9c6] text-sm text-[#3d4947] hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Reset Filter
          </button>
        )}
      </div>

      {/* Success toast */}
      {visitCreatedId && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#ecfdf5] border border-[#065f46]/20 rounded-xl text-sm text-[#065f46] font-medium">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Kunjungan berhasil dibuat! Pasien sekarang ada di daftar antrian.
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 flex items-center justify-between bg-[#f8f9ff]">
          <h2 className="text-base font-semibold text-[#0b1c30]">Daftar Jadwal</h2>
          {meta && (
            <span className="text-xs text-[#3d4947]">{meta.total} jadwal ditemukan</span>
          )}
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
            <p className="text-sm text-[#3d4947]">Gagal memuat data jadwal.</p>
          </div>
        )}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#bcc9c6] mb-3">event_busy</span>
            <p className="text-base font-medium text-[#0b1c30]">Tidak ada jadwal</p>
            <p className="text-sm text-[#3d4947] mt-1">
              {filterDate || filterStatus ? 'Coba ubah filter' : 'Belum ada jadwal yang dibuat'}
            </p>
          </div>
        )}

        {!isLoading && appointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                  <th className="px-5 py-3">Pasien</th>
                  <th className="px-5 py-3">Terapis</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/20">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#00685f]/10 text-[#00685f] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {apt.patient?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0b1c30]">
                            {apt.patient?.full_name ?? `Pasien #${apt.patient_id}`}
                          </p>
                          <p className="text-xs text-[#3d4947]">
                            {apt.patient?.medical_record_number ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30]">
                      {apt.therapist?.name ?? `Terapis #${apt.therapist_id}`}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0b1c30]">
                      {format(new Date(apt.appointment_date + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[#0b1c30] font-mono">
                        {apt.time_start.slice(0, 5)} – {apt.time_end.slice(0, 5)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[apt.status]}`}>
                          {STATUS_LABEL[apt.status]}
                        </span>
                        {/* Show "Kunjungan dibuat" badge if visit already exists */}
                        {apt.visit && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#065f46] font-medium">
                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Sudah ada kunjungan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePrepareRegistrationFee(apt.id)}
                              disabled={registrationFee.isPending}
                              className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#00685f] hover:bg-[#00685f]/10 transition-colors disabled:opacity-50"
                              title="Siapkan biaya pendaftaran sebelum tindakan"
                            >
                              <span className="material-symbols-outlined text-[18px]">receipt</span>
                            </button>
                            {/* Buat Kunjungan — only if no visit yet */}
                            {!apt.visit && (
                              <button
                                onClick={() => setCreateVisitTarget(apt)}
                                className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#00685f] hover:bg-[#00685f]/10 transition-colors"
                                title="Buat kunjungan"
                              >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                              </button>
                            )}
                            {/* Cancel */}
                            <button
                              onClick={() => handleCancel(apt.id)}
                              disabled={cancelling && cancellingId === apt.id}
                              className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors disabled:opacity-50"
                              title="Batalkan jadwal"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                          </>
                        )}
                      </div>
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
            itemName="jadwal"
            onPageChange={(p) => setPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Create Visit Modal */}
      {createVisitTarget && (
        <CreateVisitModal
          appointment={createVisitTarget}
          onClose={() => setCreateVisitTarget(null)}
          onSuccess={() => handleVisitCreated(createVisitTarget.id)}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}