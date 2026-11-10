'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BillingForm } from '@/components/ui-custom/BillingForm';
import { useCreateBilling } from '@/hooks/useBilling';
import { useToast } from '@/components/ui-custom/Toast';
import type { BillingFormData } from '@/types/billing';
import axios from 'axios';

export default function NewBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const patientIdParam = searchParams.get('patient_id');
  const visitIdParam = searchParams.get('visit_id');
  const initialPatientId = patientIdParam ? Number(patientIdParam) : undefined;
  const initialVisitId = visitIdParam ? Number(visitIdParam) : undefined;

  const toast = useToast();
  const { mutateAsync: createBilling, isPending } = useCreateBilling();

  async function handleSubmit(data: BillingFormData) {
    try {
      const billing = await createBilling(data);
      toast.success('Invoice berhasil dibuat', 'Data tagihan telah tersimpan.');
      router.push(`/billing/${billing.id}`);
    } catch (err: unknown) {
      let errMsg = 'Terjadi kesalahan. Silakan periksa kembali data Anda.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      toast.error('Gagal membuat invoice', errMsg);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={from === 'dashboard' ? '/dashboard' : '/billing'}
          className="p-2 rounded-xl border border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Buat Invoice Baru</h1>
          <p className="text-sm text-[#3d4947] mt-0.5">Isi detail tagihan dan penggunaan paket terapi pasien</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-[#bcc9c6]/60 shadow-sm p-6 sm:p-7">
        <BillingForm
          onSubmit={handleSubmit}
          isLoading={isPending}
          initialPatientId={initialPatientId}
          initialVisitId={initialVisitId}
        />
      </div>
    </div>
  );
}