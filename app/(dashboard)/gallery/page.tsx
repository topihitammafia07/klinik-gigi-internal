'use client';

import { useRef, useState } from 'react';
import { useGalleries, useCreateGallery, useUpdateGallery, useDeleteGallery } from '@/hooks/useGallery';
import { useToast } from '@/components/ui-custom/Toast';
import { CLINIC_ROOM_PHOTO_DIMENSIONS, type ClinicGalleryItem } from '@/types/gallery';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Pagination } from '@/components/ui-custom/Pagination';

// ─────────────────────────────────────────────────────────────
// Helper: baca dimensi file gambar di browser sebelum diupload
// ─────────────────────────────────────────────────────────────
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Gagal membaca gambar.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────
// Modal: Tambah / Edit gambar galeri
// ─────────────────────────────────────────────────────────────
function GalleryFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: ClinicGalleryItem | null;
}) {
  const { success, error } = useToast();
  const createGallery = useCreateGallery();
  const updateGallery = useUpdateGallery(editing?.id ?? 0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [preview, setPreview] = useState<string | null>(editing?.image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const isEdit = !!editing;
  const isLoading = createGallery.isPending || updateGallery.isPending;

  const resetAndClose = () => {
    setTitle('');
    setPreview(null);
    setFile(null);
    setFileError(null);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError(null);
    if (!f) return;

    try {
      const { width, height } = await readImageDimensions(f);
      const { width: reqW, height: reqH } = CLINIC_ROOM_PHOTO_DIMENSIONS;
      if (width !== reqW || height !== reqH) {
        setFileError(`Dimensi gambar wajib ${reqW}x${reqH}px. File ini ${width}x${height}px.`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    } catch {
      setFileError('Gagal membaca gambar. Coba file lain.');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFileError('Judul wajib diisi.');
      return;
    }
    if (!isEdit && !file) {
      setFileError('Gambar wajib diunggah.');
      return;
    }

    try {
      if (isEdit) {
        await updateGallery.mutateAsync({ title, image: file });
        success('Galeri diperbarui', `"${title}" berhasil diperbarui.`);
      } else {
        await createGallery.mutateAsync({ title, image: file });
        success('Galeri ditambahkan', `"${title}" berhasil ditambahkan.`);
      }
      resetAndClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyimpan gambar galeri.';
      error('Gagal menyimpan', msg);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-[#bcc9c6]/20 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0b1c30]">
            {isEdit ? 'Edit Gambar Galeri' : 'Tambah Gambar Galeri'}
          </h3>
          <button onClick={resetAndClose} className="p-1 rounded-lg hover:bg-[#eff4ff] text-[#3d4947]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Judul / Label Ruangan <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Ruang Fisioterapi"
              className="w-full h-11 px-4 rounded-xl border border-[#bcc9c6]/70 text-sm text-[#0b1c30] bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f]/20 focus:border-[#00685f] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">
              Gambar Ruangan {!isEdit && <span className="text-[#ba1a1a]">*</span>}
              <span className="ml-2 font-normal text-[#6d7a77] normal-case">
                (dimensi wajib {CLINIC_ROOM_PHOTO_DIMENSIONS.width}x{CLINIC_ROOM_PHOTO_DIMENSIONS.height}px)
              </span>
            </label>
            <div className="flex items-center gap-4">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="w-24 h-[72px] rounded-lg object-cover border border-[#bcc9c6]/40" />
              ) : (
                <div className="w-24 h-[72px] rounded-lg bg-[#eff4ff] border border-dashed border-[#bcc9c6]/60 flex items-center justify-center text-[#6d7a77]">
                  <span className="material-symbols-outlined text-[22px]">image</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="text-xs text-[#3d4947] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#00685f] hover:file:bg-[#dce9ff] file:cursor-pointer cursor-pointer"
              />
            </div>
            {fileError && <p className="mt-1.5 text-xs text-[#ba1a1a]">{fileError}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-5 h-10 rounded-xl border border-[#bcc9c6]/70 text-sm font-medium text-[#3d4947] hover:bg-[#eff4ff] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 h-10 bg-[#00685f] text-white rounded-xl text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm disabled:opacity-60"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const { data: galleries, isLoading, isError } = useGalleries();
  const deleteGallery = useDeleteGallery();
  const { confirm, dialogProps } = useConfirmDialog();
  const { success, error } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicGalleryItem | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);

  const totalItems = galleries?.length ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedGalleries = (galleries ?? []).slice((page - 1) * perPage, page * perPage);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: ClinicGalleryItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = (item: ClinicGalleryItem) => {
    confirm({
      title: `Hapus gambar "${item.title}"?`,
      description: 'Tindakan ini tidak dapat dibatalkan.',
      variant: 'danger',
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await deleteGallery.mutateAsync(item.id);
          success('Gambar dihapus', `"${item.title}" berhasil dihapus.`);
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Gagal menghapus gambar.';
          error('Gagal menghapus', msg);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Galeri Klinik</h2>
          <p className="text-sm text-[#3d4947] mt-1">
            Kelola gambar ruangan & fasilitas klinik yang tampil di section &ldquo;Fasilitas Klinik&rdquo; pada Landing Page.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#00685f] text-white rounded-lg text-sm font-semibold hover:bg-[#008378] transition-colors shadow-sm self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          Tambah Gambar
        </button>
      </section>

      {/* ── Grid ── */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-[#eff4ff] rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card rounded-2xl p-12 text-center text-[#ba1a1a] text-sm">
          <span className="material-symbols-outlined text-3xl block mb-2">error_outline</span>
          Gagal memuat data galeri. Periksa koneksi API.
        </div>
      )}

      {!isLoading && !isError && (galleries?.length ?? 0) === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center text-[#3d4947] text-sm">
          <span className="material-symbols-outlined text-4xl text-[#bcc9c6] block mb-3">photo_library</span>
          Belum ada gambar galeri. Tambahkan gambar ruangan pertama Anda.
        </div>
      )}

      {!isLoading && !isError && (galleries?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedGalleries.map((item) => (
              <div key={item.id} className="relative rounded-2xl overflow-hidden group shadow-sm border border-[#bcc9c6]/20 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <span className="text-white font-semibold text-xs">{item.title}</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-[#3d4947] hover:text-[#00685f] transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deleteGallery.isPending}
                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-[#3d4947] hover:text-[#ba1a1a] transition-colors disabled:opacity-50"
                    title="Hapus"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalItems > perPage && (
            <Pagination
              currentPage={page}
              lastPage={lastPage}
              total={totalItems}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setPage(1);
              }}
              perPageOptions={[4, 8, 16]}
              itemName="foto"
            />
          )}
        </div>
      )}

      <GalleryFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}