// lib/exportToXlsx.ts
// Requires: npm install xlsx-js-style
// (xlsx-js-style adalah fork drop-in dari SheetJS "xlsx" yang menambah dukungan
// styling cell — package "xlsx" versi gratis TIDAK bisa styling .xlsx biner)
import * as XLSX from 'xlsx-js-style';

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string | number;
}

const HEADER_STYLE = {
  font: { bold: true },
  fill: { fgColor: { rgb: 'FFFF00' } }, // kuning
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
} as const;

const CELL_BORDER_STYLE = {
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
} as const;

export function exportToXlsx<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = 'Data'
): void {
  // Kolom "No" otomatis di posisi paling depan, terisi 1..N mengikuti urutan data
  const allColumns: ExportColumn<T>[] = [
    { key: '__no__', label: 'No' },
    ...columns,
  ];

  const rows = data.map((item, idx) => {
    const row: Record<string, unknown> = {};
    allColumns.forEach((col) => {
      if (col.key === '__no__') {
        row[col.label] = idx + 1;
        return;
      }
      const raw = (item as Record<string, unknown>)[col.key as string];
      let val = col.format ? col.format(raw, item) : (raw ?? '—');

      // Otomatis format ribuan bertitik Indonesia (.toLocaleString('id-ID')) untuk kolom nominal/keuangan jika masih number murni
      const isRupiahOrNumericCol =
        col.label.includes('(Rp)') ||
        col.label.includes('Revenue') ||
        col.label.includes('Tagihan') ||
        col.label.includes('Biaya') ||
        col.label.includes('Nominal') ||
        col.label.includes('Omzet');

      if (isRupiahOrNumericCol && typeof val === 'number') {
        val = val.toLocaleString('id-ID');
      }

      row[col.label] = val;
    });
    return row;
  });

  const headers = allColumns.map((col) => col.label);
  const aoa = [headers, ...rows.map((r) => headers.map((h) => r[h]))];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-width columns
  const colWidths = allColumns.map((col) => ({
    wch:
      col.key === '__no__'
        ? Math.max(4, col.label.length + 2)
        : Math.max(
            col.label.length + 2,
            ...rows.map((r) => String(r[col.label] ?? '').length)
          ),
  }));
  ws['!cols'] = colWidths;

  // Header row agak dilebarkan (tinggi baris)
  ws['!rows'] = [{ hpt: 28 }];

  // Terapkan style: header (bold, background kuning, center-center, border)
  // dan border + alignment di setiap sel data
  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddr];
      if (!cell) continue;

      if (R === 0) {
        cell.s = HEADER_STYLE;
      } else {
        const col = allColumns[C];
        const isCenter = col?.key === '__no__';
        const isRight =
          col?.label?.includes('(Rp)') ||
          col?.label?.includes('Revenue') ||
          col?.label?.includes('Tagihan') ||
          col?.label?.includes('Biaya') ||
          col?.label?.includes('Nominal') ||
          col?.label?.includes('Omzet') ||
          col?.label?.includes('Jumlah') ||
          col?.label?.includes('Sesi') ||
          col?.label?.includes('Qty') ||
          col?.label?.includes('Layanan');

        cell.s = {
          ...CELL_BORDER_STYLE,
          alignment: {
            horizontal: isCenter ? 'center' : isRight ? 'right' : 'left',
            vertical: 'center',
          },
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}