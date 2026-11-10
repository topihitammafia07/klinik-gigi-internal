'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIcfSearch } from '@/hooks/useMedicalRecords';
import type { IcfCode } from '@/types/medical-record';

interface IcfBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: IcfCode) => void;
  selectedCodes: string[];
}

export function IcfBrowserModal({ isOpen, onClose, onSelect, selectedCodes }: IcfBrowserModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const { data: results = [], isFetching } = useIcfSearch(debouncedQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#bcc9c6]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#00685f]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00685f] text-[18px]">
                manage_search
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b1c30]">ICF Browser</h2>
              <p className="text-xs text-[#3d4947]">Cari kode klasifikasi ICF — WHO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#3d4947] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search input */}
        <div className="px-6 py-4 border-b border-[#bcc9c6]/40">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sebutkan deskripsi untuk menemukan kode (min. 3 karakter)..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#bcc9c6] text-sm text-[#0b1c30] bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors"
            />
            {isFetching && (
              <svg
                className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3d4947]"
                fill="none" viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {debouncedQuery.length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#3d4947]">
              <span className="material-symbols-outlined text-4xl text-[#bcc9c6] mb-3">schema</span>
              <p className="text-sm">Ketik minimal 3 huruf Deskripsi untuk mencari kode ICF</p>
            </div>
          )}

          {debouncedQuery.length >= 3 && !isFetching && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#3d4947]">
              <span className="material-symbols-outlined text-4xl text-[#bcc9c6] mb-3">search_off</span>
              <p className="text-sm">Kode ICF tidak ditemukan untuk &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          )}

          {results.map((code) => {
            const isSelected = selectedCodes.includes(code.code);
            return (
              <button
                key={code.code}
                type="button"
                onClick={() => { if (!isSelected) onSelect(code); }}
                disabled={isSelected}
                className={`w-full flex items-start gap-3 px-6 py-3.5 border-b border-[#bcc9c6]/30 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#00685f]/5 cursor-default'
                    : 'hover:bg-[#eff4ff] cursor-pointer'
                }`}
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${
                  isSelected ? 'bg-[#00685f] text-white' : 'bg-[#00685f]/10 text-[#00685f]'
                }`}>
                  {code.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0b1c30] leading-snug">{code.title}</p>
                  {code.definition && (
                    <p className="text-xs text-[#3d4947] mt-0.5 line-clamp-2">{code.definition}</p>
                  )}
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-[#00685f] text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#bcc9c6]/40 bg-[#f8f9ff] flex justify-between items-center">
          <p className="text-xs text-[#3d4947]">
            {selectedCodes.length > 0
              ? `${selectedCodes.length} kode dipilih`
              : 'Belum ada kode dipilih'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#00685f] text-white rounded-lg text-sm font-semibold hover:bg-[#008378] transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
