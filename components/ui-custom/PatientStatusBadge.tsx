import { PatientStatus } from '@/types/patient';

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

const LABELS: Record<PatientStatus, string> = {
  new: 'Pasien Baru',
  old: 'Pasien Lama',
};

const COLORS: Record<PatientStatus, string> = {
  new: 'bg-[#dcfce7] text-[#14532d]',
  old: 'bg-[#e0f2fe] text-[#0369a1]',
};

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${COLORS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}