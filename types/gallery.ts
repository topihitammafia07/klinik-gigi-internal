export interface ClinicGalleryItem {
  id: number;
  title: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ClinicGalleryFormData {
  title: string;
  sort_order?: number;
  image?: File | null;
}

// Dimensi wajib untuk gambar ruangan klinik — ditampilkan di section Fasilitas Landing Page
export const CLINIC_ROOM_PHOTO_DIMENSIONS = { width: 1280, height: 960 };
