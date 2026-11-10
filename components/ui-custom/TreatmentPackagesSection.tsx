'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { useTherapyServices } from '@/hooks/useBilling';
import {
  useTreatmentPackages,
  useCreateTreatmentPackage,
  useUpdateTreatmentPackage,
  useCancelTreatmentPackage,
} from '@/hooks/useTreatmentPackages';
import type { TreatmentPackage } from '@/types/treatment-package';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const statusBadge: Record<TreatmentPackage['status'], string> = {
  active: 'bg-[#00685f]/10 text-[#00685f]',
  completed: 'bg-[#0058be]/10 text-[#0058be]',
  expired: 'bg-[#3d4947]/10 text-[#3d4947]',
  cancelled: 'bg-[#ba1a1a]/10 text-[#ba1a1a]',
};

const statusLabel: Record<TreatmentPackage['status'], string> = {
  active: 'Aktif',
  completed: 'Selesai',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
};

// ─── New Package Form Schema ────────────────────────────────

const packageSchema = z.object({
  service_id: z.number({ error: 'Pilih layanan' }).min(1, 'Pilih layanan'),
  name: z.string().min(1, 'Nama paket wajib diisi'),
  total_sessions: z.number({ error: 'Wajib angka' }).min(1, 'Minimal 1 sesi'),
  price_total: z.number({ error: 'Wajib angka' }).min(0, 'Tidak boleh negatif'),
  payment_status: z.enum(['paid', 'partial', 'unpaid']),
});

type PackageSchema = z.infer<typeof packageSchema>;

// ─── Edit Package Form Schema ───────────────────────────────
// Sengaja tidak termasuk total_sessions/used_sessions/status — angka sesi
// hanya boleh berubah lewat redeem (billing) atau cancel.

const editPackageSchema = z.object({
  name: z.string().min(1, 'Nama paket wajib diisi'),
  price_total: z.number({ error: 'Wajib angka' }).min(0, 'Tidak boleh negatif'),
  payment_status: z.enum(['paid', 'partial', 'unpaid']),
  notes: z.string().optional(),
});

type EditPackageSchema = z.infer<typeof editPackageSchema>;

interface Props {
  patientId: number;
}

