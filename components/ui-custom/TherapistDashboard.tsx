'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapistDashboard, type TherapistScheduleItem } from '@/hooks/useTherapistDashboard';
import { useUpdateVisitStatus } from '@/hooks/useVisits';
import { useToast } from '@/components/ui-custom/Toast';
import type { VisitStatus } from '@/types/visit';

// ─────────────────────────────────────────────────────────────
// Consts & helpers
// ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  VisitStatus | 'scheduled',
  { label: string; pill: string; dot: string; icon: string }
> = {
  scheduled: {
    label: 'Belum Check-In',
    pill: 'bg-[#f1f5f9] text-[#475569]',
    dot: 'bg-[#94a3b8]',
    icon: 'schedule',
  },
  waiting: {
    label: 'Menunggu',
    pill: 'bg-[#fef3c7] text-[#92400e]',
    dot: 'bg-[#d97706]',
    icon: 'hourglass_empty',
  },
  ongoing: {
    label: 'Berlangsung',
    pill: 'bg-[#dcfce7] text-[#14532d]',
    dot: 'bg-[#16a34a] animate-pulse',
    icon: 'autorenew',
  },
  done: {
    label: 'Selesai',
    pill: 'bg-[#eff6ff] text-[#1e40af]',
    dot: 'bg-[#3b82f6]',
    icon: 'check_circle',
  },
};

