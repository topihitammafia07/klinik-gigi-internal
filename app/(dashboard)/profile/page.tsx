'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { ProfileForm, type ProfileFormValues } from '@/components/ui-custom/ProfileForm';
import { useUpdateProfile } from '@/hooks/useProfile';

export default function ProfilePage() {
  const { user, updateUser, hasRole } = useAuth();
  const { success, error } = useToast();
  const updateProfile = useUpdateProfile();

  if (!user) return null;

  const canEditPassword = hasRole('owner');

  const handleSubmit = async (formData: ProfileFormValues) => {
    try {
      const payload: Partial<ProfileFormValues> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
      };

      // Password hanya dikirim jika field diisi DAN role adalah Owner
      if (canEditPassword && formData.password) {
        payload.password = formData.password;
        payload.current_password = formData.current_password;
      }

      const updated = await updateProfile.mutateAsync(payload);
      if (updated) {
        updateUser({
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        });
      }
      success('Profil diperbarui', 'Perubahan data profil Anda berhasil disimpan.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui profil.';
      error('Gagal menyimpan', msg);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#6d7a77] mb-3">
          <span className="text-[#0b1c30] font-medium">Profil Saya</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#00685f] text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Profil Saya</h2>
            <p className="text-sm text-[#3d4947] mt-1">Kelola informasi akun pribadi Anda.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ProfileForm
        currentUser={user}
        onSubmit={handleSubmit}
        isLoading={updateProfile.isPending}
        canEditPassword={canEditPassword}
      />

    </div>
  );
}