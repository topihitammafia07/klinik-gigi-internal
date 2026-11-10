'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useVisit, useUpdateVisitStatus } from '@/hooks/useVisits';
import { useVisitMedicalRecord, useCreateMedicalRecord, useUpdateMedicalRecord } from '@/hooks/useMedicalRecords';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { RoleGuard } from '@/components/ui-custom/RoleGuard';
import { SOAPForm } from '@/components/ui-custom/SOAPForm';
import type { VisitStatus } from '@/types/visit';
import type { MedicalRecordFormData } from '@/types/medical-record';

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
const NEXT_STATUS: Partial<Record<VisitStatus, VisitStatus>> = {
  waiting: 'ongoing',
  ongoing: 'done',
};

export default function VisitDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const visitId = Number(params.id);
  const { user } = useAuth();
  const toast = useToast();

  const from = searchParams.get('from');
  const fromPatientId = searchParams.get('patient_id');

  const { data: visit, isLoading, error } = useVisit(visitId);
  const { data: medicalRecord } = useVisitMedicalRecord(visitId);
  const { mutateAsync: updateStatus, isPending: updatingStatus } = useUpdateVisitStatus();
  const { mutateAsync: createRecord, isPending: creatingRecord } = useCreateMedicalRecord();
  const { mutateAsync: updateRecord, isPending: updatingRecord } = useUpdateMedicalRecord(medicalRecord?.id ?? 0);

  // Revisi: resepsionis juga bisa input SOAP kalo terapis sedang sibuk
  const canEditSoap =
    user?.role === 'owner' ||
    user?.role === 'pj_klinik' ||
    user?.role === 'resepsionis' ||                                    // ← NEW
    (user?.role === 'terapis' && visit?.therapist_id === user?.id);

  // Resepsionis bisa edit, tapi bukan terapis pemilik kunjungan
  const isReceptionistProxy =
    user?.role === 'resepsionis';

  function getBackHref() {
    if (from === 'patients' && (fromPatientId || visit?.patient_id)) {
      const pid = fromPatientId ?? visit?.patient_id;
      return `/patients/${pid}?from=patients`;
    }
    if (from === 'medical-records') return '/medical-records';
    return '/visits';
  }

  async function handleStatusUpdate() {
    if (!visit || !NEXT_STATUS[visit.status]) return;
    try {
      await updateStatus({ id: visitId, status: NEXT_STATUS[visit.status]! });
      const nextLabel = STATUS_LABEL[NEXT_STATUS[visit.status]!];
      toast.success('Status kunjungan diperbarui', `Kunjungan sekarang berstatus ${nextLabel}.`);
    } catch {
      toast.error('Gagal memperbarui status', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async function handleSoapSubmit(data: MedicalRecordFormData) {
    try {
      if (medicalRecord?.id) {
        await updateRecord(data);
        toast.success('Rekam medis diperbarui', 'Data SOAP berhasil disimpan.');
      } else {
        await createRecord(data);
        toast.success('Rekam medis disimpan', 'Data SOAP berhasil dicatat.');
      }
    } catch {
      toast.error('Gagal menyimpan rekam medis', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-8 w-8 text-[#00685f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <p className="text-base font-medium text-[#0b1c30]">Kunjungan tidak ditemukan</p>
        <Link href="/visits" className="text-sm text-[#00685f] hover:underline font-medium">← Kembali ke daftar</Link>
      </div>
    );
  }

  const backHref = getBackHref();

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0b1c30]">Detail Kunjungan</h1>
          <p className="text-sm text-[#3d4947] mt-0.5">
            {format(new Date(visit.visit_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: localeId })}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[visit.status]}`}>
          {STATUS_LABEL[visit.status]}
        </span>
      </div>

      {/* Visit info card */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#0b1c30] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00685f] text-[18px]">info</span>
          Informasi Kunjungan
        </h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[#3d4947] text-xs uppercase tracking-wider font-semibold mb-1">Pasien</p>
            <p className="text-[#0b1c30] font-medium">{visit.patient?.full_name ?? `#${visit.patient_id}`}</p>
            <p className="text-[#3d4947] text-xs">{visit.patient?.medical_record_number}</p>
          </div>
          <div>
            <p className="text-[#3d4947] text-xs uppercase tracking-wider font-semibold mb-1">Terapis</p>
            <p className="text-[#0b1c30] font-medium">{(visit.therapist as { name?: string } | undefined)?.name ?? `#${visit.therapist_id}`}</p>
          </div>
          <div>
            <p className="text-[#3d4947] text-xs uppercase tracking-wider font-semibold mb-1">Jenis Terapi</p>
            <p className="text-[#0b1c30]">{visit.therapy_type}</p>
          </div>
          <div>
            <p className="text-[#3d4947] text-xs uppercase tracking-wider font-semibold mb-1">Keluhan</p>
            <p className="text-[#0b1c30]">{visit.complaint}</p>
          </div>
          {visit.diagnosis && (
            <div className="sm:col-span-2">
              <p className="text-[#3d4947] text-xs uppercase tracking-wider font-semibold mb-1">Diagnosis</p>
              <p className="text-[#0b1c30]">{visit.diagnosis}</p>
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-[#bcc9c6]/40 flex flex-wrap items-center gap-3">
          <RoleGuard allowedRoles={['owner', 'pj_klinik', 'terapis']}>
            {NEXT_STATUS[visit.status] && (
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus}
                className="flex items-center gap-2 h-10 px-5 gradient-btn text-white rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updatingStatus ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memperbarui...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">update</span>
                    {NEXT_STATUS[visit.status] === 'ongoing' ? 'Mulai Terapi (Ongoing)' : 'Tandai Selesai'}
                  </>
                )}
              </button>
            )}
          </RoleGuard>

          {/* Quick billing action once visit is finished */}
          {visit.status === 'done' && (
            <RoleGuard allowedRoles={['owner', 'pj_klinik', 'resepsionis']}>
              {!visit.has_billing ? (
                <Link
                  href={`/billing/new?patient_id=${visit.patient_id}&visit_id=${visit.id}&from=visits`}
                  className="flex items-center gap-2 h-10 px-5 bg-[#00685f] text-white rounded-xl text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Buat Tagihan / Invoice
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ecfdf5] text-[#065f46] text-xs font-semibold border border-[#065f46]/20">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  Invoice Sudah Diterbitkan
                </span>
              )}
            </RoleGuard>
          )}
        </div>
      </div>

      {/* SOAP Form — termasuk resepsionis */}
      {canEditSoap ? (
        <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#0b1c30] mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[18px]">description</span>
            Rekam Medis SOAP
            {medicalRecord && (
              <span className="ml-2 text-xs font-normal text-[#065f46] bg-[#ecfdf5] border border-[#065f46]/20 px-2 py-0.5 rounded-full">
                Sudah diisi — edit mode
              </span>
            )}
          </h2>

          {/* Banner khusus resepsionis */}
          {isReceptionistProxy && (
            <div className="mb-4 flex items-start gap-2 bg-[#fff7ed] border border-[#f97316]/20 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[#c2410c] text-[18px] mt-0.5 flex-shrink-0">info</span>
              <p className="text-xs text-[#c2410c] font-medium leading-relaxed">
                Anda mengisi form ini <strong>sebagai resepsionis</strong> yang mewakili terapis.
                Pastikan data diisi berdasarkan informasi dari terapis yang menangani pasien.
              </p>
            </div>
          )}

          <SOAPForm
            visitId={visitId}
            defaultValues={medicalRecord ?? undefined}
            onSubmit={handleSoapSubmit}
            isLoading={creatingRecord || updatingRecord}
          />
        </div>
      ) : (
        <div className="bg-[#f8f9ff] rounded-xl border border-[#bcc9c6]/60 p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#bcc9c6]/30 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">lock</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0b1c30]">Rekam Medis SOAP</p>
            <p className="text-xs text-[#3d4947] mt-0.5">
              {medicalRecord
                ? 'Rekam medis sudah diisi. Hanya terapis yang menangani dapat mengedit.'
                : 'Form SOAP hanya dapat diisi oleh terapis yang menangani kunjungan ini.'}
            </p>
          </div>
        </div>
      )}

      {medicalRecord && !canEditSoap && (
        <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#0b1c30] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[18px]">description</span>
            Rekam Medis (Hanya Baca)
          </h2>
          <div className="space-y-4 text-sm">
            {[
              { label: 'S — Subjective',       value: medicalRecord.subjective },
              { label: 'O — Objective',         value: medicalRecord.objective },
              { label: 'A — Assessment',        value: medicalRecord.assessment },
              { label: 'P — Plan',              value: medicalRecord.plan },
              { label: 'Tindakan Terapi',       value: medicalRecord.therapy_action },
              { label: 'Catatan Perkembangan',  value: medicalRecord.progress_notes },
            ].map(({ label, value }) => (
              <div key={label} className="border-b border-[#bcc9c6]/30 pb-3 last:border-0">
                <p className="text-xs text-[#3d4947] font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[#0b1c30] whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}