'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateUser } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { UserForm } from '@/components/ui-custom/UserForm';
import type { UserFormData } from '@/types/user';
import type { Role } from '@/types/auth';

// Owner is a single special role — never assignable through this UI
const ASSIGNABLE_ROLES: Record<string, Array<'pj_klinik' | 'resepsionis' | 'terapis'>> = {
  owner: ['pj_klinik', 'resepsionis', 'terapis'],
  pj_klinik: ['pj_klinik', 'resepsionis', 'terapis'],
};

export default function NewUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();
  const createUser = useCreateUser();

  const allowedRoles = ASSIGNABLE_ROLES[user?.role ?? ''] ?? ['resepsionis', 'terapis'];

  const handleSubmit = async (formData: UserFormData) => {
    try {
      const payload: UserFormData = {
        ...formData,
        // Strip empty strings so backend validation doesn't fail on optional fields
        password: formData.password || undefined,
        phone: formData.phone || undefined,
        specialization: formData.specialization || undefined,
        str_number: formData.str_number || undefined,
        sip_number: formData.sip_number || undefined,
      };

      await createUser.mutateAsync(payload);
      success('Anggota ditambahkan', `${formData.name} berhasil ditambahkan ke tim.`);
      router.push('/users');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan anggota.';
      error('Gagal menyimpan', msg);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#6d7a77] mb-3">
          <Link href="/users" className="hover:text-[#00685f] transition-colors">
            Kelola Tim
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#0b1c30] font-medium">Tambah Anggota Baru</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="p-2 rounded-xl border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors"
            title="Kembali ke daftar tim"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Tambah Anggota Tim</h2>
            <p className="text-sm text-[#3d4947] mt-1">
              Lengkapi informasi berikut untuk membuat akun anggota tim baru.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <UserForm
        onSubmit={handleSubmit as never}
        isLoading={createUser.isPending}
        isEdit={false}
        allowedRoles={allowedRoles}
      />

    </div>
  );
}