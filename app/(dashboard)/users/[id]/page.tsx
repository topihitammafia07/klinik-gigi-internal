'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUser, useDeleteUser, useResetUserPassword } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/user';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ResetPasswordModal } from '@/components/ui-custom/ResetPasswordModal';
import { useState, useEffect } from 'react';
import { TherapistScheduleCard } from '@/components/ui-custom/TherapistScheduleCard';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { hasRole, user: currentUser } = useAuth();
  const { success, error } = useToast();

  const { data: member, isLoading, isError } = useUser(id);
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword(id);
  const { confirm, dialogProps } = useConfirmDialog();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'schedule' | 'profile' | 'access'>('schedule');

  useEffect(() => {
    if (!member) return;
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'schedule' && member.role === 'terapis') setActiveTab('schedule');
      else if (hash === 'profile') setActiveTab('profile');
      else if (hash === 'access') setActiveTab('access');
    } else {
      setActiveTab(member.role === 'terapis' ? 'schedule' : 'profile');
    }
  }, [member]);

  const handleDelete = () => {
    if (!member) return;
    if (member.id === currentUser?.id) {
      error('Tidak dapat menghapus', 'Anda tidak dapat menghapus akun sendiri.');
      return;
    }
    confirm({
      title: `Hapus anggota ${member.name}?`,
      description: 'Tindakan ini tidak dapat dibatalkan.',
      variant: 'danger',
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await deleteUser.mutateAsync(member.id);
          success('Anggota dihapus', `${member.name} berhasil dihapus dari sistem.`);
          router.push('/users');
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Gagal menghapus anggota.';
          error('Gagal menghapus', msg);
        }
      },
    });
  };

  const handleResetPassword = async (password: string, passwordConfirmation: string) => {
    if (!member) return;
    try {
      await resetPassword.mutateAsync({
        password,
        password_confirmation: passwordConfirmation,
      });
      setResetPasswordOpen(false);
      success('Password direset', `Password ${member.name} berhasil diperbarui oleh Owner.`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mereset password.';
      error('Gagal reset password', msg);
    }
  };

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <div className="h-8 w-64 bg-[#eff4ff] rounded-xl animate-pulse" />
        <div className="h-44 bg-[#eff4ff] rounded-2xl animate-pulse" />
        <div className="h-12 w-96 bg-[#eff4ff] rounded-xl animate-pulse" />
        <div className="h-64 bg-[#eff4ff] rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ─── Error / Not Found ───
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

  const roleColors = ROLE_COLORS[member.role] ?? { bg: 'bg-[#eff4ff]', text: 'text-[#3d4947]' };
  const isTherapist = member.role === 'terapis';

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/users"
          className="p-2 rounded-xl border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] hover:text-[#00685f] transition-colors"
          title="Kembali ke daftar tim"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#6d7a77]">
          <Link href="/users" className="hover:text-[#00685f] transition-colors">Kelola Tim</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#0b1c30] font-medium">{member.name}</span>
        </div>
      </div>

      {/* ── Elevated Profile Header Card ── */}
      <div className="rounded-2xl border border-[#bcc9c6]/30 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          {/* Avatar + Basic Details */}
          <div className="flex items-start gap-4">
            {member.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photo_url}
                alt={member.name}
                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-[#bcc9c6]/30 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#00685f]/15 text-[#00685f] flex items-center justify-center text-2xl font-bold flex-shrink-0 border border-[#00685f]/20">
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-[#0b1c30]">{member.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors.bg} ${roleColors.text}`}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    member.status === 'active'
                      ? 'bg-[#dcfce7] text-[#14532d]'
                      : 'bg-[#f1f5f9] text-[#3d4947]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-[#14532d]' : 'bg-[#6d7a77]'}`} />
                  {member.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Quick Contact & Spec Chips */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#3d4947]">
                <div className="flex items-center gap-1.5 bg-[#f8f9ff] px-2.5 py-1 rounded-lg border border-[#bcc9c6]/20">
                  <span className="material-symbols-outlined text-[15px] text-[#00685f]">mail</span>
                  <span>{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-1.5 bg-[#f8f9ff] px-2.5 py-1 rounded-lg border border-[#bcc9c6]/20">
                    <span className="material-symbols-outlined text-[15px] text-[#00685f]">call</span>
                    <span>{member.phone}</span>
                  </div>
                )}
                {isTherapist && member.therapist_profile?.specialization && (
                  <div className="flex items-center gap-1.5 bg-[#00685f]/10 text-[#00685f] px-2.5 py-1 rounded-lg font-medium">
                    <span className="material-symbols-outlined text-[15px]">medical_services</span>
                    <span>{member.therapist_profile.specialization}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Link
              href={`/users/${id}/edit`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-[#bcc9c6]/40 text-[#00685f] text-xs font-semibold hover:bg-[#eff4ff] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit
            </Link>
            {hasRole('owner') && member.role !== 'owner' && (
              <button
                type="button"
                onClick={() => setResetPasswordOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-[#bcc9c6]/40 text-[#00685f] text-xs font-semibold hover:bg-[#eff4ff] transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                Reset Password
              </button>
            )}
            {hasRole('owner') && member.id !== currentUser?.id && (
              <button
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-[#ffdad6] text-[#ba1a1a] text-xs font-semibold hover:bg-[#ffdad6] transition-colors shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modern Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-[#bcc9c6]/20 pb-1 overflow-x-auto">
        {isTherapist && (
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[#00685f] text-white shadow-sm'
                : 'bg-white text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Jadwal Shift & Cuti Terapis</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>{isTherapist ? 'Profil Terapis & Legalitas STR' : 'Informasi Kontak & Akun'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'access'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">lock_person</span>
          <span>Hak Akses Sistem</span>
        </button>
      </div>

      {/* ── Tab Content 1: Jadwal Shift & Cuti (Therapist Only) ── */}
      {isTherapist && activeTab === 'schedule' && (
        <div id="schedule" className="space-y-4">
          <TherapistScheduleCard therapistId={member.id} />
        </div>
      )}

      {/* ── Tab Content 2: Profil & Legalitas STR ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Contact Info Card */}
          <div className="rounded-2xl border border-[#bcc9c6]/30 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#00685f]">contact_mail</span>
              Informasi Akun & Kontak
            </h3>
            <div className="divide-y divide-[#bcc9c6]/15">
              <div className="py-2.5 flex justify-between items-center text-sm">
                <span className="text-xs text-[#6d7a77]">Email Login</span>
                <span className="font-semibold text-[#0b1c30]">{member.email}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-sm">
                <span className="text-xs text-[#6d7a77]">Nomor Telepon</span>
                <span className="font-semibold text-[#0b1c30]">{member.phone ?? '—'}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-sm">
                <span className="text-xs text-[#6d7a77]">Login Terakhir</span>
                <span className="font-semibold text-[#0b1c30]">
                  {member.last_login
                    ? format(new Date(member.last_login), 'd MMM yyyy, HH:mm', { locale: idLocale })
                    : 'Belum pernah login'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-sm">
                <span className="text-xs text-[#6d7a77]">Terdaftar Sejak</span>
                <span className="font-semibold text-[#0b1c30]">
                  {format(new Date(member.created_at), 'd MMMM yyyy', { locale: idLocale })}
                </span>
              </div>
            </div>
          </div>

          {/* Therapist Profile Card (if therapist) */}
          {isTherapist ? (
            <div className="rounded-2xl border border-[#bcc9c6]/30 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#00685f]">verified</span>
                Profil Profesional & STR
              </h3>
              {member.therapist_profile ? (
                <div className="divide-y divide-[#bcc9c6]/15">
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="text-xs text-[#6d7a77]">Spesialisasi Klinis</span>
                    <span className="font-semibold text-[#00685f]">
                      {member.therapist_profile.specialization ?? '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="text-xs text-[#6d7a77]">Nomor STR</span>
                    <span className="font-mono text-xs font-bold text-[#0b1c30] bg-[#f8f9ff] px-2 py-0.5 rounded border border-[#bcc9c6]/20">
                      {member.therapist_profile.str_number ?? '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="text-xs text-[#6d7a77]">Nomor SIP</span>
                    <span className="font-mono text-xs font-bold text-[#0b1c30] bg-[#f8f9ff] px-2 py-0.5 rounded border border-[#bcc9c6]/20">
                      {member.therapist_profile.sip_number ?? '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#6d7a77]">
                  <p>Profil terapis belum diisi lengkap.</p>
                  <Link href={`/users/${id}/edit`} className="mt-2 inline-block text-xs text-[#00685f] font-semibold hover:underline">
                    Lengkapi Sekarang →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#bcc9c6]/30 bg-white p-5 shadow-sm flex flex-col justify-center items-center text-center py-8">
              <span className="material-symbols-outlined text-4xl text-[#00685f]/40 mb-2">admin_panel_settings</span>
              <p className="text-sm font-bold text-[#0b1c30]">Peran Tim: {ROLE_LABELS[member.role] ?? member.role}</p>
              <p className="text-xs text-[#6d7a77] mt-1 max-w-xs">
                Anggota tim non-terapis memiliki akses operasional sesuai peran yang ditentukan pada tab Hak Akses.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content 3: Hak Akses Sistem ── */}
      {activeTab === 'access' && (
        <div className="rounded-2xl border border-[#bcc9c6]/30 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#bcc9c6]/20 pb-4 mb-5">
            <div>
              <h3 className="text-sm font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#00685f]">security</span>
                Izin Modul Sistem untuk Peran &quot;{ROLE_LABELS[member.role] ?? member.role}&quot;
              </h3>
              <p className="text-xs text-[#6d7a77] mt-0.5">
                Hak akses diatur otomatis sesuai standar role-based security sistem klinik.
              </p>
            </div>
            <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold ${roleColors.bg} ${roleColors.text}`}>
              {ROLE_LABELS[member.role] ?? member.role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getAccessRights(member.role).map(({ label, allowed, icon }) => (
              <div
                key={label}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  allowed
                    ? 'border-[#006b2d]/20 bg-[#dcfce7]/20 text-[#0b1c30]'
                    : 'border-[#bcc9c6]/20 bg-[#f8f9ff]/50 text-[#8c9a97]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      allowed ? 'text-[#006b2d]' : 'text-[#bcc9c6]'
                    }`}
                  >
                    {icon}
                  </span>
                  <span className="text-xs font-semibold">{label}</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    allowed ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#eff4ff] text-[#8c9a97]'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: allowed ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {allowed ? 'check_circle' : 'block'}
                  </span>
                  {allowed ? 'Diizinkan' : 'Terkunci'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ResetPasswordModal
        isOpen={resetPasswordOpen}
        userName={member.name}
        onClose={() => setResetPasswordOpen(false)}
        onConfirm={handleResetPassword}
        isLoading={resetPassword.isPending}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper: map role to access rights display
// ─────────────────────────────────────────────────────────────
function getAccessRights(role: string): Array<{ label: string; allowed: boolean; icon: string }> {
  const rights = {
    dashboard: ['owner', 'pj_klinik'].includes(role),
    patients: ['owner', 'pj_klinik', 'resepsionis'].includes(role),
    appointments: ['owner', 'pj_klinik', 'resepsionis'].includes(role),
    visits: ['owner', 'pj_klinik', 'resepsionis', 'terapis'].includes(role),
    medicalRecords: ['owner', 'pj_klinik', 'terapis'].includes(role),
    billing: ['owner', 'pj_klinik', 'resepsionis'].includes(role),
    reports: ['owner', 'pj_klinik'].includes(role),
    userManagement: ['owner', 'pj_klinik'].includes(role),
  };

  return [
    { label: 'Dashboard & Analitik Klinik', allowed: rights.dashboard, icon: 'analytics' },
    { label: 'Manajemen Data Pasien', allowed: rights.patients, icon: 'patient_list' },
    { label: 'Penjadwalan Appointment & Booking', allowed: rights.appointments, icon: 'event' },
    { label: 'Data Kunjungan & Antrean', allowed: rights.visits, icon: 'assignment' },
    { label: 'Rekam Medis Terapi (SOAP)', allowed: rights.medicalRecords, icon: 'clinical_notes' },
    { label: 'Kasir, Billing & Pembayaran', allowed: rights.billing, icon: 'payments' },
    { label: 'Laporan Keuangan & Per Kategori', allowed: rights.reports, icon: 'bar_chart' },
    { label: 'Kelola Tim & Akun Pegawai', allowed: rights.userManagement, icon: 'group' },
  ];
}