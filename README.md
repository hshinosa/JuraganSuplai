# 🚀 JuraganSuplai.ai

**Platform Logistik B2B Berbasis AI** - Menghubungkan pembeli, supplier, dan kurir melalui otomasi WhatsApp dengan orkestrasi agen cerdas.

[![Next.js](https://img.shields.io/badge/Next.js-16.0.7-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostGIS-green)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-LLama%203.3-orange)](https://groq.com/)

---

## 📋 Daftar Isi

- [Ringkasan](#-ringkasan)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur](#-arsitektur)
- [Teknologi](#-teknologi)
- [Memulai](#-memulai)
- [Struktur Proyek](#-struktur-proyek)
- [Variabel Lingkungan](#-variabel-lingkungan)
- [Pengembangan](#-pengembangan)
- [Endpoint API](#-endpoint-api)
- [Perintah WhatsApp](#-perintah-whatsapp)
- [Skema Database](#-skema-database)
- [Sistem Agen AI](#-sistem-agen-ai)
- [Deployment](#-deployment)
- [Penyelesaian Masalah](#-penyelesaian-masalah)

---

## 🎯 Ringkasan

JuraganSuplai.ai adalah platform logistik B2B yang mengotomasi seluruh alur kerja rantai pasokan menggunakan agen AI dan WhatsApp sebagai antarmuka utama. Platform ini menghubungkan:

- **Pembeli** - Pesan bahan baku via WhatsApp
- **Supplier** - Terima dan penuhi pesanan
- **Kurir** - Tangani logistik pengiriman

### Cara Kerja

1. 🛒 **Pembeli** kirim permintaan pesanan via WhatsApp
2. 🤖 **Agen AI** broadcast ke supplier terdekat
3. 📦 **Supplier** terima pesanan dan beri harga
4. 🚚 **Agen AI** cari dan negosiasi dengan kurir
5. 💰 **Pembeli** lakukan pembayaran (QRIS mock)
6. 📍 **Tracking GPS real-time** selama pengiriman
7. ✅ **Konfirmasi QR Code** saat pengiriman selesai

---

## ✨ Fitur Utama

### 🤖 Orkestrasi Berbasis AI
- **Pola Agen ReAct** - Loop Pikir → Bertindak → Amati (maksimal 10 iterasi)
- **API Groq** - Model Llama 3.3 70B Versatile
- **Sistem Tool** - 15+ tool khusus (broadcast pesanan, pencarian kurir, tracking lokasi, dll)
- **Pengambilan Keputusan Otonom** - Agen menangani negosiasi, retry, dan eskalasi

### 📱 Integrasi WhatsApp
- **API Fonnte** - Pesan dua arah
- **Onboarding Pintar** - 6 langkah registrasi supplier, 4 langkah registrasi kurir
- **Sistem Perintah** - Supplier: `DASHBOARD`, `ORDER`, `SANGGUP KIRIM`, dll
- **Berbagi Lokasi** - Koordinat GPS via berbagi lokasi WhatsApp
- **Verifikasi Gambar** - Upload KTP dan selfie

### 🗺️ Tracking Real-Time
- **Update GPS Live** - Lokasi kurir setiap ~5 detik
- **Integrasi OpenStreetMap** - Tracking visual untuk pembeli
- **Query Geospasial PostGIS** - Cari supplier/kurir terdekat
- **Kalkulasi Jarak** - Optimasi rute otomatis

### 💳 Sistem Pembayaran
- **QRIS Mock** - Pembuatan kode QR (mode sandbox)
- **Logika Escrow** - Pembayaran ditahan sampai pengiriman dikonfirmasi
- **Disbursement Otomatis** - Supplier dapat 70%, kurir dapat 30%

### 📸 Verifikasi AI
- **API Gemini Vision** - Analisis KTP dan selfie
- **Mode MVP** - Auto-approve saat API tidak tersedia
- **Verifikasi Web** - Fallback halaman upload browser

---

## 🏗️ Arsitektur

```
┌─────────────────┐
│  Pengguna WhatsApp │ ← API Fonnte
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Handler Webhook                    │
│  (/api/webhooks/fonnte)                 │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  State Machine Onboarding         │ │
│  │  - Seleksi role                   │ │
│  │  - Nama → Bisnis → Lokasi         │ │
│  │  - Kategori → Verifikasi foto     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Handler Perintah Pesanan         │ │
│  │  - Supplier: SANGGUP, TIDAK       │ │
│  │  - Kurir: AMBIL, SELESAI          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Executor Agen AI (ReAct)         │ │
│  │  - Loop runAgent()                │ │
│  │  - Registry & eksekusi tool       │ │
│  │  - Integrasi API Groq             │ │
│  └───────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Database Supabase │
         │  (PostgreSQL       │
         │   + PostGIS)       │
         └────────────────┘
```

### Alur Data

1. **Entry Webhook** → Fonnte kirim payload ke `/api/webhooks/fonnte`
2. **Filtering Pesan** → Abaikan pesan bot (dimulai dengan ✅), filter non-text
3. **Lookup User** → Query tabel `users` untuk `onboarding_step` dan `role`
4. **Routing**:
   - `onboarding_step !== 'completed'` → Handler onboarding
   - `onboarding_step === 'completed'` → Handler perintah ATAU executor agen
5. **Response** → Kirim balasan WhatsApp via tool `sendWhatsApp()`

---

## 🛠️ Teknologi

### Framework Inti
- **Next.js 16.0.7** - Framework React dengan App Router
- **TypeScript 5.0** - Type safety
- **Tailwind CSS 4** - Styling utility-first
- **Shadcn/ui** - Library komponen yang accessible

### Backend & AI
- **Supabase** - Database PostgreSQL + Auth
- **PostGIS** - Query geospasial
- **API Groq** - Inferensi LLM (Llama 3.3 70B)
- **Gemini Vision** - Analisis gambar (KTP/selfie)
- **API Fonnte** - Gateway WhatsApp

### Library Frontend
- **React Hook Form** - Manajemen form
- **Zod** - Validasi schema
- **Leaflet** - Rendering peta
- **Framer Motion** - Animasi
- **Sonner** - Notifikasi toast

### Tools
- **QRCode.react** - Pembuatan QR
- **Lucide React** - Library ikon

---

## 🚀 Memulai

### Prasyarat

- Node.js 18+ dan npm/yarn/pnpm
- Akun Supabase (tier gratis)
- Akun Fonnte + device WhatsApp
- API key Groq (tier gratis)
- API key Gemini (opsional)

### Instalasi

1. **Clone repository**
```bash
git clone https://github.com/yourusername/juragansuplai-app.git
cd juragansuplai-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup variabel lingkungan**
```bash
cp .env.example .env.local
```
Edit `.env.local` dengan kredensial Anda (lihat [Variabel Lingkungan](#-variabel-lingkungan))

4. **Setup database Supabase**
```bash
# Jalankan schema.sql di Supabase SQL Editor
cat supabase/schema.sql
```

5. **Jalankan server development**
```bash
npm run dev
```

6. **Setup tunnel ngrok** (untuk testing webhook)
```bash
ngrok http 3000
```

7. **Konfigurasi webhook Fonnte**
- Masuk ke dashboard Fonnte
- Set URL webhook: `https://your-ngrok-url.ngrok-free.app/api/webhooks/fonnte`

---

## 📁 Struktur Proyek

```
juragansuplai-app/
├── src/
│   ├── actions/              # Server actions
│   │   ├── buyer.ts          # Action pesanan pembeli
│   │   ├── supplier.ts       # Action supplier
│   │   └── courier.ts        # Action kurir
│   ├── app/
│   │   ├── api/
│   │   │   ├── verify/photo/ # Endpoint verifikasi foto
│   │   │   ├── track/        # API tracking
│   │   │   └── webhooks/
│   │   │       └── fonnte/   # Handler webhook WhatsApp
│   │   ├── track/[orderId]/  # Halaman tracking
│   │   ├── pay/[orderId]/    # Halaman pembayaran
│   │   ├── confirm/[orderId]/ # Konfirmasi pengiriman
│   │   └── verify/[phone]/   # Halaman upload foto
│   ├── components/
│   │   ├── ui/               # Komponen Shadcn
│   │   ├── landing/          # Section halaman landing
│   │   ├── dashboard/        # Komponen dashboard
│   │   └── track/            # Komponen tracking
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── executor.ts   # Loop agen ReAct
│   │   │   ├── prompts.ts    # System prompts
│   │   │   └── tools/        # 15+ tool AI
│   │   ├── onboarding/
│   │   │   ├── handler.ts    # Handler state machine
│   │   │   ├── categories.ts # Kategori produk
│   │   │   └── storage.ts    # Penyimpanan sementara
│   │   ├── whatsapp/
│   │   │   ├── templates.ts  # Template pesan
│   │   │   └── supplier-responses.ts
│   │   └── supabase/
│   │       ├── client.ts     # Komponen client
│   │       └── server.ts     # Komponen server
│   └── types/
│       └── database.ts       # Type Supabase
├── supabase/
│   └── schema.sql            # Schema database
└── docs/                     # Dokumentasi

```

---

## 🔐 Variabel Lingkungan

Buat `.env.local` di root proyek:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# API Groq (Agen AI)
GROQ_API_KEY=gsk_xxx...

# API Gemini (Verifikasi Gambar - Opsional)
GEMINI_API_KEY=AIzxxx...

# Fonnte WhatsApp
FONNTE_TOKEN=ijRrwfxx...
FONNTE_DEVICE=081234567890  # Nomor WhatsApp Anda

# URL App (untuk link verifikasi)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Mendapatkan API Keys

- **Supabase**: [https://supabase.com/dashboard](https://supabase.com/dashboard) → New Project
- **Groq**: [https://console.groq.com/keys](https://console.groq.com/keys) → Create API Key
- **Gemini**: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
- **Fonnte**: [https://fonnte.com/dashboard](https://fonnte.com/dashboard) → Settings → API

---

## 💻 Pengembangan

### Jalankan server dev
```bash
npm run dev
```
App berjalan di `http://localhost:3000`

### Build production
```bash
npm run build
npm start
```

### Lint kode
```bash
npm run lint
```

### Test alur WhatsApp
Gunakan halaman debug: `http://localhost:3000/debug/whatsapp`

---

## 🔌 Endpoint API

### Webhook
- `POST /api/webhooks/fonnte` - Terima pesan WhatsApp

### Tracking
- `POST /api/track/location` - Update lokasi GPS kurir
- `GET /track/[orderId]` - Halaman tracking pembeli
- `GET /track/[orderId]/courier` - UI tracking kurir

### Pembayaran
- `GET /pay/[orderId]` - Halaman pembayaran (QRIS mock)

### Verifikasi
- `GET /verify/[phone]` - Halaman upload foto
- `POST /api/verify/photo` - Proses foto yang diupload

### Konfirmasi
- `GET /confirm/[orderId]` - Konfirmasi pengiriman (scan QR)

---

## 💬 Perintah WhatsApp

### Perintah Pembeli
- `DAFTAR` - Mulai registrasi
- Kirim pesan pesanan → AI broadcast ke supplier

### Perintah Supplier
- `DASHBOARD` - Lihat statistik
- `ORDER` - Lihat pesanan pending
- `SANGGUP KIRIM [orderId]` - Terima pesanan dengan pengiriman sendiri
- `SANGGUP AMBIL [orderId]` - Terima pesanan, butuh kurir
- `TIDAK [orderId]` - Tolak pesanan
- `BATAL [orderId]` - Batal pesanan yang diterima
- `RIWAYAT` - Riwayat pesanan
- `SALDO` - Cek saldo
- `BANTUAN` - Menu bantuan

### Perintah Kurir
- `DASHBOARD` - Lihat statistik
- `ORDER` - Lihat pengiriman tersedia
- `AMBIL [orderId]` - Terima pekerjaan pengiriman
- `SELESAI [orderId]` - Tandai sebagai dikirim
- `BATAL [orderId]` - Batal pengiriman
- `RIWAYAT` - Riwayat pengiriman
- `SALDO` - Cek saldo
- `BANTUAN` - Menu bantuan

---

## 🗄️ Skema Database

### Tabel Utama

**users**
- `id` UUID PRIMARY KEY
- `phone` VARCHAR UNIQUE
- `role` ENUM('buyer', 'supplier', 'courier')
- `name`, `address`, `business_name`
- `location` GEOGRAPHY(POINT, 4326) - PostGIS
- `categories` TEXT[] - Kategori produk supplier
- `vehicle` ENUM - Tipe kendaraan kurir
- `onboarding_step` VARCHAR
- `onboarding_data` JSONB - Penyimpanan sementara dengan `currentStep`
- `is_verified` BOOLEAN

**orders**
- `id` UUID PRIMARY KEY
- `buyer_phone`, `supplier_phone`, `courier_phone`
- `product_name`, `quantity`, `unit`
- `delivery_location` GEOGRAPHY(POINT, 4326)
- `delivery_address`, `delivery_landmark`
- `status` ENUM - 12 status
- `quoted_price_supplier`, `quoted_price_courier`
- `payment_status` ENUM
- `ai_conversation` JSONB[]

**agent_logs**
- `id` UUID PRIMARY KEY
- `order_id` UUID NULLABLE
- `iteration`, `thought`, `action`, `observation`
- `created_at`

### Fungsi PostGIS

**find_nearby_suppliers**
```sql
SELECT * FROM find_nearby_suppliers(
  -6.2088,     -- latitude
  106.8456,    -- longitude
  10000,       -- radius_meters
  ARRAY['sayuran', 'sembako']  -- categories
);
```

**find_nearby_couriers**
```sql
SELECT * FROM find_nearby_couriers(
  -6.2088, 106.8456, 5000
);
```

---

## 🤖 Sistem Agen AI

### Pola ReAct

```typescript
// src/lib/ai/executor.ts
export async function runAgent(
  userMessage: string, 
  orderId?: string
): Promise<string>
```

**Loop (maksimal 10 iterasi):**
1. **PIKIR** - Groq analisis situasi
2. **BERTINDAK** - Eksekusi tool (contoh: `broadcast_to_suppliers`)
3. **AMATI** - Dapat hasil tool
4. Ulangi sampai **JAWAB** atau maksimal iterasi

### Registrasi Tool

Tool mendaftar sendiri via import side-effect:

```typescript
// src/lib/ai/tools/my-tool.ts
import { registerTool } from './index';

registerTool('my_tool_name', async (input) => {
  // Logika tool
  return { success: true, data: ... };
});
```

### Tool Tersedia (15+)

- `broadcast_to_suppliers` - Cari dan beri tahu supplier
- `find_couriers` - Cari kurir terdekat
- `send_whatsapp` - Kirim pesan WhatsApp
- `get_order_details` - Ambil info pesanan
- `update_order_status` - Ubah status pesanan
- `analyze_image` - Analisis Gemini Vision
- `verify_payment` - Cek status pembayaran
- `calculate_distance` - Rumus Haversine
- ... dan lainnya

---

## 🚢 Deployment

### Vercel (Direkomendasikan)

1. Push ke GitHub
2. Import ke Vercel
3. Tambah variabel lingkungan
4. Deploy

### Deployment Manual

```bash
npm run build
npm start
```

### Konfigurasi Webhook

Setelah deployment, update URL webhook Fonnte:
```
https://your-domain.com/api/webhooks/fonnte
```

---

## 🐛 Penyelesaian Masalah

### WhatsApp tidak menerima pesan

1. Cek status device Fonnte (harus "connected")
2. Verifikasi URL webhook di dashboard Fonnte
3. Cek `FONNTE_TOKEN` dan `FONNTE_DEVICE` di `.env.local`
4. Lihat log: terminal `npm run dev`

### Lokasi tidak tersimpan

1. Pastikan ekstensi PostGIS aktif:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
2. Cek tipe kolom `location`: `GEOGRAPHY(POINT, 4326)`
3. Format: `POINT(longitude latitude)` (longitude dulu!)

### Kategori kosong setelah registrasi

- Diperbaiki di versi terbaru dengan tracking `currentStep`
- Cek field `onboarding_data.currentStep`
- Verifikasi `/api/verify/photo` ekstrak kategori dari JSON

### Agen tidak merespons

1. Cek API key Groq dan kuota
2. Lihat log agen: `SELECT * FROM agent_logs ORDER BY created_at DESC`
3. Cek registry tool: Semua tool diimport di `src/lib/ai/tools/index.ts`

### Tracking GPS tidak update

1. Kurir harus klik "Mulai Pengantaran" di halaman tracking
2. Browser harus izinkan akses lokasi
3. Cek jaringan: POST ke `/api/track/location` setiap 5s
4. Lihat update real-time via subscription Supabase Realtime

---

## 📚 Dokumentasi Tambahan

- **[PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** - Struktur folder detail
- **[IMPLEMENTATION_DETAILS.md](docs/IMPLEMENTATION_DETAILS.md)** - Spesifikasi teknis
- **[MVP_PLAN.md](docs/MVP_PLAN.md)** - Roadmap pengembangan
- **[LiveTrackingFeature_JuraganSuplai.md](docs/LiveTrackingFeature_JuraganSuplai.md)** - Implementasi tracking

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/FiturHebat`)
3. Commit perubahan (`git commit -m 'Tambah FiturHebat'`)
4. Push ke branch (`git push origin feature/FiturHebat`)
5. Buka Pull Request

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

---

## 👨‍💻 Penulis

**Tim JuraganSuplai.ai**

- GitHub: [@hshinosa](https://github.com/hshinosa)

---

## 🙏 Ucapan Terima Kasih

- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Infrastruktur backend
- [Groq](https://groq.com/) - Inferensi LLM super cepat
- [Fonnte](https://fonnte.com/) - Gateway API WhatsApp
- [Shadcn/ui](https://ui.shadcn.com/) - Library komponen

---

**Dibuat dengan ❤️ di Indonesia**

