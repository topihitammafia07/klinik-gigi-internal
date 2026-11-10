/**
 * Format string/angka ke format ribuan bertitik Indonesia: mis. 1000000 -> "1.000.000"
 */
export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('id-ID');
}

/**
 * Parse string bertitik kembali ke integer number murni: mis. "1.000.000" -> 1000000
 */
export function parseNumberFromDots(val: string | number | undefined | null): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const clean = String(val).replace(/\D/g, '');
  return clean ? Number(clean) : 0;
}
