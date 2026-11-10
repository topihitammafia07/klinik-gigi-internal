'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClinicSettings, useUpdateClinicSettings } from '@/hooks/useClinicSettings';
import { useToast } from '@/components/ui-custom/Toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  OPERATIONAL_DAY_KEYS,
  OPERATIONAL_DAY_LABELS,
  type ClinicHolidayDate,
  type OperationalDay,
  type OperationalDayKey,
  type OperationalHours,
} from '@/types/clinic-settings';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function makeFallbackDay(): OperationalDay {
  return {
    enabled: false,
    open: '08:00',
    close: '17:00',
    booking_slots: [],
    allow_custom_booking_time: false,
  };
}

export default function ClinicSettingsPage() {
  const toast = useToast();
  const { data: settings, isLoading, isError, refetch } = useClinicSettings();
  const updateSettings = useUpdateClinicSettings();

  const [hours, setHours] = useState<OperationalHours | null>(null);
  const [slotDrafts, setSlotDrafts] = useState<Record<OperationalDayKey, string>>(
    Object.fromEntries(OPERATIONAL_DAY_KEYS.map((day) => [day, ''])) as Record<OperationalDayKey, string>,
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeNew, setFeeNew] = useState(true);
  const [feeExisting, setFeeExisting] = useState(false);
  const [feeNewAmount, setFeeNewAmount] = useState('0');
  const [feeExistingAmount, setFeeExistingAmount] = useState('0');
  const [holidays, setHolidays] = useState<ClinicHolidayDate[]>([]);
  const [holidayDraft, setHolidayDraft] = useState({ date: '', name: '' });
  const [activeSection, setActiveSection] = useState<'all' | 'schedule' | 'holidays' | 'registration'>('all');

  useEffect(() => {
    if (!settings) return;
    setHours(settings.operational_hours);
    setMaintenanceMessage(settings.maintenance_message ?? '');
    setFeeEnabled(settings.registration_fee_enabled);
    setFeeNew(settings.registration_fee_for_new_patient);
    setFeeExisting(settings.registration_fee_for_existing_patient);
    setFeeNewAmount(String(settings.registration_fee_new_patient_amount ?? settings.registration_fee_amount ?? 0));
    setFeeExistingAmount(String(settings.registration_fee_existing_patient_amount ?? 0));
    setHolidays(settings.holiday_dates ?? []);
  }, [settings]);

  const enabledDayCount = useMemo(
    () => (hours ? OPERATIONAL_DAY_KEYS.filter((day) => hours[day]?.enabled).length : 0),
    [hours],
  );

  function updateDay(day: OperationalDayKey, changes: Partial<OperationalDay>) {
    setHours((current) => {
      if (!current) return current;
      return {
        ...current,
        [day]: {
          ...(current[day] ?? makeFallbackDay()),
          ...changes,
        },
      };
    });
  }

  function addSlot(day: OperationalDayKey) {
    const slot = normalizeTime(slotDrafts[day]);
    if (!slot || !hours) return;

    const current = hours[day] ?? makeFallbackDay();
    if (current.booking_slots.includes(slot)) {
      toast.info('Slot sudah tersedia', `${OPERATIONAL_DAY_LABELS[day]} pukul ${slot} sudah ada.`);
      return;
    }

    if (current.open && slot < current.open) {
      toast.info('Slot di luar jam operasional', `Slot harus mulai pukul ${current.open} atau sesudahnya.`);
      return;
    }

    if (current.close && slot >= current.close) {
      toast.info('Slot di luar jam operasional', `Slot harus sebelum pukul ${current.close}.`);
      return;
    }

    updateDay(day, {
      booking_slots: [...current.booking_slots, slot].sort(),
    });
    setSlotDrafts((currentDrafts) => ({ ...currentDrafts, [day]: '' }));
  }

  function removeSlot(day: OperationalDayKey, slot: string) {
    const current = hours?.[day] ?? makeFallbackDay();
    updateDay(day, { booking_slots: current.booking_slots.filter((item) => item !== slot) });
  }

  async function toggleOperational() {
    if (!settings) return;

    try {
      await updateSettings.mutateAsync({
        is_operational: !settings.is_operational,
        maintenance_message: maintenanceMessage.trim() || null,
      });
      toast.success(
        settings.is_operational ? 'Mode libur / maintenance aktif' : 'Klinik kembali aktif',
        settings.is_operational
          ? 'Booking publik dan aktivitas staff dihentikan sementara. Owner tetap dapat mengakses sistem.'
          : 'Aktivitas klinik dan booking publik dapat digunakan kembali.',
      );
    } catch (error: unknown) {
      toast.error('Status tidak dapat diubah', getApiErrorMessage(error, 'Silakan coba kembali.'));
    }
  }

  function addHoliday() {
    if (!holidayDraft.date) {
      toast.info('Pilih tanggal', 'Tanggal libur wajib ditentukan.');
      return;
    }
    if (holidays.some((h) => h.date === holidayDraft.date)) {
      toast.info('Tanggal sudah ada', `Tanggal ${holidayDraft.date} sudah terdaftar.`);
      return;
    }

    setHolidays((prev) => [
      ...prev,
      {
        date: holidayDraft.date,
        name: holidayDraft.name.trim() || 'Hari Libur Klinik',
      },
    ].sort((a, b) => a.date.localeCompare(b.date)));

    setHolidayDraft({ date: '', name: '' });
    toast.success('Tanggal libur ditambahkan', 'Klik Simpan Pengaturan di bawah untuk menerapkan perubahan.');
  }

  function removeHoliday(date: string) {
    setHolidays((prev) => prev.filter((h) => h.date !== date));
  }

  async function saveSettings() {
    if (!hours) return;

    try {
      const sanitizedHours = Object.fromEntries(
        OPERATIONAL_DAY_KEYS.map((day) => {
          const value = hours[day] ?? makeFallbackDay();
          return [
            day,
            {
              ...value,
              booking_slots: Array.from(new Set(value.booking_slots.map(normalizeTime)))
                .filter(Boolean)
                .sort(),
            },
          ];
        }),
      ) as OperationalHours;

      await updateSettings.mutateAsync({
        maintenance_message: maintenanceMessage.trim() || null,
        operational_hours: sanitizedHours,
        holiday_dates: holidays,
        registration_fee_enabled: feeEnabled,
        registration_fee_amount: parseNumberFromDots(feeNewAmount),
        registration_fee_new_patient_amount: parseNumberFromDots(feeNewAmount),
        registration_fee_existing_patient_amount: parseNumberFromDots(feeExistingAmount),
        registration_fee_for_new_patient: feeNew,
        registration_fee_for_existing_patient: feeExisting,
      });
      toast.success(
        'Pengaturan klinik tersimpan',
        'Jam operasional, hari libur khusus, slot booking, dan biaya pendaftaran berhasil diperbarui.',
      );
    } catch (error: unknown) {
      toast.error('Gagal menyimpan pengaturan', getApiErrorMessage(error, 'Periksa kembali data yang diisi.'));
    }
  }

  if (isLoading) {
    return <div className="h-72 rounded-2xl bg-[#eff4ff] animate-pulse" />;
  }

  if (isError || !settings || !hours) {
    return (
      <div className="rounded-2xl border border-[#ba1a1a]/20 bg-white p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-4xl text-[#ba1a1a]">error_outline</span>
        <h1 className="mt-3 text-lg font-bold text-[#0b1c30]">Pengaturan klinik gagal dimuat</h1>
        <p className="mt-1 text-sm text-[#3d4947]">Pastikan klinik-api berjalan dan akun yang digunakan adalah Owner.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 h-10 rounded-xl border border-[#00685f] px-4 text-sm font-semibold text-[#00685f] hover:bg-[#00685f]/5"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] md:text-3xl">Pengaturan Klinik</h1>
          <p className="mt-1 text-sm text-[#3d4947]">
            Mengatur status klinik, jam landing page, slot booking, dan biaya pendaftaran.
          </p>
        </div>
        <div className="inline-flex self-start items-center gap-2 rounded-full bg-[#eff4ff] px-3 py-1.5 text-xs font-semibold text-[#3d4947]">
          <span className="material-symbols-outlined text-[16px] text-[#00685f]">calendar_month</span>
          {enabledDayCount} hari aktif / minggu
        </div>
      </header>

      {/* ── Sub-Navigation / Quick Tabs ── */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-[#f8f9ff]/95 backdrop-blur-md py-2 border-b border-[#bcc9c6]/20">
        <button
          type="button"
          onClick={() => setActiveSection('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            activeSection === 'schedule'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white border border-[#bcc9c6]/40 text-[#3d4947] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">schedule</span>
          <span>Jam Buka & Hari Ahad</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeSection === 'schedule' ? 'bg-white/20 text-white' : 'bg-[#eff4ff] text-[#00685f]'}`}>
            {enabledDayCount} hari aktif
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('holidays')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            activeSection === 'holidays'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white border border-[#bcc9c6]/40 text-[#3d4947] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">event_busy</span>
          <span>Hari Libur Khusus & Nasional</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeSection === 'holidays' ? 'bg-white/20 text-white' : holidays.length > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#eff4ff] text-[#6d7a77]'}`}>
            {holidays.length} Libur
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('registration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            activeSection === 'registration'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white border border-[#bcc9c6]/40 text-[#3d4947] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">how_to_reg</span>
          <span>Biaya Pendaftaran</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeSection === 'registration' ? 'bg-white/20 text-white' : feeEnabled ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#eff4ff] text-[#6d7a77]'}`}>
            {feeEnabled ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            activeSection === 'all'
              ? 'bg-[#0b1c30] text-white shadow-sm'
              : 'bg-white border border-[#bcc9c6]/40 text-[#6d7a77] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">view_agenda</span>
          <span>Semua Bagian</span>
        </button>
      </div>

      {(activeSection === 'all' || activeSection === 'schedule') && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[#bcc9c6]/40 bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00685f]">power_settings_new</span>
                  <h2 className="font-bold text-[#0b1c30]">Mode Operasional Klinik</h2>
                </div>
                <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-[#6d7a77]">
                  Saat OFF, PJ Klinik, Resepsionis, dan Terapis tidak dapat login/beraktivitas. Landing tetap dapat dilihat tetapi booking ditutup. Owner tetap memiliki akses.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleOperational}
                disabled={updateSettings.isPending}
                className={`min-h-11 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  settings.is_operational
                    ? 'border-[#14532d]/20 bg-[#dcfce7] text-[#14532d]'
                    : 'border-[#ba1a1a]/20 bg-[#ffdad6]/60 text-[#ba1a1a]'
                }`}
              >
                {settings.is_operational ? 'ON — Klinik Aktif' : 'OFF — Libur / Maintenance'}
              </button>
            </div>
            <div className="border-t border-[#bcc9c6]/25 px-5 py-4 md:px-6">
              <label htmlFor="maintenance-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
                Pesan saat klinik OFF
              </label>
              <textarea
                id="maintenance-message"
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Contoh: Klinik libur sementara. Booking dibuka kembali Senin pagi."
                className="w-full resize-y rounded-xl border border-[#bcc9c6] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#bcc9c6]/40 bg-white shadow-sm">
            <div className="border-b border-[#bcc9c6]/30 p-5 md:p-6">
              <h2 className="flex items-center gap-2 font-bold text-[#0b1c30]">
                <span className="material-symbols-outlined text-[#00685f]">schedule</span>
                Jam Operasional & Slot Booking Landing
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#6d7a77]">
                Jam buka/tutup tampil di landing. Slot rekomendasi adalah jam cepat yang dipilih pasien; opsi “Jam lain” hanya muncul bila diaktifkan untuk hari tersebut.
              </p>
            </div>

            <div className="space-y-4 p-4 sm:p-5 md:p-6">
              {OPERATIONAL_DAY_KEYS.map((day) => {
                const value = hours[day] ?? makeFallbackDay();
                return (
                  <article key={day} className="rounded-2xl border border-[#bcc9c6]/30 bg-[#f8f9ff] p-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[130px_110px_160px_160px_minmax(220px,1fr)] lg:items-center">
                      <div>
                        <p className="text-sm font-bold text-[#0b1c30]">{OPERATIONAL_DAY_LABELS[day]}</p>
                        <p className="text-[11px] text-[#6d7a77]">{value.enabled ? 'Hari aktif' : 'Libur'}</p>
                        {day === 'sunday' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00685f]/15 text-[#00685f]">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Ahad / Minggu
                          </span>
                        )}
                      </div>

                  <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#bcc9c6]/40 bg-white px-3 text-xs font-medium text-[#3d4947]">
                    <input
                      type="checkbox"
                      checked={value.enabled}
                      onChange={(event) => updateDay(day, { enabled: event.target.checked })}
                      className="accent-[#00685f]"
                    />
                    Buka
                  </label>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77]">Jam buka</label>
                    <input
                      type="time"
                      value={value.open ?? ''}
                      disabled={!value.enabled}
                      onChange={(event) => updateDay(day, { open: event.target.value })}
                      className="h-10 w-full min-w-0 rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm disabled:bg-[#eff4ff]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6d7a77]">Jam tutup</label>
                    <input
                      type="time"
                      value={value.close ?? ''}
                      disabled={!value.enabled}
                      onChange={(event) => updateDay(day, { close: event.target.value })}
                      className="h-10 w-full min-w-0 rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm disabled:bg-[#eff4ff]"
                    />
                  </div>

                  <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#bcc9c6]/40 bg-white px-3 text-xs font-medium text-[#3d4947]">
                    <input
                      type="checkbox"
                      checked={value.allow_custom_booking_time}
                      disabled={!value.enabled}
                      onChange={(event) => updateDay(day, { allow_custom_booking_time: event.target.checked })}
                      className="accent-[#00685f]"
                    />
                    Izinkan pasien pilih jam lain
                  </label>
                </div>

                <div className="mt-4 border-t border-[#bcc9c6]/25 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#3d4947]">Slot rekomendasi</p>
                      <p className="mt-0.5 text-[11px] text-[#6d7a77]">Contoh: 09:00, 11:00, 13:30. Tidak harus berjarak satu jam.</p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <input
                        type="time"
                        step={900}
                        value={slotDrafts[day]}
                        disabled={!value.enabled}
                        onChange={(event) => setSlotDrafts((current) => ({ ...current, [day]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addSlot(day);
                          }
                        }}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm sm:w-36 disabled:bg-[#eff4ff]"
                      />
                      <button
                        type="button"
                        disabled={!value.enabled || !slotDrafts[day]}
                        onClick={() => addSlot(day)}
                        className="h-10 whitespace-nowrap rounded-xl border border-[#00685f] px-4 text-xs font-semibold text-[#00685f] hover:bg-[#00685f]/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        + Tambah Slot
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-9 flex-wrap gap-2">
                    {value.booking_slots.length === 0 ? (
                      <p className="text-xs text-[#6d7a77]">
                        Belum ada slot rekomendasi{value.allow_custom_booking_time ? '. Pasien tetap dapat menggunakan jam digital.' : '.'}
                      </p>
                    ) : (
                      value.booking_slots.map((slot) => (
                        <span key={slot} className="inline-flex items-center gap-1.5 rounded-xl border border-[#00685f]/20 bg-[#00685f]/5 px-3 py-1.5 text-xs font-semibold text-[#00685f]">
                          {slot}
                          <button
                            type="button"
                            onClick={() => removeSlot(day, slot)}
                            className="rounded p-0.5 text-[#6d7a77] hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
                            aria-label={`Hapus slot ${slot}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      </>
      )}

      {(activeSection === 'all' || activeSection === 'registration') && (
      <section className="overflow-hidden rounded-2xl border border-[#bcc9c6]/40 bg-white shadow-sm">
        <div className="border-b border-[#bcc9c6]/30 p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-[#0b1c30]">
                <span className="material-symbols-outlined text-[#00685f]">how_to_reg</span>
                Biaya Pendaftaran
              </h2>
              <p className="mt-1 text-xs text-[#6d7a77]">
                Biaya pendaftaran dapat diberlakukan dengan nominal tersendiri untuk pasien baru dan pasien lama sesuai kebijakan Owner.
              </p>
            </div>
            <label className="inline-flex items-center gap-2.5 cursor-pointer rounded-xl border border-[#bcc9c6]/50 bg-[#eff4ff]/60 px-3.5 py-2 hover:bg-[#eff4ff] transition-colors">
              <input
                type="checkbox"
                checked={feeEnabled}
                onChange={(event) => setFeeEnabled(event.target.checked)}
                className="h-4 w-4 rounded accent-[#00685f]"
              />
              <span className="text-xs font-semibold text-[#0b1c30]">Aktifkan Biaya Pendaftaran</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">
          {/* ── Pasien Baru ── */}
          <div className={`rounded-xl border p-4 transition-all ${
            feeEnabled && feeNew
              ? 'border-[#00685f]/30 bg-[#f0fdf9]/30 ring-1 ring-[#00685f]/10'
              : 'border-[#bcc9c6]/40 bg-[#f8faf9]/50 opacity-75'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feeNew}
                  onChange={(event) => setFeeNew(event.target.checked)}
                  disabled={!feeEnabled}
                  className="h-4 w-4 rounded accent-[#00685f] disabled:cursor-not-allowed"
                />
                <span className="text-sm font-bold text-[#0b1c30]">Pasien Baru</span>
              </label>
              <span className="text-[11px] font-medium text-[#00685f] bg-[#e0f4f1] px-2 py-0.5 rounded-full">
                Kunjungan Pertama
              </span>
            </div>
            <div>
              <label htmlFor="registration-fee-new" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
                Nominal Pasien Baru
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
                <input
                  id="registration-fee-new"
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(feeNewAmount)}
                  onChange={(event) => {
                    const num = parseNumberFromDots(event.target.value);
                    setFeeNewAmount(num ? String(num) : '0');
                  }}
                  disabled={!feeEnabled || !feeNew}
                  placeholder="0"
                  className="h-11 w-full min-w-0 rounded-xl border border-[#bcc9c6] pl-10 pr-4 text-sm font-semibold text-[#0b1c30] outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10 disabled:bg-[#eff4ff] disabled:text-[#6d7a77]"
                />
              </div>
            </div>
          </div>

          {/* ── Pasien Lama ── */}
          <div className={`rounded-xl border p-4 transition-all ${
            feeEnabled && feeExisting
              ? 'border-[#00685f]/30 bg-[#f0fdf9]/30 ring-1 ring-[#00685f]/10'
              : 'border-[#bcc9c6]/40 bg-[#f8faf9]/50 opacity-75'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feeExisting}
                  onChange={(event) => setFeeExisting(event.target.checked)}
                  disabled={!feeEnabled}
                  className="h-4 w-4 rounded accent-[#00685f] disabled:cursor-not-allowed"
                />
                <span className="text-sm font-bold text-[#0b1c30]">Pasien Lama</span>
              </label>
              <span className="text-[11px] font-medium text-[#3d4947] bg-[#eff4ff] px-2 py-0.5 rounded-full">
                Kunjungan Ulang
              </span>
            </div>
            <div>
              <label htmlFor="registration-fee-existing" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
                Nominal Pasien Lama
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
                <input
                  id="registration-fee-existing"
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(feeExistingAmount)}
                  onChange={(event) => {
                    const num = parseNumberFromDots(event.target.value);
                    setFeeExistingAmount(num ? String(num) : '0');
                  }}
                  disabled={!feeEnabled || !feeExisting}
                  placeholder="0"
                  className="h-11 w-full min-w-0 rounded-xl border border-[#bcc9c6] pl-10 pr-4 text-sm font-semibold text-[#0b1c30] outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10 disabled:bg-[#eff4ff] disabled:text-[#6d7a77]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── Hari Libur Khusus & Libur Nasional ── */}
      {(activeSection === 'all' || activeSection === 'holidays') && (
      <section className="overflow-hidden rounded-2xl border border-[#bcc9c6]/40 bg-white shadow-sm">
        <div className="border-b border-[#bcc9c6]/30 p-5 md:p-6 bg-[#f0fdf9]/50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00685f]">event_busy</span>
                <h2 className="font-bold text-[#0b1c30]">Hari Libur Khusus & Libur Nasional</h2>
              </div>
              <p className="mt-1 text-xs text-[#6d7a77]">
                Tentukan tanggal libur spesifik (cuti bersama, hari raya, atau renovasi). Booking publik otomatis tertutup pada tanggal ini.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#ba1a1a]/10 px-3 py-1 text-xs font-semibold text-[#ba1a1a]">
              {holidays.length} tanggal libur ditetapkan
            </span>
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-5">
          {/* Form tambah libur */}
          <div className="rounded-xl border border-[#bcc9c6]/40 bg-[#f8f9ff] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#3d4947]">
              + Tambah Tanggal Libur
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#6d7a77]">Tanggal</label>
                <input
                  type="date"
                  value={holidayDraft.date}
                  onChange={(e) => setHolidayDraft((prev) => ({ ...prev, date: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#6d7a77]">Keterangan / Nama Hari Libur</label>
                <input
                  type="text"
                  placeholder="Contoh: Libur Nasional Idul Fitri, Cuti Bersama, Renovasi Ruang"
                  value={holidayDraft.name}
                  onChange={(e) => setHolidayDraft((prev) => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHoliday();
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={addHoliday}
                className="h-11 rounded-xl bg-[#00685f] px-5 text-xs font-semibold text-white hover:bg-[#008378] transition-colors shadow-sm"
              >
                + Tambah Libur
              </button>
            </div>
          </div>

          {/* List tanggal libur */}
          {holidays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#bcc9c6] p-6 text-center text-xs text-[#6d7a77]">
              Belum ada tanggal libur khusus yang ditetapkan. Klinik mengikuti jadwal hari buka/tutup rutin di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {holidays.map((holiday) => (
                <div
                  key={holiday.date}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/20 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">calendar_today</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#ba1a1a]">{holiday.date}</p>
                      <p className="text-xs text-[#0b1c30] truncate">{holiday.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHoliday(holiday.date)}
                    className="rounded-lg p-1 text-[#ba1a1a] hover:bg-[#ba1a1a]/15 transition-colors"
                    title="Hapus tanggal libur ini"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <div className="sticky bottom-3 z-20 flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={updateSettings.isPending}
          className="h-11 rounded-xl gradient-btn px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  );
}
