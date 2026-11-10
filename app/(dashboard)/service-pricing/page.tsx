'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useTherapyServices,
  useCreateTherapyService,
  useDeleteTherapyService,
} from '@/hooks/useBilling';
import {
  useAgePrices,
  useCreateAgePrice,
  useDeleteAgePrice,
  useUpdateAgePrice,
  useUpdateTherapyService,
  type AgePricePayload,
} from '@/hooks/useClinicSettings';
import { useToast } from '@/components/ui-custom/Toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TherapyService } from '@/types/billing';
import type { TherapyServiceAgePrice } from '@/types/clinic-settings';
import { formatNumberWithDots, parseNumberFromDots } from '@/lib/currency';
import { Pagination } from '@/components/ui-custom/Pagination';

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Fisioterapi', label: 'Fisioterapi' },
  { value: 'Okupasi Terapi', label: 'Okupasi Terapi (OT)' },
  { value: 'Terapi Wicara', label: 'Terapi Wicara (TW)' },
  { value: 'Tumbuh Kembang', label: 'Tumbuh Kembang' },
  { value: 'Ortotik Prostetik', label: 'Ortotik Prostetik' },
  { value: 'observasi', label: 'Observasi & Konsultasi' },
  { value: 'Akupuntur', label: 'Akupuntur' },
  { value: 'Bekam', label: 'Bekam' },
  { value: 'obat_alat', label: 'Obat & Alat' },
];

function normalizeCategoryKey(cat: string): string {
  const c = (cat || '').trim().toLowerCase();
  if (c === 'obat_alat' || c === 'obat & alat' || c === 'obat dan alat') return 'obat_alat';
  if (c === 'fisioterapi' || c === 'fisioterapi umum' || c === 'fisioterapi_dewasa' || c === 'fisioterapi dewasa') return 'fisioterapi';
  if (c === 'okupasi terapi' || c === 'okupasi' || c === 'ot') return 'okupasi terapi';
  if (c === 'terapi wicara' || c === 'wicara' || c === 'tw') return 'terapi wicara';
  if (c === 'tumbuh kembang' || c === 'baby massage' || c === 'stimulasi tumbuh kembang') return 'tumbuh kembang';
  if (c === 'ortotik prostetik' || c === 'ortotik') return 'ortotik prostetik';
  if (c === 'observasi' || c === 'konsultasi') return 'observasi';
  return c;
}

const CATEGORY_MAP: Record<string, string> = {
  fisioterapi: 'Fisioterapi',
  fisioterapi_dewasa: 'Fisioterapi',
  obat_alat: 'Obat & Alat',
  'obat & alat': 'Obat & Alat',
  'obat dan alat': 'Obat & Alat',
  ot: 'Okupasi Terapi (OT)',
  'okupasi terapi': 'Okupasi Terapi (OT)',
  tw: 'Terapi Wicara (TW)',
  'terapi wicara': 'Terapi Wicara (TW)',
  observasi: 'Observasi & Konsultasi',
  'tumbuh kembang': 'Tumbuh Kembang',
  akupuntur: 'Akupuntur',
  bekam: 'Bekam',
  'ortotik prostetik': 'Ortotik Prostetik',
};

function formatCategoryLabel(cat: string): string {
  const key = normalizeCategoryKey(cat);
  return CATEGORY_MAP[key] || cat || 'Fisioterapi';
}

interface AgeDraft {
  categoryName: string;
  minAge: string;
  maxAge: string;
  price: string;
}

const EMPTY_AGE_DRAFT: AgeDraft = {
  categoryName: '',
  minAge: '',
  maxAge: '',
  price: '',
};

function toPayload(draft: AgeDraft, isActive = true): AgePricePayload | null {
  const minAge = Number(draft.minAge);
  const maxAge = draft.maxAge === '' ? null : Number(draft.maxAge);
  const price = Number(draft.price);

  if (!draft.categoryName.trim() || !Number.isFinite(minAge) || !Number.isFinite(price)) return null;
  if (minAge < 0 || price < 0) return null;
  if (maxAge !== null && (!Number.isFinite(maxAge) || maxAge < minAge)) return null;

  return {
    category_name: draft.categoryName.trim(),
    min_age: minAge,
    max_age: maxAge,
    price,
    is_active: isActive,
  };
}

interface ServiceFormState {
  name: string;
  category: string;
  duration: number;
  price: number;
  price_type: 'fixed' | 'flexible';
  is_flexible_price: boolean;
  is_active: boolean;
  description: string;
}

