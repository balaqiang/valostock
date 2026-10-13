# Valostock - Panduan Instalasi & Penggunaan

Dokumen ini berisi panduan teknis untuk menginstal, mengonfigurasi, dan menjalankan proyek secara lokal.

---

## Persyaratan Sistem (Prerequisites)

Pastikan perangkat Anda telah terinstal software berikut:

- **Node.js**: v20 atau versi yang lebih baru
- **npm**: v9 atau versi yang lebih baru
- **Docker Desktop**: Wajib berjalan jika menggunakan Supabase lokal

---

## Panduan Instalasi

### 1. Install Dependensi Proyek

Jalankan perintah instalasi di kedua direktori (`back` dan `front`):

```bash
# Install dependensi backend
cd back
npm install

# Install dependensi frontend
cd ../front
npm install
```

---

### 2. Konfigurasi Environment Variables

#### Backend (`back/.env`)

Buat file `.env` di dalam folder `back/` dan sesuaikan dengan konfigurasi Anda:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://valostock_api:password@127.0.0.1:55322/postgres
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_SSL=off
PAYMENT_MODE=simulation
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
```

#### Frontend (`front/.env.local`)

Buat file `.env.local` di dalam folder `front/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Cara Menjalankan Aplikasi

### Langkah 1: Jalankan Database Supabase

Pastikan **Docker Desktop** sudah aktif, lalu jalankan perintah berikut di root proyek:

```bash
# Menjalankan container Supabase
npx supabase start

# (Opsional) Dapatkan URL dan Keys untuk back/.env
npx supabase status

# (Opsional) Reset database dan terapkan migrasi + seed data
npx supabase db reset
```

---

### Langkah 2: Jalankan Backend API

Buka terminal baru, masuk ke direktori `back`, lalu jalankan:

```bash
cd back
npm run dev
```

_Backend API akan berjalan di `http://localhost:4000`._

---

### Langkah 3: Jalankan Frontend Web

Buka terminal baru, masuk ke direktori `front`, lalu jalankan:

```bash
cd front
npm run dev
```

_Aplikasi web akan berjalan di `http://localhost:3000`._

---

## Daftar Perintah (Scripts)

### Supabase CLI (Root Repo)

| Perintah                | Keterangan                                 |
| :---------------------- | :----------------------------------------- |
| `npx supabase start`    | Menjalankan service Supabase lokal         |
| `npx supabase status`   | Menampilkan endpoint & kredensial Supabase |
| `npx supabase stop`     | Menghentikan service Supabase lokal        |
| `npx supabase db reset` | Mengulang migrasi dan memasukkan seed data |

### Backend (`back/`)

| Perintah                | Keterangan                                         |
| :---------------------- | :------------------------------------------------- |
| `npm run dev`           | Menjalankan server backend dalam mode pengembangan |
| `npm run build`         | Kompilasi TypeScript ke JavaScript                 |
| `npm run test:smoke`    | Menjalankan tes API end-to-end                     |
| `npm run test:features` | Menjalankan tes fitur spesifik                     |
| `npm run test:unit`     | Menjalankan tes logika kalkulasi bisnis            |
| `npm run dev:sim`       | Menjalankan API mode simulasi di port `:4100`      |

### Frontend (`front/`)

| Perintah        | Keterangan                                               |
| :-------------- | :------------------------------------------------------- |
| `npm run dev`   | Menjalankan Next.js dev server (`http://localhost:3000`) |
| `npm run build` | Membangun aplikasi Next.js untuk produksi                |
| `npm run lint`  | Menjalankan pemeriksaan linter pada kode frontend        |