function fmt(t: string) {
  return t.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────
// Schedule Row
// ─────────────────────────────────────────────────────────────

function ScheduleRow({
  item,
  index,
  now,
  onStartVisit,
  isUpdating,
}: {
  item: TherapistScheduleItem;
  index: number;
  now: number;
  onStartVisit: (visitId: number) => void;
  isUpdating: boolean;
}) {
  const cfg = STATUS_CFG[item.status];
  const startMin = item.time_start.split(':').reduce((a: number, v: string, i: number) => a + Number(v) * (i === 0 ? 60 : 1), 0);
  const isNow = item.status === 'ongoing';
  const isPast = item.status === 'done';
  const isCurrent = !isNow && !isPast && startMin <= now;

  return (
    <div
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center pt-1 flex-shrink-0">
        {/* Dot */}
        <div
          className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 flex-shrink-0 ${
            isNow
              ? 'bg-[#16a34a] animate-pulse ring-2 ring-[#16a34a]/30'
              : isPast
              ? 'bg-[#bcc9c6]'
              : isCurrent
              ? 'bg-[#d97706]'
              : 'bg-[#e2e8f0]'
          }`}
        />
        {/* Vertical line */}
        <div className="w-px flex-1 mt-1 bg-[#e2e8f0]" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 rounded-xl border transition-all ${
          isNow
            ? 'border-[#16a34a]/30 bg-[#f0fdf4]'
            : isCurrent
            ? 'border-[#d97706]/30 bg-[#fffbeb]'
            : 'border-[#bcc9c6]/40 bg-white'
        }`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Number */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                isNow ? 'bg-[#16a34a] text-white' : 'bg-[#eff4ff] text-[#0058be]'
              }`}
            >
              {index + 1}
            </div>
            {/* Patient info */}
            <div>
              <p className="text-sm font-semibold text-[#0b1c30] leading-tight">
                {item.patient_name}
              </p>
              <p className="text-[11px] text-[#6d7a77] font-mono mt-0.5">
                {item.patient_mrn}
              </p>
            </div>
          </div>

          {/* Status pill + time */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.pill}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className="text-[11px] text-[#6d7a77] font-mono">
              {fmt(item.time_start)} – {fmt(item.time_end)}
            </span>
          </div>
        </div>

        {/* Complaint + therapy */}
        {(item.complaint || item.therapy_type) && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {item.complaint && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3d4947] bg-[#f1f5f9] px-2 py-0.5 rounded-md">
                <span className="material-symbols-outlined text-[12px] text-[#6d7a77]">
                  medical_information
                </span>
                {item.complaint.length > 40
                  ? item.complaint.slice(0, 40) + '…'
                  : item.complaint}
              </span>
            )}
            {item.therapy_type && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#00685f] bg-[#e0f4f1] px-2 py-0.5 rounded-md">
                <span className="material-symbols-outlined text-[12px]">
                  physical_therapy
                </span>
                {item.therapy_type}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        {item.source === 'visit' && item.visit_id && item.status !== 'scheduled' && (
          <div className="px-4 pb-4 pt-1 flex items-center gap-2 border-t border-[#bcc9c6]/20">
            {/* Detail link */}
            <Link
              href={`/visits/${item.visit_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00685f] border border-[#00685f]/30 hover:bg-[#00685f]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              Detail
            </Link>

            {/* Start / Finish CTA */}
            {item.status === 'waiting' && (
              <button
                onClick={() => onStartVisit(item.visit_id!)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00685f] text-white hover:bg-[#008378] disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                Mulai Sesi
              </button>
            )}

            {item.status === 'ongoing' && (
              <button
                onClick={() => onStartVisit(item.visit_id!)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0058be] text-white hover:bg-[#0046a0] disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">check</span>
                Selesaikan Sesi
              </button>
            )}

            {/* Rekam Medis indicator */}
            {item.status === 'done' && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md ${
                  item.has_medical_record
                    ? 'bg-[#dcfce7] text-[#14532d]'
                    : 'bg-[#ffdad6] text-[#ba1a1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {item.has_medical_record ? 'check_circle' : 'warning'}
                </span>
                {item.has_medical_record ? 'Rekam Medis Tersedia' : 'Belum Ada Rekam Medis'}
              </span>
            )}
          </div>
        )}

        {/* Belum check-in notice */}
        {item.source === 'appointment' && (
          <div className="px-4 pb-3 pt-1 border-t border-[#bcc9c6]/20">
            <p className="text-[11px] text-[#6d7a77] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">info</span>
              Menunggu check-in oleh resepsionis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  bg,
  iconColor,
  textColor,
  isLoading,
}: {
  label: string;
  value: number;
  icon: string;
  bg: string;
  iconColor: string;
  textColor: string;
  isLoading?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-2 ${bg}`}>
      <div className={`w-8 h-8 rounded-full bg-white/50 flex items-center justify-center ${iconColor}`}>
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      {isLoading ? (
        <div className="h-7 w-12 bg-white/40 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold tabular-nums ${textColor}`}>{value}</p>
      )}
      <p className={`text-xs font-medium ${textColor} opacity-80`}>{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function TherapistDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const { schedule, stats, activeVisit, waitingVisits, isLoading, isError, refetch } =
    useTherapistDashboard(user?.id ?? 0);

  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateVisitStatus();

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 19 ? 'Sore' : 'Malam';
  })();

  async function handleVisitAction(visitId: number) {
    const visit = schedule.find((s) => s.visit_id === visitId);
    if (!visit || visit.status === 'scheduled' || visit.status === 'done') return;

    const NEXT: Record<VisitStatus, VisitStatus | null> = {
      waiting: 'ongoing',
      ongoing: 'done',
      done: null,
    };
    const nextStatus = NEXT[visit.status as VisitStatus];
    if (!nextStatus) return;

    try {
      await updateStatus({ id: visitId, status: nextStatus });
      refetch();
      const labels: Record<VisitStatus, string> = {
        waiting: 'Menunggu', ongoing: 'Berlangsung', done: 'Selesai',
      };
      toast.success('Status diperbarui', `Kunjungan sekarang ${labels[nextStatus]}.`);
    } catch {
      toast.error('Gagal memperbarui', 'Silakan coba lagi.');
    }
  }

  // ── Active session banner ───────────────────────────────────
  const activeBanner = activeVisit ? (
    <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-[#00685f] to-[#004d46] text-white shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="material-symbols-outlined text-[16px] text-[#86efac]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              radio_button_checked
            </span>
            <span className="text-xs font-semibold text-[#86efac] uppercase tracking-wider">
              Sesi Aktif
            </span>
          </div>
          <h3 className="text-lg font-bold">
            {activeVisit.patient?.full_name ?? '—'}
          </h3>
          <p className="text-sm text-white/70 mt-0.5">
            {activeVisit.patient?.medical_record_number ?? '—'}
          </p>
          {activeVisit.therapy_type && (
            <p className="text-xs text-white/60 mt-1">{activeVisit.therapy_type}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-[11px] text-white/50">Waktu</p>
            <p className="text-sm font-mono text-white font-semibold">
              {activeVisit.appointment
                ? `${fmt(activeVisit.appointment.time_start)} – ${fmt(activeVisit.appointment.time_end)}`
                : '—'}
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <Link
              href={`/visits/${activeVisit.id}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">description</span>
              Rekam Medis
            </Link>
            <button
              onClick={() => handleVisitAction(activeVisit.id)}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#00685f] rounded-lg text-xs font-bold hover:bg-white/90 disabled:opacity-60 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">check</span>
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ── Waiting queue banner ────────────────────────────────────
  const waitingBanner =
    !activeVisit && waitingVisits.length > 0 ? (
      <div className="rounded-xl border border-[#d97706]/30 bg-[#fffbeb] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[22px] text-[#d97706]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            hourglass_empty
          </span>
          <div>
            <p className="text-sm font-semibold text-[#92400e]">
              {waitingVisits[0].patient?.full_name ?? '—'} menunggu
            </p>
            <p className="text-xs text-[#92400e]/70">
              {waitingVisits.length === 1
                ? 'Pasien siap dimulai sesinya'
                : `${waitingVisits.length} pasien dalam antrian`}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleVisitAction(waitingVisits[0].id)}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#d97706] text-white rounded-lg text-xs font-bold hover:bg-[#b45309] disabled:opacity-60 transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
          Mulai Sesi
        </button>
      </div>
    ) : null;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <h2 className="text-xl font-bold text-[#0b1c30]">Gagal memuat data</h2>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-[#00685f] text-white text-sm font-semibold rounded-lg hover:bg-[#008378] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Coba Lagi
        </button>
      </div>
    );
  }

  const todayLabel = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Selamat {greeting}, {user?.name?.split(' ')[0] ?? 'Terapis'} 👋
          </h2>
          <p className="text-sm text-[#3d4947] mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 bg-white border border-[#bcc9c6] rounded-lg hover:border-[#00685f] hover:text-[#00685f] transition-colors text-[#3d4947]"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          <Link
            href="/visits"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00685f] text-white text-sm font-semibold rounded-lg hover:bg-[#008378] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            Semua Kunjungan
          </Link>
        </div>
      </div>

      {/* ── Active session / waiting banner ── */}
      {activeBanner}
      {waitingBanner}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Jadwal"
          value={stats.total}
          icon="calendar_today"
          bg="bg-[#eff4ff]"
          iconColor="text-[#0058be]"
          textColor="text-[#0b1c30]"
          isLoading={isLoading}
        />
        <StatCard
          label="Menunggu"
          value={stats.waiting}
          icon="hourglass_empty"
          bg="bg-[#fef3c7]"
          iconColor="text-[#d97706]"
          textColor="text-[#92400e]"
          isLoading={isLoading}
        />
        <StatCard
          label="Berlangsung"
          value={stats.ongoing}
          icon="autorenew"
          bg="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          textColor="text-[#14532d]"
          isLoading={isLoading}
        />
        <StatCard
          label="Selesai"
          value={stats.done}
          icon="check_circle"
          bg="bg-[#dce9ff]"
          iconColor="text-[#0058be]"
          textColor="text-[#0b1c30]"
          isLoading={isLoading}
        />
      </div>

      {/* ── Progress bar ── */}
      {!isLoading && stats.total > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-[#0b1c30]">Progress Hari Ini</p>
              <p className="text-xs text-[#6d7a77] mt-0.5">{todayLabel}</p>
            </div>
            <span className="text-2xl font-bold text-[#00685f] tabular-nums">
              {Math.round((stats.done / stats.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-3 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00685f] to-[#00a896] rounded-full transition-all duration-700"
              style={{ width: `${(stats.done / stats.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-[#6d7a77]">
            <span>{stats.done} selesai</span>
            <span>{stats.total - stats.done} tersisa</span>
          </div>
        </div>
      )}

      {/* ── Jadwal hari ini (Timeline) ── */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#bcc9c6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-[#00685f]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              today
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[#0b1c30]">Jadwal Hari Ini</h3>
              <p className="text-[11px] text-[#6d7a77] mt-0.5">
                {schedule.length} pasien · Diperbarui otomatis
              </p>
            </div>
          </div>
          <Link
            href="/visits"
            className="text-[11px] font-semibold text-[#00685f] hover:underline"
          >
            Lihat Semua →
          </Link>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-[#eff4ff]" />
                    <div className="w-px flex-1 mt-1 bg-[#eff4ff]" />
                  </div>
                  <div className="flex-1 rounded-xl bg-[#eff4ff] h-24" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && schedule.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[#bcc9c6] mb-3">
                event_available
              </span>
              <p className="text-base font-medium text-[#0b1c30]">
                Tidak ada jadwal hari ini
              </p>
              <p className="text-sm text-[#6d7a77] mt-1">
                Selamat beristirahat!
              </p>
            </div>
          )}

          {!isLoading && schedule.length > 0 && (
            <div>
              {schedule.map((item, i) => (
                <ScheduleRow
                  key={`${item.source}-${item.id}`}
                  item={item}
                  index={i}
                  now={now}
                  onStartVisit={handleVisitAction}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#0b1c30] mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Daftar Kunjungan',
              icon: 'list_alt',
              href: '/visits',
              color: 'bg-[#eff4ff] text-[#0058be] border-[#0058be]/20',
            },
            {
              label: 'Rekam Medis',
              icon: 'description',
              href: '/medical-records',
              color: 'bg-[#e0f4f1] text-[#00685f] border-[#00685f]/20',
            },
            {
              label: 'Pasien Saya',
              icon: 'group',
              href: '/patients',
              color: 'bg-[#fef3c7] text-[#92400e] border-[#d97706]/20',
            },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all hover:shadow-md hover:scale-[1.02] text-center gap-2 ${a.color}`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'wght' 300, 'FILL' 1" }}
              >
                {a.icon}
              </span>
              <span className="text-xs font-semibold leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}