const DEFAULT_SERVICE_FORM: ServiceFormState = {
  name: '',
  category: 'Fisioterapi',
  duration: 45,
  price: 80000,
  price_type: 'fixed',
  is_flexible_price: false,
  is_active: true,
  description: '',
};

function ServicePricingCard({ service }: { service: TherapyService }) {
  const toast = useToast();
  const updateService = useUpdateTherapyService();
  const deleteService = useDeleteTherapyService();
  const agePrices = useAgePrices(service.id);
  const createAgePrice = useCreateAgePrice();
  const updateAgePrice = useUpdateAgePrice();
  const deleteAgePrice = useDeleteAgePrice();

  const [basePrice, setBasePrice] = useState(String(service.price));
  const [draft, setDraft] = useState<AgeDraft>(EMPTY_AGE_DRAFT);
  const [editing, setEditing] = useState<TherapyServiceAgePrice | null>(null);
  const [editDraft, setEditDraft] = useState<AgeDraft>(EMPTY_AGE_DRAFT);

  // Modal edit detail layanan
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ServiceFormState>({
    name: service.name,
    category: service.category,
    duration: service.duration,
    price: service.price,
    price_type: (service.price_type as 'fixed' | 'flexible') || (service.is_flexible_price ? 'flexible' : 'fixed'),
    is_flexible_price: Boolean(service.is_flexible_price || service.price_type === 'flexible'),
    is_active: service.is_active ?? true,
    description: service.description || '',
  });

  useEffect(() => {
    setBasePrice(String(service.price));
  }, [service.price]);

  async function saveBasePrice() {
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.info('Harga tidak valid', 'Masukkan nominal harga dasar yang benar.');
      return;
    }

    try {
      await updateService.mutateAsync({ id: service.id, payload: { price } });
      toast.success(
        'Harga layanan diperbarui',
        `${service.name} sekarang menggunakan ${rupiah(price)} untuk transaksi baru.`,
      );
    } catch (error: unknown) {
      toast.error('Harga gagal diperbarui', getApiErrorMessage(error, 'Silakan coba kembali.'));
    }
  }

  async function handleSaveServiceEdit() {
    if (!editForm.name.trim()) {
      toast.info('Nama layanan wajib diisi', 'Masukkan nama layanan klinik.');
      return;
    }

    try {
      await updateService.mutateAsync({
        id: service.id,
        payload: {
          name: editForm.name.trim(),
          category: editForm.category,
          duration: Number(editForm.duration || 0),
          price: Number(editForm.price || 0),
          price_type: editForm.price_type,
          is_flexible_price: editForm.price_type === 'flexible',
          is_active: editForm.is_active,
          description: editForm.description.trim() || null,
        },
      });
      setIsEditModalOpen(false);
      toast.success('Detail layanan disimpan', `Perubahan pada ${editForm.name} berhasil diterapkan.`);
    } catch (error: unknown) {
      toast.error('Gagal menyimpan detail layanan', getApiErrorMessage(error, 'Periksa data input.'));
    }
  }

  async function handleDeleteService() {
    if (!window.confirm(`Yakin ingin menghapus layanan “${service.name}”? Layanan ini tidak akan lagi muncul untuk booking baru.`)) {
      return;
    }

    try {
      await deleteService.mutateAsync(service.id);
      toast.success('Layanan dihapus', `${service.name} berhasil dihapus dari master layanan.`);
    } catch (error: unknown) {
      toast.error('Gagal menghapus layanan', getApiErrorMessage(error, 'Layanan mungkin masih terikat data transaksi.'));
    }
  }

  async function addAgePrice() {
    const payload = toPayload(draft);
    if (!payload) {
      toast.info('Kategori usia belum valid', 'Isi nama kategori, rentang usia, dan harga dengan benar.');
      return;
    }

    try {
      await createAgePrice.mutateAsync({ serviceId: service.id, payload });
      setDraft(EMPTY_AGE_DRAFT);
      toast.success('Kategori usia ditambahkan', `Harga ${payload.category_name} berhasil disimpan.`);
    } catch (error: unknown) {
      toast.error('Kategori usia gagal ditambahkan', getApiErrorMessage(error, 'Periksa kembali rentang usia.'));
    }
  }

  function startEdit(rule: TherapyServiceAgePrice) {
    setEditing(rule);
    setEditDraft({
      categoryName: rule.category_name,
      minAge: String(rule.min_age),
      maxAge: rule.max_age === null ? '' : String(rule.max_age),
      price: String(rule.price),
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const payload = toPayload(editDraft, editing.is_active);
    if (!payload) {
      toast.info('Kategori usia belum valid', 'Periksa nama kategori, rentang usia, dan harga.');
      return;
    }

    try {
      await updateAgePrice.mutateAsync({
        serviceId: service.id,
        agePriceId: editing.id,
        payload,
      });
      setEditing(null);
      toast.success('Kategori usia diperbarui');
    } catch (error: unknown) {
      toast.error('Gagal memperbarui kategori', getApiErrorMessage(error, 'Periksa kembali rentang usia.'));
    }
  }

  async function removeAgePrice(rule: TherapyServiceAgePrice) {
    if (!window.confirm(`Hapus kategori usia “${rule.category_name}” dari ${service.name}?`)) return;

    try {
      await deleteAgePrice.mutateAsync({ serviceId: service.id, agePriceId: rule.id });
      toast.success('Kategori usia dihapus');
    } catch (error: unknown) {
      toast.error('Kategori gagal dihapus', getApiErrorMessage(error, 'Silakan coba kembali.'));
    }
  }

  const isFlexible = Boolean(service.is_flexible_price || service.price_type === 'flexible');
  const isActive = service.is_active !== false;

  return (
    <article className="rounded-2xl border border-[#bcc9c6]/35 bg-white p-4 shadow-sm sm:p-5 md:p-6 transition-all hover:border-[#00685f]/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h2 className="text-base font-bold text-[#0b1c30]">{service.name}</h2>
            <span className="inline-flex items-center rounded-full bg-[#00685f]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00685f]">
              {formatCategoryLabel(service.category)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isFlexible
                  ? 'bg-[#dce9ff] text-[#0058be]'
                  : 'bg-[#dcfce7] text-[#14532d]'
              }`}
            >
              {isFlexible ? 'Harga Fleksibel / Kasir' : 'Harga Tetap'}
            </span>
            {!isActive && (
              <span className="inline-flex items-center rounded-full bg-[#ffdad6] px-2.5 py-0.5 text-xs font-semibold text-[#ba1a1a]">
                Nonaktif
              </span>
            )}
          </div>

          <p className="text-xs text-[#6d7a77]">
            {service.duration > 0 ? `${service.duration} menit` : 'Tanpa durasi khusus'}
            {service.description ? ` · ${service.description}` : ''}
          </p>

          <p className="mt-2 text-xs text-[#3d4947]">
            {isFlexible
              ? 'Layanan fleksibel: nominal dasar sebagai rujukan; kasir dapat menentukan nominal akhir pada invoice.'
              : 'Harga dasar dipakai bila pasien tidak masuk ke kategori usia khusus.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Base price quick editor */}
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-44">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberWithDots(basePrice)}
                onChange={(event) => setBasePrice(String(parseNumberFromDots(event.target.value)))}
                className="h-10 w-full min-w-0 rounded-xl border border-[#bcc9c6] pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10"
              />
            </div>
            <button
              type="button"
              onClick={saveBasePrice}
              disabled={updateService.isPending}
              className="h-10 rounded-xl bg-[#00685f] px-3.5 text-xs font-semibold text-white hover:bg-[#008378] disabled:opacity-60 transition-colors"
            >
              Simpan
            </button>
          </div>

          {/* Edit Detail Button */}
          <button
            type="button"
            onClick={() => {
              setEditForm({
                name: service.name,
                category: service.category,
                duration: service.duration,
                price: service.price,
                price_type: isFlexible ? 'flexible' : 'fixed',
                is_flexible_price: isFlexible,
                is_active: isActive,
                description: service.description || '',
              });
              setIsEditModalOpen(true);
            }}
            className="h-10 rounded-xl border border-[#bcc9c6] px-3.5 text-xs font-semibold text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
          >
            Edit Detail
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDeleteService}
            disabled={deleteService.isPending}
            className="h-10 rounded-xl border border-[#ffdad6] px-3 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors disabled:opacity-50"
            title="Hapus Layanan"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      {/* ── Sub-section: Harga Berdasarkan Usia (Hanya untuk layanan non-fleksibel) ── */}
      <div className="mt-5 border-t border-[#bcc9c6]/25 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3d4947]">Harga Berdasarkan Usia</p>
            <p className="mt-0.5 text-[11px] text-[#6d7a77]">Rentang usia pada layanan yang sama tidak boleh tumpang tindih.</p>
          </div>
          {agePrices.isFetching && <span className="text-[11px] text-[#6d7a77]">Memperbarui...</span>}
        </div>

        {agePrices.isLoading ? (
          <div className="h-14 animate-pulse rounded-xl bg-[#eff4ff]" />
        ) : agePrices.isError ? (
          <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/40 p-3 text-xs text-[#ba1a1a]">
            Kategori usia gagal dimuat.
          </div>
        ) : (agePrices.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#bcc9c6] p-3 text-xs text-[#6d7a77]">
            Belum ada kategori usia. Semua pasien memakai harga dasar {rupiah(Number(service.price))}.
          </div>
        ) : (
          <div className="space-y-2">
            {(agePrices.data ?? []).map((rule) => (
              <div key={rule.id} className="rounded-xl border border-[#bcc9c6]/30 bg-[#f8f9ff] p-3">
                {editing?.id === rule.id ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.5fr_100px_100px_150px_auto]">
                    <input
                      value={editDraft.categoryName}
                      onChange={(event) => setEditDraft((current) => ({ ...current, categoryName: event.target.value }))}
                      className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
                      placeholder="Kategori"
                    />
                    <input
                      type="number"
                      min="0"
                      value={editDraft.minAge}
                      onChange={(event) => setEditDraft((current) => ({ ...current, minAge: event.target.value }))}
                      className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      min="0"
                      value={editDraft.maxAge}
                      onChange={(event) => setEditDraft((current) => ({ ...current, maxAge: event.target.value }))}
                      className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
                      placeholder="Max"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithDots(editDraft.price)}
                      onChange={(event) => setEditDraft((current) => ({ ...current, price: String(parseNumberFromDots(event.target.value)) }))}
                      className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm font-semibold"
                      placeholder="Harga"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={updateAgePrice.isPending}
                        className="h-10 flex-1 rounded-lg bg-[#00685f] px-3 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-10 rounded-lg border border-[#bcc9c6] px-3 text-xs font-semibold text-[#3d4947]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="font-bold text-[#0b1c30]">{rule.category_name}</span>
                      <span className="text-[#6d7a77]">Usia {rule.min_age}–{rule.max_age ?? '∞'} tahun</span>
                      <span className="font-bold text-[#00685f]">{rupiah(Number(rule.price))}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        className="h-8 rounded-lg border border-[#bcc9c6] px-3 text-xs font-semibold text-[#00685f] hover:bg-[#eff4ff]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAgePrice(rule)}
                        disabled={deleteAgePrice.isPending}
                        className="h-8 rounded-lg border border-[#ffdad6] px-3 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[#bcc9c6]/30 bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-[#3d4947]">Tambah kategori usia</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.5fr_100px_100px_150px_auto]">
            <input
              value={draft.categoryName}
              onChange={(event) => setDraft((current) => ({ ...current, categoryName: event.target.value }))}
              placeholder="Contoh: Dewasa / Anak"
              className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
            />
            <input
              type="number"
              min="0"
              value={draft.minAge}
              onChange={(event) => setDraft((current) => ({ ...current, minAge: event.target.value }))}
              placeholder="Min"
              className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
            />
            <input
              type="number"
              min="0"
              value={draft.maxAge}
              onChange={(event) => setDraft((current) => ({ ...current, maxAge: event.target.value }))}
              placeholder="Max"
              className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm"
            />
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberWithDots(draft.price)}
              onChange={(event) => setDraft((current) => ({ ...current, price: String(parseNumberFromDots(event.target.value)) }))}
              placeholder="Harga"
              className="h-10 min-w-0 rounded-lg border border-[#bcc9c6] px-3 text-sm font-semibold"
            />
            <button
              type="button"
              onClick={addAgePrice}
              disabled={createAgePrice.isPending}
              className="h-10 rounded-lg border border-[#00685f] px-4 text-xs font-semibold text-[#00685f] hover:bg-[#00685f]/5 disabled:opacity-60"
            >
              + Tambah
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Edit Detail Layanan ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#bcc9c6]/30 pb-3 mb-4">
              <h3 className="text-base font-bold text-[#0b1c30]">Edit Master Layanan</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#6d7a77] hover:text-[#0b1c30]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Nama Layanan</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#bcc9c6] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Kategori Layanan</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
                  >
                    {!CATEGORY_OPTIONS.some((opt) => opt.value === editForm.category) && editForm.category && (
                      <option value={editForm.category}>{formatCategoryLabel(editForm.category)}</option>
                    )}
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Durasi (Menit)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.duration}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Tipe Harga</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, price_type: 'fixed', is_flexible_price: false }))}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
                      editForm.price_type === 'fixed'
                        ? 'border-[#00685f] bg-[#00685f]/10 text-[#00685f]'
                        : 'border-[#bcc9c6] text-[#6d7a77]'
                    }`}
                  >
                    Harga Tetap
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, price_type: 'flexible', is_flexible_price: true }))}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
                      editForm.price_type === 'flexible'
                        ? 'border-[#0058be] bg-[#0058be]/10 text-[#0058be]'
                        : 'border-[#bcc9c6] text-[#6d7a77]'
                    }`}
                  >
                    Harga Fleksibel / Kasir
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">
                  {editForm.price_type === 'flexible' ? 'Nominal Dasar / Rekomendasi (Boleh Rp 0)' : 'Harga Dasar (Rp)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithDots(editForm.price)}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: parseNumberFromDots(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] pl-9 pr-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Deskripsi Layanan (Opsional)</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Keterangan singkat tindakan terapi atau alat/obat..."
                  className="w-full rounded-xl border border-[#bcc9c6] p-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="accent-[#00685f]"
                />
                <span className="text-sm font-medium text-[#0b1c30]">Layanan Aktif (Dapat dipilih pada booking & transaksi)</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#bcc9c6]/30 pt-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 rounded-xl border border-[#bcc9c6] px-4 text-xs font-semibold text-[#3d4947]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveServiceEdit}
                disabled={updateService.isPending}
                className="h-10 rounded-xl bg-[#00685f] px-5 text-xs font-semibold text-white hover:bg-[#008378]"
              >
                {updateService.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ServicePricingPage() {
  const { data: services = [], isLoading, isError, refetch } = useTherapyServices();
  const createService = useCreateTherapyService();
  const toast = useToast();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<ServiceFormState>(DEFAULT_SERVICE_FORM);

  async function handleCreateService() {
    if (!addForm.name.trim()) {
      toast.info('Nama layanan wajib diisi', 'Masukkan nama layanan.');
      return;
    }

    try {
      await createService.mutateAsync({
        name: addForm.name.trim(),
        category: addForm.category,
        duration: Number(addForm.duration || 0),
        price: Number(addForm.price || 0),
        price_type: addForm.price_type,
        is_flexible_price: addForm.price_type === 'flexible',
        is_active: addForm.is_active,
        description: addForm.description.trim() || null,
      });
      setIsAddModalOpen(false);
      setAddForm(DEFAULT_SERVICE_FORM);
      toast.success('Layanan berhasil dibuat', `${addForm.name} siap digunakan di transaksi dan booking.`);
    } catch (error: unknown) {
      toast.error('Gagal membuat layanan', getApiErrorMessage(error, 'Periksa data input.'));
    }
  }

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const filteredServices = useMemo(() => {
    if (filterCategory === 'all') return services;
    return services.filter(
      (s) => normalizeCategoryKey(s.category) === normalizeCategoryKey(filterCategory),
    );
  }, [services, filterCategory]);

  const totalServices = filteredServices.length;
  const lastPage = Math.max(1, Math.ceil(totalServices / perPage));
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredServices.slice(start, start + perPage);
  }, [filteredServices, page, perPage]);

  const handleCategorySelect = (cat: string) => {
    setFilterCategory(cat);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] md:text-3xl">Manajemen Layanan & Harga</h1>
          <p className="mt-1 text-sm text-[#3d4947]">
            Owner dapat mengelola seluruh layanan klinik, harga tetap vs fleksibel, obat & alat tanpa nominal awal, serta kategori usia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 h-11 rounded-xl gradient-btn px-5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-[19px]">add</span>
          Tambah Layanan
        </button>
      </header>

      {/* ── Filter Kategori ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#bcc9c6]/25 pb-3">
        <button
          type="button"
          onClick={() => handleCategorySelect('all')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filterCategory === 'all'
              ? 'bg-[#00685f] text-white shadow-sm'
              : 'bg-white border border-[#bcc9c6]/50 text-[#3d4947] hover:bg-[#eff4ff]'
          }`}
        >
          Semua Kategori ({services.length})
        </button>
        {CATEGORY_OPTIONS.map((cat) => {
          const count = services.filter((s) => normalizeCategoryKey(s.category) === normalizeCategoryKey(cat.value)).length;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategorySelect(cat.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                normalizeCategoryKey(filterCategory) === normalizeCategoryKey(cat.value)
                  ? 'bg-[#00685f] text-white shadow-sm'
                  : 'bg-white border border-[#bcc9c6]/50 text-[#3d4947] hover:bg-[#eff4ff]'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-[#eff4ff]" />)}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[#ba1a1a]/20 bg-white p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-[#ba1a1a]">error_outline</span>
          <h2 className="mt-3 font-bold text-[#0b1c30]">Data layanan gagal dimuat</h2>
          <button type="button" onClick={() => refetch()} className="mt-4 rounded-xl border border-[#00685f] px-4 py-2 text-sm font-semibold text-[#00685f]">Coba Lagi</button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-[#bcc9c6]/40 bg-white p-8 text-center text-sm text-[#6d7a77] shadow-sm">
          Tidak ada layanan pada kategori ini. Klik &quot;Tambah Layanan&quot; untuk menambahkan layanan baru.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedServices.map((service) => (
              <ServicePricingCard key={service.id} service={service} />
            ))}
          </div>

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            total={totalServices}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
            }}
            perPageOptions={[5, 10, 20]}
            itemName="layanan"
          />
        </div>
      )}

      {/* ── Modal Tambah Layanan Baru ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#bcc9c6]/30 pb-3 mb-4">
              <h3 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00685f]">add_circle</span>
                Tambah Layanan Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#6d7a77] hover:text-[#0b1c30]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Nama Layanan</label>
                <input
                  type="text"
                  placeholder="Contoh: Fisioterapi Anak, Fisioterapi Remaja, Fisioterapi Dewasa"
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#bcc9c6] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Kategori Layanan</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setAddForm((prev) => ({
                        ...prev,
                        category: cat,
                        // Obat & Alat otomatis default ke fleksibel dan harga 0
                        price_type: cat === 'obat_alat' ? 'flexible' : prev.price_type,
                        is_flexible_price: cat === 'obat_alat' ? true : prev.is_flexible_price,
                        price: cat === 'obat_alat' ? 0 : prev.price,
                        duration: cat === 'obat_alat' ? 0 : prev.duration,
                      }));
                    }}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Durasi Sesi (Menit)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 45 (0 jika alat/obat)"
                    value={addForm.duration}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Skema Harga</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddForm((prev) => ({ ...prev, price_type: 'fixed', is_flexible_price: false }))}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
                      addForm.price_type === 'fixed'
                        ? 'border-[#00685f] bg-[#00685f]/10 text-[#00685f]'
                        : 'border-[#bcc9c6] text-[#6d7a77]'
                    }`}
                  >
                    Harga Tetap
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm((prev) => ({ ...prev, price_type: 'flexible', is_flexible_price: true, price: prev.price || 0 }))}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
                      addForm.price_type === 'flexible'
                        ? 'border-[#0058be] bg-[#0058be]/10 text-[#0058be]'
                        : 'border-[#bcc9c6] text-[#6d7a77]'
                    }`}
                  >
                    Harga Fleksibel / Kasir
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#6d7a77]">
                  {addForm.price_type === 'flexible'
                    ? 'Harga fleksibel atau obat & alat dapat dicatat tanpa nominal awal (Rp 0), nominal ditentukan kasir saat transaksi.'
                    : 'Harga tetap akan otomatis dipakai sebagai tarif default tagihan.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">
                  {addForm.price_type === 'flexible' ? 'Nominal Dasar / Rekomendasi (Boleh Rp 0)' : 'Harga Dasar (Rp)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3d4947]">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithDots(addForm.price)}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, price: parseNumberFromDots(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-[#bcc9c6] pl-9 pr-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3d4947]">Deskripsi Layanan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat tindakan terapi, manfaat, atau aturan pemakaian..."
                  value={addForm.description}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-[#bcc9c6] p-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.is_active}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="accent-[#00685f]"
                />
                <span className="text-sm font-medium text-[#0b1c30]">Aktifkan langsung pada sistem</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#bcc9c6]/30 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 rounded-xl border border-[#bcc9c6] px-4 text-xs font-semibold text-[#3d4947]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateService}
                disabled={createService.isPending}
                className="h-10 rounded-xl bg-[#00685f] px-5 text-xs font-semibold text-white hover:bg-[#008378] disabled:opacity-60"
              >
                {createService.isPending ? 'Menyimpan...' : 'Buat Layanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
