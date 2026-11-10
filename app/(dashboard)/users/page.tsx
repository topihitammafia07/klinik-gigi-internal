'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui-custom/Toast';
import { ROLE_LABELS, ROLE_COLORS, type UserWithProfile } from '@/types/user';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Pagination } from '@/components/ui-custom/Pagination';

// ─────────────────────────────────────────────────────────────
// Role filter tabs config
// ─────────────────────────────────────────────────────────────
const ALL_FILTER_TABS = [
  { label: 'Semua',             value: ''            },
  { label: 'Terapis',           value: 'terapis'     },
  { label: 'Resepsionis',       value: 'resepsionis' },
  { label: 'Penanggung Jawab',  value: 'pj_klinik'  },
];

// pj_klinik hanya bisa lihat & kelola resepsionis dan terapis
const PJ_FILTER_TABS = [
  { label: 'Semua',       value: ''            },
  { label: 'Terapis',     value: 'terapis'     },
  { label: 'Resepsionis', value: 'resepsionis' },
];

// ─────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        status === 'active'
          ? 'bg-[#dcfce7] text-[#14532d]'
          : 'bg-[#f1f5f9] text-[#3d4947]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-[#14532d]' : 'bg-[#6d7a77]'}`}
      />
      {status === 'active' ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// RoleBadge
// ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? { bg: 'bg-[#eff4ff]', text: 'text-[#3d4947]' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole, user: currentUser } = useAuth();
  const { success, error } = useToast();

  // pj_klinik hanya boleh kelola terapis & resepsionis
  const isPjKlinik = hasRole('pj_klinik') && !hasRole('owner');

  const filterTabs = isPjKlinik ? PJ_FILTER_TABS : ALL_FILTER_TABS;

  // Guard: jika filter URL mengandung pj_klinik tapi user adalah pj_klinik, reset ke ''
  const initialRoleFilter = (() => {
    const r = searchParams.get('role') || '';
    if (isPjKlinik && r === 'pj_klinik') return '';
    return r;
  })();

  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading, isError } = useUsers({
    role: roleFilter || undefined,
    page,
    per_page: perPage,
  });
  const deleteUser = useDeleteUser();
  const { confirm, dialogProps } = useConfirmDialog();

  // Sync URL params when filters change
  const updateURL = useCallback(
    (role: string, p: number) => {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (p > 1) params.set('page', String(p));
      router.replace(`/users${params.toString() ? `?${params}` : ''}`, { scroll: false });
    },
    [router]
  );

  const handleRoleFilter = (role: string) => {
    // pj_klinik tidak boleh filter ke pj_klinik
    if (isPjKlinik && role === 'pj_klinik') return;
    setRoleFilter(role);
    setPage(1);
    updateURL(role, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateURL(roleFilter, newPage);
  };

  const handleDelete = (member: UserWithProfile) => {
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
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Gagal menghapus anggota.';
          error('Gagal menghapus', msg);
        }
      },
    });
  };

  // Filter: owner selalu dikecualikan dari tabel manajemen.
  // pj_klinik juga dikecualikan jika yang login adalah pj_klinik.
  const isManageable = (u: UserWithProfile) => {
    if (u.role === 'owner') return false;
    if (isPjKlinik && u.role === 'pj_klinik') return false;
    return true;
  };

  const users = (data?.data ?? []).filter(isManageable);
  const meta = data?.meta;

  // Stats by role (sesuai dengan scope akses)
  const stats = isPjKlinik
    ? [
        { label: 'Total Anggota', value: meta?.total ?? '—', icon: 'groups', bg: 'bg-[#dce9ff]', iconColor: 'text-[#0058be]' },
        { label: 'Terapis', value: users.filter((u) => u.role === 'terapis').length, icon: 'medical_services', bg: 'bg-[#dcfce7]', iconColor: 'text-[#14532d]' },
        { label: 'Resepsionis', value: users.filter((u) => u.role === 'resepsionis').length, icon: 'support_agent', bg: 'bg-[#e5eeff]', iconColor: 'text-[#00685f]' },
        { label: 'Anggota Aktif', value: users.filter((u) => u.status === 'active').length, icon: 'check_circle', bg: 'bg-[#eff4ff]', iconColor: 'text-[#006b2d]' },
      ]
    : [
        { label: 'Total Anggota', value: meta?.total ?? '—', icon: 'groups', bg: 'bg-[#dce9ff]', iconColor: 'text-[#0058be]' },
        { label: 'Terapis', value: users.filter((u) => u.role === 'terapis').length, icon: 'medical_services', bg: 'bg-[#dcfce7]', iconColor: 'text-[#14532d]' },
        { label: 'Resepsionis', value: users.filter((u) => u.role === 'resepsionis').length, icon: 'support_agent', bg: 'bg-[#e5eeff]', iconColor: 'text-[#00685f]' },
        { label: 'Anggota Aktif', value: users.filter((u) => u.status === 'active').length, icon: 'check_circle', bg: 'bg-[#eff4ff]', iconColor: 'text-[#006b2d]' },
      ];

  return (
    <div className="flex flex-col gap-10">

      {/* ── Page Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Kelola Tim</h2>
          <p className="text-sm text-[#3d4947] mt-1">
            {isPjKlinik
              ? 'Manajemen akun dan akses untuk terapis dan resepsionis klinik.'
              : 'Manajemen akun dan akses untuk terapis, resepsionis, dan penanggung jawab klinik.'}
          </p>
        </div>
        <Link
          href="/users/new"
          prefetch={false}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#00685f] text-white rounded-lg text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Tambah Anggota
        </Link>
      </section>

      {/* ── Stats Cards ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 ${card.bg} rounded-xl flex-shrink-0`}>
              <span
                className={`material-symbols-outlined text-[22px] ${card.iconColor}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {card.icon}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-[#3d4947] font-semibold uppercase tracking-wider">{card.label}</p>
              <h3 className="text-2xl font-bold text-[#0b1c30] mt-0.5">{card.value}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* ── Table Section ── */}
      <section className="flex flex-col gap-3">

        {/* Info banner for Therapist Shifts & Leave */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#e0f4f1]/80 border border-[#00685f]/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#00685f] text-[22px] flex-shrink-0 mt-0.5">
              calendar_clock
            </span>
            <div>
              <p className="text-xs font-bold text-[#00685f]">Manajemen Shift & Cuti Terapis</p>
              <p className="text-xs text-[#3d4947] mt-0.5">
                Klik tombol <strong>&ldquo;Shift & Cuti&rdquo;</strong> pada anggota terapis untuk mengatur nama shift kerja (Shift Pagi/Siang) serta mencatat tanggal cuti agar otomatis terblokir dari booking publik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRoleFilter('terapis')}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-[#00685f] text-white text-xs font-semibold hover:bg-[#008378] transition-colors whitespace-nowrap shadow-sm"
          >
            Lihat Semua Terapis
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-2xl border border-[#bcc9c6]/30 shadow-sm">
          {/* Role filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === tab.value
                    ? 'bg-[#00685f] text-white shadow-sm'
                    : 'text-[#3d4947] hover:bg-[#eff4ff]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6d7a77] ml-auto hidden sm:block">
            {meta ? `${meta.total} anggota ditemukan` : ''}
          </p>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Anggota</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden sm:table-cell">Kontak</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden md:table-cell">Spesialisasi</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden lg:table-cell">Bergabung</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/10">

                {/* Loading skeleton */}
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-[#eff4ff] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {/* Error state */}
                {isError && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#ba1a1a] text-sm">
                      <span className="material-symbols-outlined text-3xl block mb-2">error_outline</span>
                      Gagal memuat data anggota. Periksa koneksi API.
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!isLoading && !isError && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#3d4947] text-sm">
                      <span className="material-symbols-outlined text-4xl text-[#bcc9c6] block mb-3">group_off</span>
                      {roleFilter
                        ? `Belum ada anggota dengan role "${ROLE_LABELS[roleFilter] ?? roleFilter}".`
                        : 'Belum ada anggota tim yang terdaftar.'}
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!isLoading &&
                  users.map((member: UserWithProfile) => (
                    <tr key={member.id} className="hover:bg-[#f0fdf9]/50 transition-colors group">
                      {/* Avatar + Name */}
                      <td className="px-5 py-4">
                        <Link href={`/users/${member.id}`} className="flex items-center gap-3 group/link">
                          {member.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.photo_url}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[#bcc9c6]/30 group-hover/link:ring-2 group-hover/link:ring-[#00685f]"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#00685f]/15 text-[#00685f] flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover/link:bg-[#00685f] group-hover/link:text-white transition-colors">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[#0b1c30] leading-tight group-hover/link:text-[#00685f] transition-colors">
                              {member.name}
                            </p>
                            <p className="text-xs text-[#3d4947]">{member.email}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <p className="text-sm text-[#0b1c30]">{member.phone ?? '—'}</p>
                        {member.last_login && (
                          <p className="text-xs text-[#6d7a77]">
                            Login:{' '}
                            {format(new Date(member.last_login), 'd MMM yyyy', { locale: idLocale })}
                          </p>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <RoleBadge role={member.role} />
                      </td>

                      {/* Specialization */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-sm text-[#0b1c30]">
                          {member.therapist_profile?.specialization ?? '—'}
                        </p>
                        {member.therapist_profile?.str_number && (
                          <p className="text-xs text-[#6d7a77] font-mono">
                            STR: {member.therapist_profile.str_number}
                          </p>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm text-[#0b1c30]">
                          {format(new Date(member.created_at), 'd MMM yyyy', { locale: idLocale })}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={member.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Khusus Terapis untuk Atur Shift & Cuti */}
                          {member.role === 'terapis' && (
                            <Link
                              href={`/users/${member.id}#schedule`}
                              prefetch={false}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00685f]/10 text-[#00685f] hover:bg-[#00685f] hover:text-white transition-all text-xs font-semibold shadow-xs"
                              title="Atur Shift & Cuti Terapis"
                            >
                              <span className="material-symbols-outlined text-[15px]">calendar_clock</span>
                              <span className="hidden sm:inline">Shift & Cuti</span>
                            </Link>
                          )}

                          <Link
                            href={`/users/${member.id}`}
                            prefetch={false}
                            className="p-1.5 text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] bg-slate-50 border border-slate-200/60 rounded-md transition-colors"
                            title="Lihat Detail Profil"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </Link>
                          <Link
                            href={`/users/${member.id}/edit`}
                            prefetch={false}
                            className="p-1.5 text-[#3d4947] hover:text-[#00685f] hover:bg-[#eff4ff] bg-slate-50 border border-slate-200/60 rounded-md transition-colors"
                            title="Edit Data"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          {/* Hanya owner yang bisa hapus */}
                          {hasRole('owner') && (
                            <button
                              onClick={() => handleDelete(member)}
                              disabled={deleteUser.isPending}
                              className="p-1.5 text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6] bg-slate-50 border border-slate-200/60 rounded-md transition-colors disabled:opacity-40"
                              title="Hapus"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <Pagination
              page={meta.current_page}
              totalPages={meta.last_page}
              total={meta.total}
              perPage={perPage}
              perPageOptions={[5, 10, 20]}
              itemName="anggota"
              onPageChange={handlePageChange}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setPage(1);
              }}
            />
          )}
        </div>
      </section>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}