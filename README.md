# klinik-internal

Dashboard internal sistem rekam medis Klinik Fisioterapi. Diakses hanya oleh pengguna internal (Owner, PJ Klinik, Resepsionis, Terapis). Tidak diindeks search engine.

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router, CSR)
- **Bundler**: Turbopack
- **UI**: shadcn/ui + Tailwind CSS v4
- **Data Fetching**: TanStack Query v5
- **Table**: TanStack Table v8
- **Form**: React Hook Form + Zod
- **Charts**: Recharts
- **HTTP Client**: Axios

## Requirements

- Node.js 20+
- npm

## Setup Lokal

### 1. Clone & install dependency

```bash
git clone https://github.com/YOUR_ORG/klinik-internal.git
cd klinik-internal
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Jalankan development server

```bash
npm run dev
# Buka http://localhost:3000
```

Turbopack aktif secara default di Next.js 16.

## Catatan Akses

- URL sistem ini **tidak dipublikasikan** dan tidak boleh diindeks search engine
- `public/robots.txt` sudah dikonfigurasi `Disallow: /`
- Semua halaman membutuhkan autentikasi (token Sanctum)

## Struktur Direktori

```
app/                  # Next.js App Router pages
components/
  ui/                 # shadcn/ui components
lib/
  axios.ts            # Axios instance + interceptor
providers/
  QueryProvider.tsx   # TanStack Query provider
public/
  robots.txt          # Disallow all (tidak diindeks)
```