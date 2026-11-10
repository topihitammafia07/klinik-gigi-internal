import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Billing } from '@/types/billing';

const CLINIC = {
  address: 'Jl. Elang 20 Pandowo RT 01 RW 06 Joho Sukoharjo 57513',
  phone: '087736339217 | 081225907486',
};

function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '—';

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '—';

  return `${years} Tahun ${months} Bulan`;
}

const INK = '#0b1c30';
const MUTED = '#5b6a68';
const LINE = '#9fb0ad';
const ACCENT = '#00685f';
const WARNING = '#8a5a00';

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9, fontFamily: 'Helvetica', color: INK },
  headerRow: { alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  logo: { width: 190, height: 54, objectFit: 'contain' },
  clinicContact: { fontSize: 7.3, color: MUTED, textAlign: 'center', marginTop: 3 },
  invoiceTitleWrap: { position: 'absolute', top: 0, right: 0, alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 18, fontWeight: 700, color: ACCENT, letterSpacing: 0.8 },
  invoiceNumber: { fontSize: 8, color: MUTED, marginTop: 2 },
  draftLabel: { fontSize: 7.5, color: WARNING, marginTop: 3, fontWeight: 700 },
  headRule: { borderBottomWidth: 2, borderBottomColor: ACCENT, marginBottom: 13 },
  sectionLabel: { fontSize: 9, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  infoBox: { borderWidth: 1, borderColor: LINE, padding: 10, marginBottom: 13 },
  infoCols: { flexDirection: 'row' },
  infoCol: { width: '50%' },
  infoLine: { flexDirection: 'row', marginBottom: 4 },
  infoKey: { width: 88, color: MUTED },
  infoColon: { width: 8, color: MUTED },
  infoVal: { flex: 1, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: LINE, marginBottom: 11 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8e7', paddingVertical: 5 },
  headRow: { flexDirection: 'row', backgroundColor: '#eef3f2', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6 },
  th: { fontSize: 7.3, fontWeight: 700, color: MUTED, textTransform: 'uppercase' },
  td: { fontSize: 8.3 },
  colNo: { width: '6%', textAlign: 'center', paddingHorizontal: 4 },
  colItem: { width: '46%', paddingHorizontal: 4 },
  colQty: { width: '10%', textAlign: 'center', paddingHorizontal: 4 },
  colPrice: { width: '19%', textAlign: 'right', paddingHorizontal: 4 },
  colSubtotal: { width: '19%', textAlign: 'right', paddingHorizontal: 4 },
  summaryWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  summaryBox: { width: '58%' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e2e8e7' },
  summaryKey: { color: MUTED },
  summaryVal: { fontWeight: 700 },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingTop: 7, borderTopWidth: 1.5, borderTopColor: ACCENT },
  grandLabel: { fontSize: 10.5, fontWeight: 700 },
  grandVal: { fontSize: 12.5, fontWeight: 700, color: ACCENT },
  paymentBox: { marginTop: 13, borderWidth: 1, borderColor: LINE },
  paymentHead: { backgroundColor: '#eef3f2', paddingVertical: 5, paddingHorizontal: 7, fontSize: 8, fontWeight: 700 },
  paymentRow: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 7, borderTopWidth: 0.5, borderTopColor: '#e2e8e7' },
  paymentDate: { width: '30%' },
  paymentMethod: { width: '25%' },
  paymentNote: { width: '25%', color: MUTED },
  paymentAmount: { width: '20%', textAlign: 'right', fontWeight: 700 },
  statusBadgeWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  statusBadge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1 },
  disclaimer: { textAlign: 'center', fontSize: 8, color: MUTED, marginTop: 16 },
  draftNotice: { textAlign: 'center', fontSize: 8, color: WARNING, marginTop: 8, fontWeight: 700 },
  footer: { position: 'absolute', bottom: 24, left: 34, right: 34, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

const STATUS_LABEL: Record<string, string> = {
  paid: 'LUNAS',
  unpaid: 'BELUM BAYAR',
  partial: 'SEBAGIAN DIBAYAR',
};

const STATUS_COLOR: Record<string, string> = {
  paid: '#0f7a4d',
  unpaid: '#b3261e',
  partial: '#b3720e',
};

interface InvoicePdfProps {
  billing: Billing;
  logoSrc?: string;
}

export function InvoicePdf({ billing, logoSrc }: InvoicePdfProps) {
  const invoiceNumber = `INV-${String(billing.id).padStart(6, '0')}`;
  const patientName = billing.patient?.full_name ?? `#${billing.patient_id}`;
  const items = billing.items ?? [];
  const charges = billing.charges ?? [];
  const payments = billing.payments ?? [];
  const serviceSubtotal = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const chargesSubtotal = charges.reduce((sum, charge) => sum + (charge.subtotal ?? 0), 0);
  const therapistName = billing.appointment?.therapist_name ?? billing.visit?.therapist_name ?? '—';
  const visitDate = billing.visit?.visit_date ?? billing.appointment?.appointment_date ?? billing.created_at;
  const statusKey = billing.payment_status;
  const paymentMethod = payments.length > 1
    ? `Bertahap (${payments.length} transaksi)`
    : payments[0]?.payment_method ?? billing.payment_method ?? '—';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          <Text style={styles.clinicContact}>{CLINIC.address}</Text>
          <Text style={styles.clinicContact}>{CLINIC.phone}</Text>
          <View style={styles.invoiceTitleWrap}>
            <Text style={styles.invoiceTitle}>{billing.is_draft_from_booking ? 'TAGIHAN' : 'INVOICE'}</Text>
            <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            {billing.is_draft_from_booking ? <Text style={styles.draftLabel}>DRAFT / SEMENTARA</Text> : null}
          </View>
        </View>
        <View style={styles.headRule} />

        <Text style={styles.sectionLabel}>Rincian Tagihan Terapi</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoCols}>
            <View style={styles.infoCol}>
              <View style={styles.infoLine}><Text style={styles.infoKey}>No. Invoice</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{invoiceNumber}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Nama Pasien</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{patientName}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Usia Pasien</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{calculateAge(billing.patient?.birth_date)}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Tanggal</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{formatDate(visitDate)}</Text></View>
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Terapis</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{therapistName}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Status Bayar</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{STATUS_LABEL[statusKey] ?? statusKey}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Metode Bayar</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{paymentMethod}</Text></View>
              <View style={styles.infoLine}><Text style={styles.infoKey}>Terbit/Cetak</Text><Text style={styles.infoColon}>:</Text><Text style={styles.infoVal}>{formatDateTime(billing.printed_at)}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.th, styles.colNo]}>No</Text>
            <Text style={[styles.th, styles.colItem]}>Layanan / Biaya</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Harga</Text>
            <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
          </View>

          {items.map((item, index) => (
            <View style={styles.row} key={`item-${item.id}`}>
              <Text style={[styles.td, styles.colNo]}>{index + 1}</Text>
              <Text style={[styles.td, styles.colItem]}>{item.service?.name ?? `Layanan #${item.service_id}`}</Text>
              <Text style={[styles.td, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.td, styles.colPrice]}>{formatRupiah(item.price)}</Text>
              <Text style={[styles.td, styles.colSubtotal]}>{formatRupiah(item.subtotal)}</Text>
            </View>
          ))}

          {charges.map((charge, index) => (
            <View style={styles.row} key={`charge-${charge.id}`}>
              <Text style={[styles.td, styles.colNo]}>{items.length + index + 1}</Text>
              <Text style={[styles.td, styles.colItem]}>{charge.label}</Text>
              <Text style={[styles.td, styles.colQty]}>{charge.qty}</Text>
              <Text style={[styles.td, styles.colPrice]}>{formatRupiah(charge.amount)}</Text>
              <Text style={[styles.td, styles.colSubtotal]}>{formatRupiah(charge.subtotal)}</Text>
            </View>
          ))}

          {items.length === 0 && charges.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.td, styles.colNo]}>1</Text>
              <Text style={[styles.td, styles.colItem]}>Belum ada item tagihan</Text>
              <Text style={[styles.td, styles.colQty]}>—</Text>
              <Text style={[styles.td, styles.colPrice]}>—</Text>
              <Text style={[styles.td, styles.colSubtotal]}>—</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryLine}><Text style={styles.summaryKey}>Total Layanan</Text><Text style={styles.summaryVal}>{formatRupiah(serviceSubtotal)}</Text></View>
            {chargesSubtotal > 0 ? <View style={styles.summaryLine}><Text style={styles.summaryKey}>Biaya Tambahan</Text><Text style={styles.summaryVal}>{formatRupiah(chargesSubtotal)}</Text></View> : null}
            <View style={styles.grandRow}><Text style={styles.grandLabel}>Total Tagihan</Text><Text style={styles.grandVal}>{formatRupiah(billing.total_amount)}</Text></View>
            <View style={styles.summaryLine}><Text style={styles.summaryKey}>Sudah Dibayar</Text><Text style={styles.summaryVal}>{formatRupiah(billing.paid_amount)}</Text></View>
            <View style={styles.summaryLine}><Text style={styles.summaryKey}>Sisa Tagihan</Text><Text style={styles.summaryVal}>{formatRupiah(billing.remaining_amount)}</Text></View>
          </View>
        </View>


        <View style={styles.statusBadgeWrap}>
          <Text style={[styles.statusBadge, { color: STATUS_COLOR[statusKey] ?? INK, borderColor: STATUS_COLOR[statusKey] ?? LINE }]}>
            {STATUS_LABEL[statusKey] ?? statusKey}
          </Text>
        </View>

        {billing.is_draft_from_booking ? (
          <Text style={styles.draftNotice}>DRAFT — rincian final dapat berubah setelah tindakan selesai dan invoice dikonfirmasi.</Text>
        ) : null}
        <Text style={styles.disclaimer}>DOKUMEN INI DIHASILKAN OTOMATIS OLEH SISTEM</Text>
        <View style={styles.footer} fixed />
      </Page>
    </Document>
  );
}
