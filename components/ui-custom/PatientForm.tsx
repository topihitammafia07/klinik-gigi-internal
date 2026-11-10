'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Patient, PatientFormData } from '@/types/patient';
import { cn } from '@/lib/utils';

const patientSchema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  gender: z.enum(['male', 'female'], { error: 'Pilih jenis kelamin' }),
  birth_date: z.string().min(1, 'Tanggal lahir wajib diisi'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit').max(20),
  parent_name: z.string().optional(),
  emergency_contact: z.string().optional(),
  allergy_notes: z.string().optional(),
  patient_since: z.string().optional(),
});

type PatientSchema = z.infer<typeof patientSchema>;

interface PatientFormProps {
  defaultValues?: Partial<Patient>;
  onSubmit: (data: PatientFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
  /** Mode edit pasien existing — sembunyikan field patient_since (diubah lewat PatientSinceModal di list). */
  isEdit?: boolean;
}

export function PatientForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Simpan', isEdit = false }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientSchema>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || '',
      gender: defaultValues?.gender,
      birth_date: defaultValues?.birth_date || '',
      address: defaultValues?.address || '',
      phone: defaultValues?.phone || '',
      parent_name: defaultValues?.parent_name || '',
      emergency_contact: defaultValues?.emergency_contact || '',
      allergy_notes: defaultValues?.allergy_notes || '',
      patient_since: defaultValues?.patient_since || '',
    },
  });

  const handleFormSubmit = (data: PatientSchema) => {
    onSubmit({
      ...data,
      // String kosong -> undefined, biar backend pakai default (hari ini / pasien baru)
      patient_since: data.patient_since || undefined,
    });
  };

  const inputClass = (hasError: boolean) => cn(
    'w-full h-11 px-4 rounded-xl border text-sm text-[#0b1c30] bg-white',
    'focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors',
    hasError ? 'border-[#ba1a1a] bg-[#ffdad6]/20' : 'border-[#bcc9c6]'
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Nama Lengkap <span className="text-[#ba1a1a]">*</span>
          </label>
          <input {...register('full_name')} className={inputClass(!!errors.full_name)} placeholder="Masukkan nama lengkap" />
          {errors.full_name && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.full_name.message}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Jenis Kelamin <span className="text-[#ba1a1a]">*</span>
          </label>
          <select {...register('gender')} className={cn(inputClass(!!errors.gender), 'cursor-pointer')}>
            <option value="">Pilih jenis kelamin</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select>
          {errors.gender && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.gender.message}</p>}
        </div>

        {/* Birth date */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Tanggal Lahir <span className="text-[#ba1a1a]">*</span>
          </label>
          <input type="date" {...register('birth_date')} className={inputClass(!!errors.birth_date)} />
          {errors.birth_date && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.birth_date.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            No. Telepon <span className="text-[#ba1a1a]">*</span>
          </label>
          <input {...register('phone')} className={inputClass(!!errors.phone)} placeholder="08xxxxxxxxxx" />
          {errors.phone && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.phone.message}</p>}
        </div>

        {/* Parent name */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Nama Orang Tua / Wali <span className="text-xs text-[#3d4947] font-normal">(untuk pasien anak)</span>
          </label>
          <input {...register('parent_name')} className={inputClass(false)} placeholder="Opsional" />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
            Alamat <span className="text-[#ba1a1a]">*</span>
          </label>
          <textarea
            {...register('address')}
            rows={3}
            className={cn(inputClass(!!errors.address), 'h-auto resize-none py-3')}
            placeholder="Masukkan alamat lengkap"
          />
          {errors.address && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.address.message}</p>}
        </div>

        {/* Emergency contact */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">Kontak Darurat</label>
          <input {...register('emergency_contact')} className={inputClass(false)} placeholder="Opsional" />
        </div>

        {/* Allergy notes */}
        <div>
          <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">Catatan Alergi</label>
          <input {...register('allergy_notes')} className={inputClass(false)} placeholder="Opsional" />
        </div>

        {/* Patient since — migrasi pasien lama (hanya saat create) */}
        {!isEdit && (
          <div className="md:col-span-2 p-4 rounded-xl bg-[#eff4ff]/60 border border-[#bcc9c6]/30">
            <label className="block text-sm font-medium text-[#0b1c30] mb-1.5">
              Terdaftar Sejak <span className="text-xs text-[#3d4947] font-normal">(opsional)</span>
            </label>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              {...register('patient_since')}
              className={inputClass(!!errors.patient_since)}
            />
            {errors.patient_since && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.patient_since.message}</p>}
            <p className="mt-1.5 text-xs text-[#3d4947]">
              Kosongkan jika ini pasien baru. Isi tanggal ini hanya untuk memasukkan data pasien lama
              dari sistem sebelumnya (klinik sudah berjalan lama), supaya statusnya langsung tercatat
              sebagai <span className="font-medium">Pasien Lama</span> sesuai tanggal terdaftar aslinya.
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="gradient-btn h-11 px-8 text-white rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isLoading ? 'Menyimpan...' : submitLabel}
        </button>
      </div>
    </form>
  );
}