export function TreatmentPackagesSection({ patientId }: Props) {
  const { hasRole } = useAuth();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: packagesData, isLoading } = useTreatmentPackages({ patient_id: patientId });
  const { data: services = [] } = useTherapyServices();
  const { mutateAsync: createPackage, isPending: isCreating } = useCreateTreatmentPackage();
  const { mutateAsync: cancelPackage, isPending: isCancelling } = useCancelTreatmentPackage();
  const { confirm, dialogProps } = useConfirmDialog();

  const packages = packagesData?.data ?? [];
  const canManage = hasRole('owner', 'pj_klinik', 'resepsionis');
  const canCancel = hasRole('owner');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PackageSchema>({
    resolver: zodResolver(packageSchema),
    defaultValues: { service_id: 0, name: '', total_sessions: 1, price_total: 0, payment_status: 'unpaid' },
  });

  const priceTotal = watch('price_total');

  async function onSubmit(data: PackageSchema) {
    try {
      await createPackage({ ...data, patient_id: patientId });
      toast.success('Paket berhasil dibuat', 'Paket terapi baru telah tersimpan.');
      reset();
      setShowForm(false);
    } catch {
      toast.error('Gagal membuat paket', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  function handleCancel(pkg: TreatmentPackage) {
    confirm({
      title: `Batalkan paket "${pkg.name}"?`,
      variant: 'warning',
      confirmLabel: 'Ya, Batalkan',
      onConfirm: async () => {
        try {
          await cancelPackage(pkg.id);
          toast.success('Paket dibatalkan', 'Paket terapi telah dibatalkan.');
        } catch {
          toast.error('Gagal membatalkan', 'Paket mungkin sudah punya sesi terpakai.');
        }
      },
    });
  }

  const inputCls = (err?: boolean) =>
    cn(
      'w-full h-10 px-3 rounded-xl border text-sm text-[#0b1c30] bg-white transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]',
      err ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]'
    );

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-[#0b1c30]">Paket Terapi</h3>
        {canManage && (
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00685f] text-white text-xs font-semibold rounded-lg hover:bg-[#008378] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Batal' : 'Buat Paket Baru'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6 pb-6 border-b border-[#bcc9c6]/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#0b1c30] mb-1.5">Layanan</label>
              <select {...register('service_id', { valueAsNumber: true })} className={cn(inputCls(!!errors.service_id))}>
                <option value={0}>Pilih layanan...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.service_id && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.service_id.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0b1c30] mb-1.5">Nama Paket</label>
              <input type="text" {...register('name')} placeholder="cth. Paket Okupasi Terapi 4x" className={inputCls(!!errors.name)} />
              {errors.name && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0b1c30] mb-1.5">Jumlah Sesi</label>
              <input type="number" min={1} {...register('total_sessions', { valueAsNumber: true })} className={inputCls(!!errors.total_sessions)} />
              {errors.total_sessions && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.total_sessions.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0b1c30] mb-1.5">Total Harga (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6d7a77]">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(priceTotal)}
                  onChange={(e) => {
                    const parsed = parseNumberFromDots(e.target.value);
                    setValue('price_total', parsed, { shouldValidate: true });
                  }}
                  placeholder="0"
                  className={cn(inputCls(!!errors.price_total), 'pl-9 font-semibold')}
                />
              </div>
              {errors.price_total && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.price_total.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0b1c30] mb-1.5">Status Pembayaran</label>
              <select {...register('payment_status')} className={inputCls()}>
                <option value="unpaid">Belum Bayar</option>
                <option value="partial">Sebagian</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="h-10 px-6 gradient-btn text-white rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {isCreating ? 'Menyimpan...' : 'Simpan Paket'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <p className="text-sm text-[#3d4947] text-center py-6">Belum ada paket terapi untuk pasien ini.</p>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) =>
            editingId === pkg.id ? (
              <EditPackageRow key={pkg.id} pkg={pkg} onDone={() => setEditingId(null)} />
            ) : (
              <div key={pkg.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#bcc9c6]/40 bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0b1c30]">{pkg.name}</p>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusBadge[pkg.status])}>
                      {statusLabel[pkg.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[#3d4947] mt-1">
                    {pkg.service?.name} • {formatRupiah(pkg.price_total)} • {pkg.payment_status}
                  </p>
                  {pkg.notes && <p className="text-xs text-[#3d4947]/70 mt-0.5 italic">{pkg.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#00685f]/10 text-[#00685f] whitespace-nowrap">
                    Sisa {pkg.remaining_sessions} sesi
                  </span>
                  {canManage && pkg.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(pkg.id); setShowForm(false); }}
                      className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#00685f] hover:bg-[#00685f]/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                  {canCancel && pkg.status === 'active' && pkg.used_sessions === 0 && (
                    <button
                      type="button"
                      onClick={() => handleCancel(pkg)}
                      disabled={isCancelling}
                      className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ─── Inline edit row ─────────────────────────────────────────
// Hanya field administratif (nama, harga, status bayar, catatan) — jumlah
// sesi tidak bisa diubah di sini, sesuai aturan integritas redeem paket.

function EditPackageRow({ pkg, onDone }: { pkg: TreatmentPackage; onDone: () => void }) {
  const toast = useToast();
  const { mutateAsync: updatePackage, isPending } = useUpdateTreatmentPackage(pkg.id);

  // Begitu paket sudah punya invoice terhubung (redeem/billing), payment_status
  // dikelola otomatis oleh backend mengikuti status invoice — field ini dikunci
  // supaya form tidak menimpa balik ke nilai lama saat disubmit.
  const isPaymentStatusLocked = (pkg.used_sessions ?? 0) > 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditPackageSchema>({
    resolver: zodResolver(editPackageSchema),
    defaultValues: {
      name: pkg.name,
      price_total: pkg.price_total,
      payment_status: pkg.payment_status,
      notes: pkg.notes ?? '',
    },
  });

  const editPriceTotal = watch('price_total');

  async function onSubmit(data: EditPackageSchema) {
    try {
      await updatePackage(data);
      toast.success('Paket diperbarui', 'Perubahan paket telah tersimpan.');
      onDone();
    } catch {
      toast.error('Gagal memperbarui', 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  const inputCls = (err?: boolean) =>
    cn(
      'w-full h-10 px-3 rounded-xl border text-sm text-[#0b1c30] bg-white transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f]',
      err ? 'border-[#ba1a1a] bg-[#ffdad6]/10' : 'border-[#bcc9c6]'
    );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 rounded-xl border-2 border-[#00685f]/30 bg-[#00685f]/5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0b1c30]">Edit Paket — {pkg.service?.name}</p>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-[#00685f]">
          Sisa {pkg.remaining_sessions} / {pkg.total_sessions} sesi (tidak bisa diubah di sini)
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#0b1c30] mb-1">Nama Paket</label>
          <input type="text" {...register('name')} className={inputCls(!!errors.name)} />
          {errors.name && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#0b1c30] mb-1">Total Harga (Rp)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6d7a77]">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberWithDots(editPriceTotal)}
              onChange={(e) => {
                const parsed = parseNumberFromDots(e.target.value);
                setValue('price_total', parsed, { shouldValidate: true });
              }}
              placeholder="0"
              className={cn(inputCls(!!errors.price_total), 'pl-9 font-semibold')}
            />
          </div>
          {errors.price_total && <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.price_total.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#0b1c30] mb-1">Status Pembayaran</label>
          <select
            {...register('payment_status')}
            className={inputCls()}
            disabled={isPaymentStatusLocked}
          >
            <option value="unpaid">Belum Bayar</option>
            <option value="partial">Sebagian</option>
            <option value="paid">Lunas</option>
          </select>
          {isPaymentStatusLocked && (
            <p className="mt-1 text-[11px] text-[#3d4947]">
              Mengikuti status invoice, tidak bisa diubah manual.
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0b1c30] mb-1">Catatan</label>
        <textarea {...register('notes')} rows={2} className={cn(inputCls(), 'h-auto py-2 resize-none')} />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-9 px-4 rounded-xl border border-[#bcc9c6] text-sm font-semibold text-[#3d4947] hover:bg-white transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-5 gradient-btn text-white rounded-xl font-semibold text-sm disabled:opacity-60"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}