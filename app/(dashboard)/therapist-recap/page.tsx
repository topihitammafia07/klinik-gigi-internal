'use client';

import { useState } from 'react';
import { useTherapistRecap } from '@/hooks/useClinicSettings';

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function TherapistRecapPage() {
  const recap = useTherapistRecap();
  const [expandedTherapist, setExpandedTherapist] = useState<number | null>(null);
  const rows = recap.data?.therapists ?? [];
  const windowHours = recap.data?.window_hours ?? 24;

  const totalTreatments = rows.reduce((sum, row) => sum + row.treatment_count, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.received_revenue, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] md:text-3xl">Rekap Tindakan Terapis</h1>
          <p className="mt-1 text-sm text-[#3d4947]">
            Khusus Resepsionis. Menampilkan tindakan selesai dan pendapatan tindakan yang diterima dalam {windowHours} jam terakhir.
          </p>
        </div>
        <div className="inline-flex self-start items-center gap-2 rounded-full bg-[#00685f]/10 px-3 py-1.5 text-xs font-semibold text-[#00685f]">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          Otomatis tersembunyi setelah {windowHours} jam
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#bcc9c6]/35 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6d7a77]">Terapis Aktif</p>
          <p className="mt-2 text-2xl font-bold text-[#0b1c30]">{recap.isLoading ? '—' : rows.length}</p>
        </div>
        <div className="rounded-2xl border border-[#bcc9c6]/35 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6d7a77]">Tindakan Selesai</p>
          <p className="mt-2 text-2xl font-bold text-[#0b1c30]">{recap.isLoading ? '—' : totalTreatments}</p>
        </div>
        <div className="rounded-2xl border border-[#bcc9c6]/35 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6d7a77]">Pendapatan Terapis</p>
          <p className="mt-2 text-xl font-bold text-[#00685f]">{recap.isLoading ? '—' : rupiah(totalRevenue)}</p>
        </div>
      </section>

      {recap.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-2xl bg-[#eff4ff]" />
          ))}
        </div>
      ) : recap.isError ? (
        <div className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ffdad6]/50 p-5 text-sm text-[#8c1d18]">
          Rekap terapis tidak dapat dimuat. Pastikan akun yang digunakan adalah Resepsionis dan API berjalan.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#bcc9c6]/40 bg-white p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-[#6d7a77]">clinical_notes</span>
          <h2 className="mt-3 font-semibold text-[#0b1c30]">Belum ada tindakan dalam {windowHours} jam terakhir</h2>
          <p className="mt-1 text-sm text-[#6d7a77]">Data historis tetap tersimpan; halaman ini hanya menyembunyikan data yang sudah melewati window waktu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const expanded = expandedTherapist === row.therapist_id;
            return (
              <article key={row.therapist_id} className="overflow-hidden rounded-2xl border border-[#bcc9c6]/35 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedTherapist(expanded ? null : row.therapist_id)}
                  className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00685f]/10 font-bold text-[#00685f]">
                      {row.therapist_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-[#0b1c30]">{row.therapist_name}</h2>
                      <p className="mt-0.5 text-xs text-[#6d7a77]">Tindakan terakhir: {formatDateTime(row.latest_treatment_at)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-6">
                    <div>
                      <p className="text-[11px] text-[#6d7a77]">Tindakan</p>
                      <p className="mt-0.5 font-bold text-[#0b1c30]">{row.treatment_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#6d7a77]">Pendapatan diterima</p>
                      <p className="mt-0.5 font-bold text-[#00685f]">{rupiah(row.received_revenue)}</p>
                    </div>
                    <span className="material-symbols-outlined hidden text-[#6d7a77] sm:block">{expanded ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-[#bcc9c6]/25 bg-[#f8f9ff]/70 p-4 sm:p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Rincian Tindakan</p>
                    {row.actions.length === 0 ? (
                      <p className="text-xs text-[#6d7a77]">Tidak ada rincian tindakan.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[#bcc9c6]/30 bg-white">
                        <table className="w-full min-w-[720px] text-sm">
                          <thead className="bg-[#eff4ff]/60 text-xs text-[#3d4947]">
                            <tr>
                              <th className="px-4 py-3 text-left">Pasien</th>
                              <th className="px-4 py-3 text-left">Tindakan</th>
                              <th className="px-4 py-3 text-left">Selesai</th>
                              <th className="px-4 py-3 text-right">Pendapatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#bcc9c6]/20">
                            {row.actions.map((action) => (
                              <tr key={action.visit_id}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-[#0b1c30]">{action.patient_name ?? 'Pasien'}</p>
                                  <p className="text-xs text-[#6d7a77]">{action.medical_record_number ?? '—'}</p>
                                </td>
                                <td className="px-4 py-3 text-[#3d4947]">{action.therapy_type ?? '—'}</td>
                                <td className="px-4 py-3 text-[#3d4947]">{formatDateTime(action.completed_at)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-[#00685f]">{rupiah(action.received_revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {recap.data && (
        <p className="text-right text-[11px] text-[#6d7a77]">
          Data dibuat {formatDateTime(recap.data.generated_at)} · menampilkan sejak {formatDateTime(recap.data.visible_since)}
        </p>
      )}
    </div>
  );
}
