'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTherapistStatus, type TherapistStatusItem, type TherapistOperationalStatus } from '@/hooks/useTherapistStatus';

// ─────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TherapistOperationalStatus,
  {
    label: string;
    icon: string;
    pill: string;
    iconColor: string;
    rowBg: string;
    dotColor: string;
  }
> = {
  operating: {
    label:     'Beroperasi',
    icon:      'autorenew',
    pill:      'bg-[#dcfce7] text-[#14532d]',
    iconColor: 'text-[#14532d]',
    rowBg:     'bg-[#f0fdf4]/60',
    dotColor:  'bg-[#16a34a] animate-pulse',
  },
  upcoming: {
    label:     'Segera Beroperasi',
    icon:      'schedule',
    pill:      'bg-[#fef3c7] text-[#92400e]',
    iconColor: 'text-[#d97706]',
    rowBg:     'bg-[#fffbeb]/60',
    dotColor:  'bg-[#d97706]',
  },
  idle: {
    label:     'Idle',
    icon:      'person_off',
    pill:      'bg-[#f1f5f9] text-[#475569]',
    iconColor: 'text-[#94a3b8]',
    rowBg:     '',
    dotColor:  'bg-[#cbd5e1]',
  },
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StatusPill({ status, minutesUntilNext }: { status: TherapistOperationalStatus; minutesUntilNext?: number }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
      {cfg.label}
      {status === 'upcoming' && minutesUntilNext !== undefined && (
        <span className="opacity-75">· {minutesUntilNext} mnt</span>
      )}
    </span>
  );
}

function SummaryBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color}`}>
      <span className="text-sm font-bold tabular-nums">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-[#bcc9c6]/10">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#eff4ff]" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-[#eff4ff] rounded" />
            <div className="h-2.5 w-20 bg-[#eff4ff] rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-5 w-24 bg-[#eff4ff] rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-[#eff4ff] rounded" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-20 bg-[#eff4ff] rounded" /></td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface TherapistStatusPanelProps {
  /** Judul panel (opsional) */
  title?: string;
  /** Tampilkan kolom waktu jadwal — berguna di dashboard resepsionis */
  showSchedule?: boolean;
}

export function TherapistStatusPanel({
  title = 'Status Operasional Terapis',
  showSchedule = true,
}: TherapistStatusPanelProps) {
  const { therapists, isLoading, isError, refetch, summary } = useTherapistStatus();

  // Live clock — update setiap menit agar "X mnt lagi" selalu akurat
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      // Re-hitung status otomatis setiap menit dengan invalidate query
      refetch();
    }, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  const timeLabel = format(now, 'HH:mm', { locale: idLocale });

  return (
    <div className="glass-card rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="p-4 border-b border-[#bcc9c6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-[#00685f]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            monitor_heart
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#0b1c30]">{title}</h3>
            <p className="text-[11px] text-[#6d7a77] mt-0.5">
              Diperbarui pukul {timeLabel} · validasi real-time dari jadwal hari ini
            </p>
          </div>
        </div>

        {/* Summary badges */}
        {!isLoading && (
          <div className="flex items-center gap-2 flex-wrap">
            <SummaryBadge label="Beroperasi"       count={summary.operating} color="bg-[#dcfce7] text-[#14532d]" />
            <SummaryBadge label="Segera"           count={summary.upcoming}  color="bg-[#fef3c7] text-[#92400e]" />
            <SummaryBadge label="Idle"             count={summary.idle}      color="bg-[#f1f5f9] text-[#475569]" />
            <button
              onClick={() => refetch()}
              className="p-1.5 text-[#6d7a77] hover:text-[#00685f] hover:bg-[#eff4ff] rounded-lg transition-colors"
              title="Refresh status"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="flex items-center gap-3 px-5 py-4 bg-[#fff8e6] text-sm text-[#92400e]">
          <span className="material-symbols-outlined text-[18px] text-[#d97706]" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          Gagal memuat status terapis. Periksa koneksi ke server.
          <button onClick={() => refetch()} className="ml-auto text-xs underline">Coba lagi</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              <th className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Terapis</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider">Status</th>
              {showSchedule && (
                <>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden sm:table-cell">Pasien Saat Ini</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider hidden md:table-cell">Jadwal Berikutnya</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Loading */}
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

            {/* Empty */}
            {!isLoading && !isError && therapists.length === 0 && (
              <tr>
                <td colSpan={showSchedule ? 4 : 2} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-[#bcc9c6]">
                    <span className="material-symbols-outlined text-3xl">people</span>
                    <p className="text-sm">Belum ada terapis aktif terdaftar</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading &&
              therapists.map((t: TherapistStatusItem) => {
                const cfg = STATUS_CONFIG[t.status];
                return (
                  <tr
                    key={t.therapist_id}
                    className={`border-b border-[#bcc9c6]/10 transition-colors hover:opacity-90 ${cfg.rowBg}`}
                  >
                    {/* Therapist info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#00685f]/15 text-[#00685f] flex items-center justify-center text-xs font-bold">
                            {t.therapist_name.charAt(0).toUpperCase()}
                          </div>
                          {/* Dot indicator */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dotColor}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0b1c30] leading-tight">{t.therapist_name}</p>
                          {t.specialization && (
                            <p className="text-[11px] text-[#6d7a77] mt-0.5">{t.specialization}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status pill */}
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} minutesUntilNext={t.minutes_until_next} />
                    </td>

                    {showSchedule && (
                      <>
                        {/* Pasien saat ini */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {t.status === 'operating' && t.current_appointment ? (
                            <div>
                              <p className="text-sm font-medium text-[#0b1c30]">
                                {t.current_appointment.patient?.full_name ?? '—'}
                              </p>
                              <p className="text-[11px] text-[#6d7a77] font-mono mt-0.5">
                                {t.current_appointment.time_start.slice(0, 5)} – {t.current_appointment.time_end.slice(0, 5)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-[#bcc9c6]">—</span>
                          )}
                        </td>

                        {/* Jadwal berikutnya */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {t.next_appointment ? (
                            <div>
                              <p className="text-sm font-medium text-[#0b1c30]">
                                {t.next_appointment.patient?.full_name ?? '—'}
                              </p>
                              <p className="text-[11px] text-[#6d7a77] font-mono mt-0.5">
                                {t.next_appointment.time_start.slice(0, 5)} – {t.next_appointment.time_end.slice(0, 5)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-[#bcc9c6]">Tidak ada jadwal</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}