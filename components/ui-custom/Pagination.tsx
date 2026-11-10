'use client';

import React from 'react';

interface PaginationProps {
  page?: number;
  currentPage?: number;
  totalPages?: number;
  lastPage?: number;
  total: number;
  perPage?: number;
  perPageOptions?: number[];
  itemName?: string;
  onPageChange: (newPage: number) => void;
  onPerPageChange?: (newPerPage: number) => void;
  className?: string;
}

export function Pagination({
  page: propPage,
  currentPage: propCurrentPage,
  totalPages: propTotalPages,
  lastPage: propLastPage,
  total,
  perPage = 10,
  perPageOptions = [5, 10, 20],
  itemName = 'data',
  onPageChange,
  onPerPageChange,
  className = '',
}: PaginationProps) {
  const page = propPage ?? propCurrentPage ?? 1;
  const totalPages = propTotalPages ?? propLastPage ?? 1;

  if (total === 0) return null;

  const from = Math.min((page - 1) * perPage + 1, total);
  const to = Math.min(page * perPage, total);

  // Generate numbered pages window (up to 5 buttons)
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div
      className={`px-5 py-3 border-t border-[#bcc9c6]/30 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8f9ff]/60 text-xs text-[#3d4947] ${className}`}
    >
      {/* Left: Info and Per-Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Menampilkan <strong className="text-[#0b1c30]">{from}–{to}</strong> dari{' '}
          <strong className="text-[#0b1c30]">{total}</strong> {itemName}
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l border-[#bcc9c6]/40">
            <label htmlFor="per-page-select" className="text-[#6d7a77]">
              Tampilkan:
            </label>
            <select
              id="per-page-select"
              value={perPage}
              onChange={(e) => {
                const next = Number(e.target.value);
                onPerPageChange(next);
                onPageChange(1);
              }}
              className="h-8 rounded-lg border border-[#bcc9c6] bg-white px-2 py-0.5 text-xs font-semibold text-[#0b1c30] outline-none focus:border-[#00685f]"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        {totalPages > maxButtons && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            title="Halaman Pertama"
            aria-label="Halaman Pertama"
            className="p-1.5 rounded-lg border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">first_page</span>
          </button>
        )}

        {/* Prev Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          title="Halaman Sebelumnya"
          aria-label="Halaman Sebelumnya"
          className="p-1.5 rounded-lg border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>

        {/* Page Numbers */}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-[#00685f] text-white shadow-sm'
                : 'text-[#3d4947] hover:bg-[#eff4ff] border border-transparent hover:border-[#bcc9c6]/40'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          title="Halaman Berikutnya"
          aria-label="Halaman Berikutnya"
          className="p-1.5 rounded-lg border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>

        {/* Last Page */}
        {totalPages > maxButtons && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title="Halaman Terakhir"
            aria-label="Halaman Terakhir"
            className="p-1.5 rounded-lg border border-[#bcc9c6]/60 text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">last_page</span>
          </button>
        )}
      </div>
    </div>
  );
}
