'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PatientForm } from '@/components/ui-custom/PatientForm';
import { usePatient, useUpdatePatient } from '@/hooks/usePatients';
import { useToast } from '@/components/ui-custom/Toast';
import { PatientFormData } from '@/types/patient';

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const patientId = parseInt(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data: patient, isLoading } = usePatient(patientId);
  const updatePatient = useUpdatePatient(patientId);

  const from = searchParams.get('from') ?? 'patients';

  const handleSubmit = async (data: PatientFormData) => {
    try {
      await updatePatient.mutateAsync(data);
      toast.success('Data pasien diperbarui', 'Perubahan telah tersimpan.');
      router.push(`/patients/${patientId}?from=${from}`);
    } catch {
      toast.error('Gagal memperbarui data', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16 text-[#3d4947]">
        Pasien tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href={`/patients/${patientId}?from=${from}`}
          className="p-2 rounded-lg text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30]">Edit Data Pasien</h2>
          <p className="text-sm text-[#3d4947] mt-0.5">{patient.full_name} · {patient.medical_record_number}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8">
        <PatientForm
          defaultValues={patient}
          onSubmit={handleSubmit}
          isLoading={updatePatient.isPending}
          submitLabel="Simpan Perubahan"
          isEdit
        />
      </div>
    </div>
  );
}