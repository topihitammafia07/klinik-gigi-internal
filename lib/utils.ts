import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Menghitung usia (tahun & bulan) dari tanggal lahir hingga hari ini.
 * Return format: "Usia: xx Tahun, xx Bulan"
 */
export function calculateAge(birthDate: string | Date): string {
  const birth = new Date(birthDate);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `Usia: ${years} Tahun, ${months} Bulan`;
}