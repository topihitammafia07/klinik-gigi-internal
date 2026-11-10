'use client';

import { useState, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

const PRESETS: { label: string; getRange: () => { start: string; end: string } }[] = [
  { label: 'Hari Ini',          getRange: () => ({ start: today(), end: today() }) },
  { label: '7 Hari Terakhir',   getRange: () => ({ start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: today() }) },
  { label: '30 Hari Terakhir',  getRange: () => ({ start: format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: today() }) },
  { label: 'Bulan Ini',         getRange: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Bulan Lalu',        getRange: () => ({ start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'Tahun Ini',         getRange: () => ({ start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(endOfYear(new Date()), 'yyyy-MM-dd') }) },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    const range = preset.getRange();
    onChange({ ...range, label: preset.label });
    setCustomStart(range.start);
    setCustomEnd(range.end);
    setOpen(false);
  }, [onChange]);

  const applyCustom = useCallback(() => {
    if (!customStart || !customEnd || customStart > customEnd) return;
    onChange({ start: customStart, end: customEnd, label: 'Custom' });
    setOpen(false);
  }, [customStart, customEnd, onChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-[#bcc9c6] text-[#0b1c30] text-sm rounded-lg hover:border-[#00685f] hover:text-[#00685f] transition-colors shadow-sm"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
        <span className="font-medium">{value.label}</span>
        <span className="text-[#6d7a77] text-xs">
          {value.start !== value.end ? `${value.start} — ${value.end}` : value.start}
        </span>
        <span className="material-symbols-outlined text-[16px] text-[#6d7a77]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#bcc9c6] rounded-xl shadow-xl min-w-[280px] overflow-hidden">
            {/* Presets */}
            <div className="p-2 border-b border-[#bcc9c6]/40">
              <p className="text-[10px] font-semibold text-[#6d7a77] uppercase tracking-wider px-2 mb-1.5">Periode Cepat</p>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      value.label === p.label
                        ? 'bg-[#00685f]/10 text-[#00685f] font-semibold'
                        : 'hover:bg-[#eff4ff] text-[#3d4947]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom range */}
            <div className="p-3">
              <p className="text-[10px] font-semibold text-[#6d7a77] uppercase tracking-wider mb-2">Rentang Custom</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#3d4947] w-12 flex-shrink-0">Dari</label>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || today()}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 text-xs border border-[#bcc9c6] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] outline-none text-[#0b1c30]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#3d4947] w-12 flex-shrink-0">Sampai</label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={today()}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 text-xs border border-[#bcc9c6] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] outline-none text-[#0b1c30]"
                  />
                </div>
                <button
                  onClick={applyCustom}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  className="w-full py-2 bg-[#00685f] text-white text-xs font-semibold rounded-lg hover:bg-[#008378] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
