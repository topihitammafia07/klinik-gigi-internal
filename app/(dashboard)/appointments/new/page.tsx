'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppointmentForm } from '@/components/ui-custom/AppointmentForm';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/components/ui-custom/Toast';
import type { AppointmentFormData } from '@/types/appointment';

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { mutateAsync: createAppointment, isPending } = useCreateAppointment();
  const [apiErrors, setApiErrors] = useState<Record<string, string> | undefined>();

  const from = searchParams.get('from');
  const patientId = searchParams.get('patient_id');

  const backHref =
    from === 'patients' && patientId
      ? `/patients/${patientId}?from=patients`
      : from === 'dashboard'
      ? '/dashboard'
      : '/appointments';

  async function handleSubmit(data: AppointmentFormData) {
    setApiErrors(undefined);
    try {
      await createAppointment(data);
      toast.success('Jadwal berhasil dibuat', 'Appointment telah disimpan.');
      if (from === 'patients' && patientId) {
        router.push(`/patients/${patientId}?from=patients`);
      } else if (from === 'dashboard') {
        router.push('/dashboard');
      } else {
        router.push('/appointments');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const errData = axiosErr?.response?.data;
      if (errData?.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(errData.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setApiErrors(mapped);
        toast.error('Jadwal tidak dapat disimpan', errData.message ?? 'Periksa kembali isian form.');
      } else {
        setApiErrors({ message: errData?.message ?? 'Terjadi kesalahan. Silakan coba lagi.' });
        toast.error('Gagal membuat jadwal', errData?.message ?? 'Terjadi kesalahan. Silakan coba lagi.');
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-2 rounded-xl border border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Buat Jadwal Baru</h1>
          <p className="text-sm text-[#3d4947] mt-0.5">Isi detail sesi terapi pasien</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/60 shadow-sm p-6">
        <AppointmentForm
          onSubmit={handleSubmit}
          isLoading={isPending}
          apiErrors={apiErrors}
          defaultPatientId={patientId ? parseInt(patientId) : undefined}
        />
      </div>
    </div>
  );
}