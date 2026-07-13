# Toko Online Fashion

Toko online fashion untuk ibu rumah tangga yang berjualan dari rumah. Sistem mirip Shopee dengan fitur lengkap untuk customer dan seller.

## Stack Teknologi

- **Frontend**: Vanilla HTML/CSS/JavaScript (No framework, no build tool)
- **Database**: Supabase (PostgreSQL + Storage)
- **Payment**: Tripay (QRIS, Transfer Bank, Alfamart)
- **Ongkir**: RajaOngkir API (Starter)
- **Hosting**: Vercel (static)
- **Notifikasi**: WhatsApp via wa.me

## Struktur File

```
toko-online/
├── index.html          # Halaman utama toko
├── produk.html         # Detail produk
├── checkout.html       # Halaman checkout
├── sukses.html         # Halaman sukses order
├── admin/
│   ├── index.html      # Login admin
│   ├── produk.html     # Kelola produk
│   ├── order.html      # Kelola order
│   └── setting.html    # Setting toko
├── js/
│   ├── config.js       # Konfigurasi (ISI API KEY DI SINI)
│   ├── supabase.js     # Supabase client
│   ├── toko.js         # Logic halaman toko
│   ├── checkout.js     # Logic checkout
│   ├── admin.js        # Logic admin
│   └── ongkir.js       # RajaOngkir helper
├── css/
│   └── style.css       # Global styles
└── vercel.json         # Config Vercel

```

## Setup Proyek

### 1. Setup Supabase

1. Daftar di [Supabase](https://supabase.com)
2. Buat project baru
3. Buka SQL Editor dan jalankan SQL berikut:

```sql
-- Tabel produk
CREATE TABLE produk (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  harga INTEGER NOT NULL,
  stok INTEGER DEFAULT 0,
  foto_url TEXT,
  kategori TEXT DEFAULT 'fashion',
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_nama TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_alamat TEXT NOT NULL,
  customer_kota TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  ongkir INTEGER NOT NULL,
  total INTEGER NOT NULL,
  kurir TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  payment_url TEXT,
  catatan TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel setting
CREATE TABLE setting (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nama_toko TEXT DEFAULT 'Toko Cantik',
  wa_number TEXT DEFAULT '6281226123571',
  kota_asal_id TEXT DEFAULT '418',
  kota_asal_nama TEXT DEFAULT 'Magetan',
  tema_warna TEXT DEFAULT '#8B6F5E',
  logo_url TEXT,
  banner_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default setting
INSERT INTO setting (id) VALUES (1);

-- Enable RLS (optional)
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read produk" ON produk FOR SELECT USING (true);
CREATE POLICY "Allow public read setting" ON setting FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read orders" ON orders FOR SELECT USING (true);
```

4. Buat Storage Bucket:
   - Buka Storage di Supabase Dashboard
   - Buat bucket baru dengan nama: `produk-foto`
   - Set bucket sebagai **public**

5. Copy SUPABASE_URL dan SUPABASE_ANON_KEY dari Settings > API

### 2. Setup RajaOngkir

1. Daftar di [RajaOngkir](https://rajaongkir.com)
2. Pilih paket **Starter** (gratis)
3. Copy API Key

### 3. Setup Tripay

1. Daftar di [Tripay](https://tripay.co.id)
2. Gunakan mode **Sandbox** untuk testing
3. Copy API Key, Merchant Code, dan Private Key dari dashboard

### 4. Konfigurasi

Edit file `js/config.js`:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...',
  TRIPAY_API_KEY: 'DEV-xxx',
  TRIPAY_MERCHANT_CODE: 'T1234',
  TRIPAY_PRIVATE_KEY: 'xxx',
  RAJAONGKIR_KEY: 'xxx',
  WA_NUMBER: '6281226123571',
  TOKO_NAMA: 'Toko Cantik',
  KOTA_ASAL_ID: '418',
  KOTA_ASAL_NAMA: 'Magetan',
  ADMIN_PASSWORD: 'admin123',
  TRIPAY_MODE: 'sandbox',
};
```

### 5. Deploy ke Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login ke Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Ikuti instruksi di terminal
5. Toko online Anda akan live di URL Vercel

## Cara Penggunaan

### Customer

1. Buka website toko
2. Browse produk berdasarkan kategori
3. Klik produk untuk melihat detail
4. Tambahkan ke keranjang
5. Checkout dengan mengisi data pengiriman
6. Pilih kurir dan cek ongkir
7. Pilih metode pembayaran (QRIS/Transfer/Alfamart/COD)
8. Proses pesanan

### Admin

1. Buka `/admin`
2. Login dengan password (default: `admin123`)
3. **Kelola Produk**: Tambah/edit/hapus produk
4. **Kelola Order**: Lihat order masuk, update status
5. **Setting**: Ubah nama toko, nomor WA, logo, banner

## Fitur

### Customer
- Browse produk dengan filter kategori
- Detail produk
- Keranjang belanja
- Checkout dengan validasi
- Cek ongkir otomatis (JNE, TIKI, POS)
- Multiple payment gateway (QRIS, VA, Alfamart, COD)
- WhatsApp notification

### Admin
- Login sederhana
- CRUD produk dengan upload foto
- Manage order (lihat detail, update status)
- Setting toko (nama, WA, logo, banner, warna tema)
- Hubungi customer via WhatsApp

## Password Admin

**Default password**: `admin123`

**PENTING**: Ganti password di `js/config.js` setelah deploy!

## Mode Production

Sebelum go-live:

1. Ganti `TRIPAY_MODE` dari `sandbox` ke `production`
2. Update API keys Tripay ke production keys
3. Ganti `ADMIN_PASSWORD` ke password yang kuat
4. Test semua fitur di production environment

## Catatan Penting

- Semua harga dalam INTEGER (Rupiah tanpa desimal)
- Format nomor WA: `628xxxxxxxxxx` (tanpa +)
- Foto produk disimpan di Supabase Storage
- Admin menggunakan sessionStorage untuk auth (simple, cukup untuk skala kecil)
- COD langsung redirect ke WhatsApp tanpa payment gateway

## Support

Untuk pertanyaan atau masalah, hubungi developer atau baca dokumentasi:
- Supabase: https://supabase.com/docs
- RajaOngkir: https://rajaongkir.com/dokumentasi
- Tripay: https://tripay.co.id/developer

## Lisensi

Private use only.
