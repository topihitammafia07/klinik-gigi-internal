'use client';

import { TherapistActivity } from '@/types/dashboard';

interface TherapistActivityTableProps {
  data: TherapistActivity[];
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#bcc9c6]/10 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#eff4ff]" />
          <div className="h-4 w-32 bg-[#eff4ff] rounded" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-4 w-10 bg-[#eff4ff] rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-10 bg-[#eff4ff] rounded" /></td>
      <td className="px-4 py-3"><div className="h-2 w-full bg-[#eff4ff] rounded-full" /></td>
    </tr>
  );
}

export function TherapistActivityTable({ data, isLoading }: TherapistActivityTableProps) {
  const maxVisits = data?.length ? Math.max(...data.map((t) => t.visit_count), 1) : 1;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#bcc9c6] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#00685f]" style={{ fontVariationSettings: "'FILL' 1" }}>
            medical_services
          </span>
          Aktivitas Terapis
        </h3>
        {!isLoading && data?.length > 0 && (
          <span className="text-xs text-[#6d7a77]">{data.length} terapis aktif</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#eff4ff]/50 border-b border-[#bcc9c6]/20">
              {['Terapis', 'Total Visit', 'Selesai', 'Progres'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : !data?.length
              ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#bcc9c6]">
                      <span className="material-symbols-outlined text-3xl">people</span>
                      <p className="text-sm">Belum ada data aktivitas terapis</p>
                    </div>
                  </td>
                </tr>
              )
              : data.map((t) => {
                const pct = Math.round((t.done_count / Math.max(t.visit_count, 1)) * 100);
                const barWidth = Math.round((t.visit_count / maxVisits) * 100);

                return (
                  <tr
                    key={t.therapist_id}
                    className="border-b border-[#bcc9c6]/10 hover:bg-[#f0fdf9]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00685f]/15 text-[#00685f] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {t.therapist_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#0b1c30] truncate max-w-[140px]">
                          {t.therapist_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[#0b1c30] tabular-nums">{t.visit_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          pct >= 80 ? 'bg-[#dcfce7] text-[#14532d]' :
                          pct >= 50 ? 'bg-[#fef3c7] text-[#92400e]' :
                          'bg-[#e0f2fe] text-[#0369a1]'
                        }`}
                      >
                        {t.done_count}
                        <span className="font-normal opacity-70">({pct}%)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="w-full bg-[#eff4ff] rounded-full h-2">
                        <div
                          className="bg-[#00685f] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                          title={`${t.visit_count} visit`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
