'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { UserForm } from '@/components/ui-custom/UserForm';
import type { UserFormData } from '@/types/user';

// Owner is a single special role — never reassignable through this UI
const ASSIGNABLE_ROLES: Record<string, Array<'pj_klinik' | 'resepsionis' | 'terapis'>> = {
  owner: ['pj_klinik', 'resepsionis', 'terapis'],
  pj_klinik: ['pj_klinik', 'resepsionis', 'terapis'],
};

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const { data: member, isLoading, isError } = useUser(id);
  const updateUser = useUpdateUser(id);

  const allowedRoles = ASSIGNABLE_ROLES[currentUser?.role ?? ''] ?? ['resepsionis', 'terapis'];

  // Batch 2: reset password PJ/Resepsionis/Terapis dilakukan melalui Owner.
  // PJ tetap dapat mengelola data staff sesuai flow Batch 1, tetapi tidak password.
  const canEditPassword = currentUser?.role === 'owner';

  const handleSubmit = async (formData: UserFormData) => {
    try {
      // Only send password if it was actually filled in
      const payload: Partial<UserFormData> = {
        ...formData,
        password: formData.password || undefined,
        phone: formData.phone || undefined,
        specialization: formData.specialization || undefined,
        str_number: formData.str_number || undefined,
        sip_number: formData.sip_number || undefined,
      };

      await updateUser.mutateAsync(payload);
      success('Data diperbarui', `Data ${formData.name} berhasil diperbarui.`);
      router.push(`/users/${id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui data.';
      error('Gagal menyimpan', msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 max-w-3xl">
        <div className="h-8 w-64 bg-[#eff4ff] rounded-xl animate-pulse" />
        <div className="h-64 bg-[#eff4ff] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#bcc9c6]">person_off</span>
        <h2 className="text-xl font-bold text-[#0b1c30]">Anggota tidak ditemukan</h2>
        <Link href="/users" className="text-sm text-[#00685f] hover:underline font-medium">
          ← Kembali ke daftar tim
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#6d7a77] mb-3">
          <Link href="/users" className="hover:text-[#00685f] transition-colors">Kelola Tim</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href={`/users/${id}`} className="hover:text-[#00685f] transition-colors">{member.name}</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#0b1c30] font-medium">Edit</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/users/${id}`}
            className="p-2 rounded-xl border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors"
            title="Kembali ke detail anggota"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Edit Anggota</h2>
            <p className="text-sm text-[#3d4947] mt-1">Perbarui informasi akun untuk {member.name}.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <UserForm
        defaultValues={member}
        onSubmit={handleSubmit as never}
        isLoading={updateUser.isPending}
        isEdit
        allowedRoles={allowedRoles}
        canEditPassword={canEditPassword}
      />

    </div>
  );
}