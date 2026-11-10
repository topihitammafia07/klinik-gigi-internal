'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useTherapistSchedule,
  useUpdateTherapistSchedule,
  useTherapistUnavailabilities,
  useCreateTherapistUnavailability,
  useDeleteTherapistUnavailability,
} from '@/hooks/useUsers';
import { useToast } from '@/components/ui-custom/Toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TherapistScheduleDay } from '@/types/user';

const DAYS: Array<{ key: TherapistScheduleDay['day_of_week']; label: string }> = [
  { key: 'monday', label: 'Senin' },
  { key: 'tuesday', label: 'Selasa' },
  { key: 'wednesday', label: 'Rabu' },
  { key: 'thursday', label: 'Kamis' },
  { key: 'friday', label: 'Jumat' },
  { key: 'saturday', label: 'Sabtu' },
  { key: 'sunday', label: 'Ahad / Minggu' },
];

function emptySchedule(): TherapistScheduleDay[] {
  return DAYS.map((day) => ({
    day_of_week: day.key,
    enabled: false,
    start_time: null,
    end_time: null,
    shift_name: null,
  }));
}

export function TherapistScheduleCard({ therapistId }: { therapistId: number }) {
  const toast = useToast();
  const scheduleQuery = useTherapistSchedule(therapistId);
  const updateSchedule = useUpdateTherapistSchedule(therapistId);
  const unavailabilitiesQuery = useTherapistUnavailabilities(therapistId);
  const createUnavailability = useCreateTherapistUnavailability(therapistId);
  const deleteUnavailability = useDeleteTherapistUnavailability(therapistId);

  const [schedule, setSchedule] = useState<TherapistScheduleDay[]>(emptySchedule);
  const [leaveDraft, setLeaveDraft] = useState({ date: '', reason: '' });

  useEffect(() => {
    if (!scheduleQuery.data) return;
    const byDay = new Map(scheduleQuery.data.map((item) => [item.day_of_week, item]));
    setSchedule(DAYS.map((day) => byDay.get(day.key) ?? {
      day_of_week: day.key,
      enabled: false,
      start_time: null,
      end_time: null,
      shift_name: null,
    }));
  }, [scheduleQuery.data]);

  const activeCount = useMemo(() => schedule.filter((item) => item.enabled).length, [schedule]);

  function updateDay(dayKey: TherapistScheduleDay['day_of_week'], patch: Partial<TherapistScheduleDay>) {
    setSchedule((current) => current.map((item) => (
      item.day_of_week === dayKey ? { ...item, ...patch } : item
    )));
  }

  async function addLeave() {
    if (!leaveDraft.date) {
      toast.info('Pilih tanggal', 'Tanggal cuti / tidak tersedia wajib ditentukan.');
      return;
    }

    try {
      await createUnavailability.mutateAsync({
        date: leaveDraft.date,
        reason: leaveDraft.reason.trim() || 'Cuti',
      });
      setLeaveDraft({ date: '', reason: '' });
      toast.success('Jadwal cuti berhasil dicatat', 'Booking pada tanggal ini tidak akan tersedia untuk terapis.');
    } catch (error: unknown) {
      toast.error('Gagal mencatat cuti', getApiErrorMessage(error, 'Periksa tanggal atau coba kembali.'));
    }
  }

  async function removeLeave(unavailabilityId: number) {
    try {
      await deleteUnavailability.mutateAsync(unavailabilityId);
      toast.success('Jadwal cuti dihapus', 'Terapis kembali tersedia mengikuti jadwal rutin.');
    } catch (error: unknown) {
      toast.error('Gagal menghapus cuti', getApiErrorMessage(error, 'Silakan coba kembali.'));
    }
  }

  async function save() {
    for (const day of schedule) {
      if (!day.enabled) continue;
      if (!day.start_time || !day.end_time) {
        toast.info('Jam praktik belum lengkap', `Lengkapi jam mulai dan selesai untuk ${DAYS.find((item) => item.key === day.day_of_week)?.label}.`);
        return;
      }
      if (day.end_time <= day.start_time) {
        toast.info('Rentang jam tidak valid', 'Jam selesai harus setelah jam mulai.');
        return;
      }
    }

    try {
      await updateSchedule.mutateAsync(schedule.map((day) => ({
        ...day,
        start_time: day.enabled ? day.start_time : null,
        end_time: day.enabled ? day.end_time : null,
        shift_name: day.enabled ? (day.shift_name ?? null) : null,
      })));
      toast.success('Jadwal praktik tersimpan', 'Ketersediaan booking terapis akan mengikuti jadwal ini dan jam operasional klinik.');
    } catch (error: unknown) {
      toast.error('Gagal menyimpan jadwal', getApiErrorMessage(error, 'Periksa jam praktik dan koneksi API.'));
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Jadwal Shift Rutin ── */}
      <div className="glass-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
              <span className="material-symbols-outlined text-[19px] text-[#00685f]">calendar_clock</span>
              Pengaturan Shift & Jadwal Praktik
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#6d7a77]">
              Atur shift praktik dan jam operasional terapis. Saat booking online atau pendaftaran internal, sistem otomatis memverifikasi ketersediaan dan mencegah benturan jadwal.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#00685f]/10 px-3 py-1 text-xs font-semibold text-[#00685f]">{activeCount} hari aktif</span>
        </div>

        {scheduleQuery.isLoading ? (
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#eff4ff]" />)}
          </div>
        ) : scheduleQuery.isError ? (
          <div className="mt-5 rounded-xl border border-[#ffdad6] bg-[#ffdad6]/30 p-4 text-sm text-[#93000a]">Jadwal praktik gagal dimuat.</div>
        ) : (
          <div className="mt-5 space-y-3">
            {schedule.map((day) => {
              const label = DAYS.find((item) => item.key === day.day_of_week)?.label ?? day.day_of_week;
              return (
                <div key={day.day_of_week} className="grid grid-cols-1 gap-3 rounded-xl border border-[#bcc9c6]/35 bg-[#f8f9ff] p-4 sm:grid-cols-[120px_100px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end">
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30]">{label}</p>
                    <p className="mt-0.5 text-xs text-[#6d7a77]">{day.enabled ? 'Praktik' : 'Tidak praktik'}</p>
                  </div>
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm text-[#0b1c30]">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(event) => updateDay(day.day_of_week, {
                        enabled: event.target.checked,
                        start_time: event.target.checked ? (day.start_time ?? '09:00') : null,
                        end_time: event.target.checked ? (day.end_time ?? '17:00') : null,
                      })}
                      className="accent-[#00685f]"
                    />
                    Aktif
                  </label>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Mulai</label>
                    <input
                      type="time"
                      value={day.start_time ?? ''}
                      disabled={!day.enabled}
                      onChange={(event) => updateDay(day.day_of_week, { start_time: event.target.value })}
                      className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm disabled:bg-[#eef2f2] disabled:text-[#9aa5a2]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Selesai</label>
                    <input
                      type="time"
                      value={day.end_time ?? ''}
                      disabled={!day.enabled}
                      onChange={(event) => updateDay(day.day_of_week, { end_time: event.target.value })}
                      className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm disabled:bg-[#eef2f2] disabled:text-[#9aa5a2]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#6d7a77]">Nama Shift (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Mis: Pagi / Siang / Full"
                      value={day.shift_name ?? ''}
                      disabled={!day.enabled}
                      onChange={(event) => updateDay(day.day_of_week, { shift_name: event.target.value })}
                      className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm disabled:bg-[#eef2f2] disabled:text-[#9aa5a2]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={scheduleQuery.isLoading || scheduleQuery.isError || updateSchedule.isPending}
            className="h-11 rounded-xl gradient-btn px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {updateSchedule.isPending ? 'Menyimpan...' : 'Simpan Jadwal Praktik'}
          </button>
        </div>
      </div>

      {/* ── Hari Tidak Tersedia / Cuti Terapis ── */}
      <div className="glass-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
              <span className="material-symbols-outlined text-[19px] text-[#ba1a1a]">event_busy</span>
              Hari Tidak Tersedia & Cuti Terapis
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#6d7a77]">
              Catat tanggal libur, cuti, atau hari dinas luar. Pasien tidak dapat melakukan booking pada tanggal ini, dan jadwal bentrok akan dicegah otomatis.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#ba1a1a]/10 px-3 py-1 text-xs font-semibold text-[#ba1a1a]">
            {(unavailabilitiesQuery.data ?? []).length} jadwal cuti
          </span>
        </div>

        {/* Form tambah cuti */}
        <div className="mt-5 rounded-xl border border-[#bcc9c6]/40 bg-[#f8f9ff] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
            + Tambah Hari Tidak Tersedia / Cuti
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#6d7a77]">Tanggal</label>
              <input
                type="date"
                value={leaveDraft.date}
                onChange={(e) => setLeaveDraft((prev) => ({ ...prev, date: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#6d7a77]">Alasan / Keterangan</label>
              <input
                type="text"
                placeholder="Contoh: Cuti Tahunan, Pelatihan Medis, Sakit, Izin Khusus"
                value={leaveDraft.reason}
                onChange={(e) => setLeaveDraft((prev) => ({ ...prev, reason: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLeave();
                  }
                }}
                className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={addLeave}
              disabled={createUnavailability.isPending}
              className="h-11 rounded-xl bg-[#00685f] px-5 text-xs font-semibold text-white hover:bg-[#008378] transition-colors disabled:opacity-60"
            >
              {createUnavailability.isPending ? 'Menyimpan...' : '+ Tambah'}
            </button>
          </div>
        </div>

        {/* List cuti */}
        <div className="mt-4">
          {unavailabilitiesQuery.isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-[#eff4ff]" />
          ) : (unavailabilitiesQuery.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#bcc9c6] p-5 text-center text-xs text-[#6d7a77]">
              Belum ada catatan cuti / hari tidak tersedia untuk terapis ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(unavailabilitiesQuery.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#ba1a1a]/25 bg-[#ffdad6]/20 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">event_busy</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#ba1a1a]">{item.date}</p>
                      <p className="text-xs text-[#0b1c30] truncate">{item.reason || 'Cuti'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLeave(item.id)}
                    disabled={deleteUnavailability.isPending}
                    className="rounded-lg p-1 text-[#ba1a1a] hover:bg-[#ba1a1a]/15 transition-colors disabled:opacity-50"
                    title="Hapus catatan cuti ini"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

