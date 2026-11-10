'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PatientForm } from '@/components/ui-custom/PatientForm';
import { useCreatePatient } from '@/hooks/usePatients';
import { useToast } from '@/components/ui-custom/Toast';
import { PatientFormData } from '@/types/patient';

export default function NewPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createPatient = useCreatePatient();
  const toast = useToast();

  const from = searchParams.get('from');
  const backHref = from === 'dashboard' ? '/dashboard' : '/patients';

  const handleSubmit = async (data: PatientFormData) => {
    try {
      await createPatient.mutateAsync(data);
      toast.success('Pasien berhasil didaftarkan', 'Data pasien telah tersimpan.');
      router.push(from === 'dashboard' ? '/dashboard' : '/patients');
    } catch {
      toast.error('Gagal menyimpan data', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} className="p-2 rounded-lg text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30]">Tambah Pasien Baru</h2>
          <p className="text-sm text-[#3d4947] mt-0.5">Isi data pasien dengan lengkap dan benar.</p>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <PatientForm
          onSubmit={handleSubmit}
          isLoading={createPatient.isPending}
          submitLabel="Daftarkan Pasien"
        />
      </div>
    </div>
  );
}
