'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalSearch, SearchResult, SearchResultType } from '@/hooks/useGlobalSearch';

// ─────────────────────────────────────────────────────────
// Icon map per tipe hasil
// ─────────────────────────────────────────────────────────
const TYPE_META: Record<SearchResultType, { icon: string; label: string; color: string }> = {
  patient:     { icon: 'person',         label: 'Pasien',  color: 'text-[#00685f]' },
  appointment: { icon: 'calendar_month', label: 'Jadwal',  color: 'text-[#3b5fc0]' },
  billing:     { icon: 'receipt_long',   label: 'Invoice', color: 'text-[#b45309]' },
};

// ─────────────────────────────────────────────────────────
// Highlight — bold bagian yang cocok dengan query
// ─────────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[#00685f]/20 text-[#00685f] font-semibold rounded-[2px] px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// ResultItem
// ─────────────────────────────────────────────────────────
function ResultItem({
  result,
  query,
  isActive,
  onMouseEnter,
  onClick,
}: {
  result: SearchResult;
  query: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const meta = TYPE_META[result.type];
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors
        ${isActive ? 'bg-[#eff4ff]' : 'hover:bg-[#f8f9ff]'}
      `}
    >
      {/* Icon */}
      <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${meta.color}`}>
        {meta.icon}
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#0b1c30] truncate">
          <Highlight text={result.label} query={query} />
        </p>
        <p className="text-xs text-[#3d4947]/70 truncate mt-0.5">
          <Highlight text={result.sub} query={query} />
        </p>
      </div>

      {/* Badge tipe */}
      <span
        className={`
          shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          bg-[#eff4ff] ${meta.color} self-center
        `}
      >
        {meta.label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#3d4947]/50">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────
export function GlobalSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { data, isFetching } = useGlobalSearch(query);

  // ── Flatten semua hasil ke satu array untuk navigasi keyboard ──
  const allResults: SearchResult[] = [
    ...(data?.patients ?? []),
    ...(data?.appointments ?? []),
    ...(data?.billings ?? []),
  ];

  // Buka dropdown saat ada hasil atau sedang loading
  useEffect(() => {
    if (query.trim().length >= 2) {
      setOpen(true);
      setActiveIndex(-1);
    } else {
      setOpen(false);
    }
  }, [query, data]);

  // Tutup saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigasi keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && allResults[activeIndex]) {
          handleSelect(allResults[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, allResults, activeIndex]
  );

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery('');
    router.push(result.url);
  }

  const hasResults =
    (data?.patients?.length ?? 0) +
    (data?.appointments?.length ?? 0) +
    (data?.billings?.length ?? 0) > 0;

  // Offset index per section untuk navigasi keyboard
  const patientCount     = data?.patients?.length ?? 0;
  const appointmentCount = data?.appointments?.length ?? 0;

  function getGlobalIndex(type: SearchResultType, localIndex: number) {
    if (type === 'patient') return localIndex;
    if (type === 'appointment') return patientCount + localIndex;
    return patientCount + appointmentCount + localIndex;
  }

  return (
    <div className="relative w-full max-w-md">
      {/* Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">
          {isFetching ? 'progress_activity' : 'search'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Cari pasien, jadwal, atau invoice..."
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 bg-[#eff4ff] border-none rounded-lg text-sm text-[#0b1c30] placeholder:text-[#3d4947]/60 focus:ring-2 focus:ring-[#00685f]/20 focus:outline-none h-10 transition-all"
        />
        {/* Clear button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3d4947]/50 hover:text-[#3d4947] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#bcc9c6]/60 z-50 overflow-hidden max-h-[420px] overflow-y-auto"
        >
          {/* Loading state */}
          {isFetching && !hasResults && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#3d4947]/60">
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Mencari...
            </div>
          )}

          {/* No results */}
          {!isFetching && !hasResults && query.trim().length >= 2 && (
            <div className="px-4 py-4 text-sm text-[#3d4947]/60 text-center">
              <span className="material-symbols-outlined text-[32px] block mb-1 opacity-30">search_off</span>
              Tidak ada hasil untuk &ldquo;<strong>{query}</strong>&rdquo;
            </div>
          )}

          {/* Patients */}
          {(data?.patients?.length ?? 0) > 0 && (
            <>
              <SectionHeader label="Pasien" />
              {data!.patients.map((result, i) => (
                <ResultItem
                  key={`patient-${result.id}`}
                  result={result}
                  query={query}
                  isActive={activeIndex === getGlobalIndex('patient', i)}
                  onMouseEnter={() => setActiveIndex(getGlobalIndex('patient', i))}
                  onClick={() => handleSelect(result)}
                />
              ))}
            </>
          )}

          {/* Appointments */}
          {(data?.appointments?.length ?? 0) > 0 && (
            <>
              <SectionHeader label="Jadwal / Appointment" />
              {data!.appointments.map((result, i) => (
                <ResultItem
                  key={`appointment-${result.id}`}
                  result={result}
                  query={query}
                  isActive={activeIndex === getGlobalIndex('appointment', i)}
                  onMouseEnter={() => setActiveIndex(getGlobalIndex('appointment', i))}
                  onClick={() => handleSelect(result)}
                />
              ))}
            </>
          )}

          {/* Billings */}
          {(data?.billings?.length ?? 0) > 0 && (
            <>
              <SectionHeader label="Invoice / Billing" />
              {data!.billings.map((result, i) => (
                <ResultItem
                  key={`billing-${result.id}`}
                  result={result}
                  query={query}
                  isActive={activeIndex === getGlobalIndex('billing', i)}
                  onMouseEnter={() => setActiveIndex(getGlobalIndex('billing', i))}
                  onClick={() => handleSelect(result)}
                />
              ))}
            </>
          )}

          {/* Footer hint */}
          {hasResults && (
            <div className="px-4 py-2 border-t border-[#bcc9c6]/40 flex items-center gap-2 text-[10px] text-[#3d4947]/40">
              <kbd className="px-1 rounded border border-[#bcc9c6]/60 font-mono">↑↓</kbd> navigasi
              <kbd className="px-1 rounded border border-[#bcc9c6]/60 font-mono">↵</kbd> pilih
              <kbd className="px-1 rounded border border-[#bcc9c6]/60 font-mono">Esc</kbd> tutup
            </div>
          )}
        </div>
      )}
    </div>
  );
}