'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePatient } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { calculateAge } from '@/lib/utils';
import { TreatmentPackagesSection } from '@/components/ui-custom/TreatmentPackagesSection';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const patientId = parseInt(id);
  const { data: patient, isLoading, isError } = usePatient(patientId);
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();

  // ?from= tells us which tab user came from (e.g. "medical-records")
  // We pass it forward so the back button and links carry context
  const from = searchParams.get('from') ?? 'patients';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="text-center py-16">
        <p className="text-[#ba1a1a]">Pasien tidak ditemukan atau terjadi kesalahan.</p>
        <Link href={`/${from}`} className="mt-4 inline-block text-[#00685f] hover:underline text-sm">
          ← Kembali
        </Link>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-[#3d4947] font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#0b1c30]">{value || '-'}</p>
    </div>
  );

  // Back destination: back to where user came from, preserving ?from if needed
  const backHref = from === 'patients' ? '/patients' : `/${from}`;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="p-2 rounded-lg text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">Detail Pasien</h2>
            <p className="text-sm text-[#3d4947] mt-0.5">
              <span className="font-mono bg-[#eff4ff] text-[#0058be] px-1.5 py-0.5 rounded text-xs">
                {patient.medical_record_number}
              </span>
            </p>
          </div>
        </div>
        {hasRole('owner', 'pj_klinik', 'resepsionis') && (
          <Link
            href={`/patients/${patientId}/edit?from=${from}`}
            className="flex items-center gap-2 px-4 py-2 border border-[#00685f] text-[#00685f] rounded-lg text-sm font-semibold hover:bg-[#00685f]/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Data
          </Link>
        )}
      </div>

      {/* Profile card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[#bcc9c6]">
          <div className="w-16 h-16 rounded-2xl bg-[#00685f]/20 text-[#00685f] flex items-center justify-center text-2xl font-bold">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#0b1c30]">{patient.full_name}</h3>
            <p className="text-sm text-[#3d4947] mt-0.5">
              {patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'} ·{' '}
              {format(new Date(patient.birth_date), 'd MMMM yyyy', { locale: idLocale })}
            </p>
            <p className="text-sm text-[#00685f] font-medium mt-0.5">
              {calculateAge(patient.birth_date)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hasRole('owner', 'resepsionis') && (
            <InfoRow label="No. Telepon" value={patient.phone} />
          )}
          <InfoRow label="Kontak Darurat" value={patient.emergency_contact} />
          <InfoRow label="Nama Orang Tua / Wali" value={patient.parent_name} />
          <div className="sm:col-span-2">
            <InfoRow label="Alamat" value={patient.address} />
          </div>
          <InfoRow label="Catatan Alergi" value={patient.allergy_notes} />
          <InfoRow
            label="Terdaftar"
            value={format(new Date(patient.created_at), 'd MMMM yyyy', { locale: idLocale })}
          />
        </div>
      </div>

      {/* Quick actions — pass ?from=patients so each destination knows to come back here */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Buat Appointment',
            icon: 'event_available',
            // After making appointment, user expects to return to this patient detail
            href: `/appointments/new?patient_id=${patientId}&from=patients`,
            roles: ['owner', 'pj_klinik', 'resepsionis'],
          },
          {
            label: 'Riwayat Kunjungan',
            icon: 'history',
            href: `/visits?patient_id=${patientId}&from=patients`,
            roles: ['owner', 'pj_klinik', 'resepsionis', 'terapis'],
          },
          {
            label: 'Rekam Medis',
            icon: 'description',
            // Pass from=patients so the records back button returns here
            href: `/patients/${patientId}/records?from=patients`,
            roles: ['owner', 'pj_klinik', 'terapis'],
          },
        ].filter(a => hasRole(...a.roles)).map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="glass-card rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:border-[#00685f]/30 hover:text-[#00685f] transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-[#3d4947] group-hover:text-[#00685f] transition-colors">
              {action.icon}
            </span>
            <span className="text-sm font-medium text-[#3d4947] group-hover:text-[#00685f] transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Paket Terapi */}
      <TreatmentPackagesSection patientId={patientId} />
    </div>
  );
}