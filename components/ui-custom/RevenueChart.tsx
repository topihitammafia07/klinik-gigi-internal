'use client';

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { MonthlyRevenue } from '@/types/dashboard';

interface RevenueChartProps {
  data: MonthlyRevenue[];
  isLoading?: boolean;
  variant?: 'area' | 'bar';
  height?: number;
}

function formatRupiah(value: number) {
  return Number(value).toLocaleString('id-ID');
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#bcc9c6] rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-[#0b1c30] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs text-[#3d4947]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span>{p.name === 'revenue' ? 'Pendapatan' : 'Kunjungan'}:</span>
          <span className="font-semibold text-[#0b1c30]">
            {p.name === 'revenue'
              ? `Rp ${p.value.toLocaleString('id-ID')}`
              : `${p.value} visit`}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-[#bcc9c6]">
      <span className="material-symbols-outlined text-4xl">bar_chart</span>
      <p className="text-sm">Belum ada data pendapatan</p>
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full bg-[#eff4ff]/40 rounded-xl animate-pulse flex items-end gap-2 px-2 pb-2"
      style={{ height }}
    >
      {[40, 70, 55, 90, 65, 80, 50, 75, 60, 85, 45, 70].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-[#bcc9c6]/30 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function RevenueChart({ data, isLoading, variant = 'area', height = 240 }: RevenueChartProps) {
  if (isLoading) return <ChartSkeleton height={height} />;
  if (!data?.length) return <div style={{ height }}><EmptyState /></div>;

  const common = {
    data,
    margin: { top: 4, right: 4, left: 0, bottom: 0 },
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === 'area' ? (
        <AreaChart {...common}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00685f" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#00685f" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2170e4" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2170e4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#6d7a77' }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="revenue"
            tickFormatter={formatRupiah}
            tick={{ fontSize: 11, fill: '#6d7a77' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <YAxis
            yAxisId="visits"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6d7a77' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            formatter={(v) => v === 'revenue' ? 'Pendapatan' : 'Kunjungan'}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#00685f"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#00685f' }}
          />
          <Area
            yAxisId="visits"
            type="monotone"
            dataKey="visit_count"
            stroke="#2170e4"
            strokeWidth={2}
            fill="url(#visitGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#2170e4' }}
          />
        </AreaChart>
      ) : (
        <BarChart {...common} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#6d7a77' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={formatRupiah}
            tick={{ fontSize: 11, fill: '#6d7a77' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#00685f" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
