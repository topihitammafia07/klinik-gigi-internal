import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  bg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
  description?: string;
}

export function MetricCard({
  label, value, icon, bg, iconColor,
  trend, trendUp, isLoading, description,
}: MetricCardProps) {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-3" role="region" aria-label={label}>
      <div className="flex justify-between items-start">
        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center ${iconColor}`}>
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'wght' 300, 'FILL' 1" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
        {trend && !isLoading && (
          <span
            className={`text-[10px] font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
              trendUp ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#ffdad6] text-[#ba1a1a]'
            }`}
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
              {trendUp ? 'trending_up' : 'trending_down'}
            </span>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-[#3d4947]">{label}</p>
        {isLoading ? (
          <div className="h-7 w-24 bg-[#eff4ff] rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">{value}</p>
        )}
        {description && !isLoading && (
          <p className="text-[11px] text-[#3d4947] mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-[#eff4ff]" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 bg-[#eff4ff] rounded" />
        <div className="h-7 w-24 bg-[#eff4ff] rounded" />
      </div>
    </div>
  );
}
