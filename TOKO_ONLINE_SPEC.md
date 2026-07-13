# SPEC LENGKAP — Toko Online Fashion (Opsi B)
> Dokumen ini adalah panduan eksekusi penuh untuk Claude Code.
> Baca semua bagian sebelum menulis satu baris kode pun.

---

## 1. RINGKASAN PROYEK

Toko online fashion untuk ibu rumah tangga yang berjualan dari rumah.
Menggantikan ketergantungan pada Shopee agar tidak kena potongan besar.
Sistem mirip Shopee: customer bisa browse, checkout, bayar, seller kelola dari dashboard.

**Stack:**
- Frontend: Vanilla HTML/CSS/JS (NO framework, NO build tool)
- Database: Supabase (PostgreSQL + Storage untuk foto produk)
- Payment: Tripay (QRIS, Transfer Bank, Alfamart)
- Ongkir: RajaOngkir API (Starter — gratis)
- Hosting: Vercel (static)
- Notif: WhatsApp via wa.me link otomatis

**Deliverable: 1 folder project, siap deploy Vercel.**

---

## 2. FILE STRUCTURE

```
toko-online/
├── index.html          ← Halaman utama (toko customer)
├── produk.html         ← Detail produk
├── checkout.html       ← Halaman checkout
├── sukses.html         ← Halaman order berhasil
├── admin/
│   ├── index.html      ← Dashboard admin (login)
│   ├── produk.html     ← Kelola produk (tambah/edit/hapus)
│   └── order.html      ← Kelola order masuk
├── js/
│   ├── config.js       ← Semua API key & config (EDIT DI SINI)
│   ├── supabase.js     ← Supabase client
│   ├── toko.js         ← Logic halaman toko
│   ├── checkout.js     ← Logic checkout & payment
│   ├── admin.js        ← Logic dashboard admin
│   └── ongkir.js       ← RajaOngkir logic
├── css/
│   └── style.css       ← Global styles
└── vercel.json         ← Config Vercel
```

---

## 3. CONFIG (js/config.js)

```javascript
const CONFIG = {
  SUPABASE_URL: 'ISI_NANTI',
  SUPABASE_ANON_KEY: 'ISI_NANTI',
  TRIPAY_API_KEY: 'ISI_NANTI',
  TRIPAY_MERCHANT_CODE: 'ISI_NANTI',
  TRIPAY_PRIVATE_KEY: 'ISI_NANTI',
  RAJAONGKIR_KEY: 'ISI_NANTI',
  WA_NUMBER: '6281226123571',
  TOKO_NAMA: 'Toko Cantik',        // bisa edit di dashboard
  KOTA_ASAL_ID: '418',             // ID kota Magetan di RajaOngkir
  KOTA_ASAL_NAMA: 'Magetan',
  ADMIN_PASSWORD: 'admin123',       // ganti setelah deploy
  TRIPAY_MODE: 'sandbox',          // ganti ke 'production' saat live
};
```

---

## 4. DATABASE SUPABASE

### Jalankan SQL ini di Supabase SQL Editor:

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel order
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_order TEXT UNIQUE NOT NULL,
  nama_pembeli TEXT NOT NULL,
  no_hp TEXT NOT NULL,
  alamat TEXT NOT NULL,
  kota_tujuan_id TEXT NOT NULL,
  kota_tujuan_nama TEXT NOT NULL,
  kurir TEXT NOT NULL,
  layanan_kurir TEXT NOT NULL,
  ongkir INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status_pembayaran TEXT DEFAULT 'pending', -- pending, paid, failed
  status_order TEXT DEFAULT 'baru',         -- baru, proses, kirim, selesai
  tripay_reference TEXT,
  payment_url TEXT,
  resi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel item order
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  produk_id UUID REFERENCES produk(id),
  nama_produk TEXT NOT NULL,
  harga INTEGER NOT NULL,
  qty INTEGER NOT NULL
);

-- Tabel setting toko
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

-- Insert setting default
INSERT INTO setting (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting ENABLE ROW LEVEL SECURITY;

-- Produk: semua bisa baca, hanya admin bisa tulis
CREATE POLICY "produk_read" ON produk FOR SELECT USING (true);
CREATE POLICY "produk_write" ON produk FOR ALL USING (true);

-- Orders: semua bisa insert, admin bisa baca semua
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_read" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (true);

CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_read" ON order_items FOR SELECT USING (true);

CREATE POLICY "setting_read" ON setting FOR SELECT USING (true);
CREATE POLICY "setting_write" ON setting FOR ALL USING (true);

-- Storage bucket untuk foto produk
INSERT INTO storage.buckets (id, name, public) VALUES ('produk-foto', 'produk-foto', true);
CREATE POLICY "foto_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'produk-foto');
CREATE POLICY "foto_read" ON storage.objects FOR SELECT USING (bucket_id = 'produk-foto');
CREATE POLICY "foto_delete" ON storage.objects FOR DELETE USING (bucket_id = 'produk-foto');
```

---

## 5. HALAMAN CUSTOMER

### 5.1 index.html — Halaman Toko Utama
**Komponen:**
- Navbar: logo toko + icon keranjang (badge qty) + nama toko dari Supabase
- Hero banner: foto banner dari setting, tagline
- Filter kategori (tombol pill)
- Grid produk: foto, nama, harga, tombol "Beli" — data dari Supabase
- Keranjang: slide panel dari kanan, list item + total + tombol checkout
- Footer: nama toko, WA, kota

**Logic:**
- Load produk dari Supabase `produk` table (aktif=true)
- Keranjang disimpan di localStorage
- Klik "Beli" → tambah ke keranjang
- Klik icon keranjang → buka panel keranjang

### 5.2 checkout.html — Checkout
**Komponen:**
- Ringkasan keranjang (readonly)
- Form data pembeli:
  - Nama lengkap
  - No HP
  - Alamat lengkap
  - Provinsi (dropdown dari RajaOngkir)
  - Kota/Kab (dropdown dari RajaOngkir, filter by provinsi)
- Cek ongkir:
  - Setelah isi kota → otomatis load pilihan kurir
  - Tampilkan: nama kurir, layanan, estimasi, harga
  - User pilih salah satu
- Ringkasan biaya:
  - Subtotal produk
  - Ongkir (dari pilihan kurir)
  - Total
- Pilihan pembayaran: QRIS / Transfer Bank / Alfamart / COD (COD = notif WA langsung)
- Tombol "Bayar Sekarang"

**Logic:**
- Generate kode order: `ORD-{timestamp}`
- Simpan order ke Supabase
- Jika non-COD → hit Tripay API → redirect ke payment_url
- Jika COD → langsung ke sukses.html + buka WA otomatis

### 5.3 sukses.html — Order Berhasil
**Komponen:**
- Icon centang animasi
- Kode order
- Ringkasan order
- Status pembayaran
- Tombol "Konfirmasi via WhatsApp" → wa.me link dengan pesan:
```
Halo Kak, saya mau konfirmasi order:
Kode: {kode_order}
Total: Rp{total}
Nama: {nama}
Alamat: {alamat}
Kurir: {kurir} - {layanan}
```
- Tombol "Lanjut Belanja"

---

## 6. DASHBOARD ADMIN

### 6.1 admin/index.html — Login Admin
- Form password sederhana
- Password dari CONFIG.ADMIN_PASSWORD
- Simpan session ke sessionStorage
- Redirect ke admin/produk.html

### 6.2 admin/produk.html — Kelola Produk
**Komponen:**
- Sidebar navigasi: Produk | Order | Setting
- Tombol "Tambah Produk"
- Tabel produk: foto thumbnail, nama, harga, stok, status aktif, aksi (edit/hapus)
- Modal tambah/edit produk:
  - Upload foto (ke Supabase Storage)
  - Nama produk
  - Deskripsi
  - Harga (format Rupiah)
  - Stok
  - Kategori
  - Toggle aktif/nonaktif

**Logic:**
- CRUD ke Supabase `produk` table
- Upload foto ke Supabase Storage bucket `produk-foto`
- Hapus foto lama saat ganti foto

### 6.3 admin/order.html — Kelola Order
**Komponen:**
- Filter status: Semua | Baru | Proses | Kirim | Selesai
- Tabel order: kode, nama, total, kurir, status bayar, status order, aksi
- Klik order → modal detail:
  - Info pembeli lengkap
  - Item yang dibeli
  - Info pengiriman
  - Input resi
  - Ubah status order
  - Tombol WA ke pembeli

### 6.4 admin/setting.html — Setting Toko
**Komponen:**
- Nama toko
- Nomor WA
- Kota asal kirim
- Upload logo
- Upload banner
- Warna tema (color picker)
- Tombol Simpan → update Supabase `setting` table

---

## 7. INTEGRASI RAJAONGKIR

**Endpoint yang dipakai:**
```
GET https://api.rajaongkir.com/starter/province
GET https://api.rajaongkir.com/starter/city?province={id}
POST https://api.rajaongkir.com/starter/cost
  body: { origin: CONFIG.KOTA_ASAL_ID, destination: kota_tujuan_id, weight: 500, courier: 'jne:j&t:sicepat' }
```

**Fallback jika API error:** tampilkan pesan "Cek ongkir gagal, hubungi penjual via WA"

---

## 8. INTEGRASI TRIPAY

**Mode sandbox dulu untuk testing.**

```javascript
// Create transaction
POST https://tripay.co.id/api-sandbox/transaction/create
Headers: { Authorization: 'Bearer {TRIPAY_API_KEY}' }
Body: {
  method: 'QRIS' | 'BRIVA' | 'ALFAMART',
  merchant_ref: kode_order,
  amount: total,
  customer_name: nama,
  customer_email: 'customer@email.com',
  customer_phone: no_hp,
  order_items: [...],
  return_url: '{BASE_URL}/sukses.html?order={kode_order}',
  expired_time: Math.floor(Date.now()/1000) + (24*60*60)
}
```

---

## 9. DESAIN SISTEM

**Palet Warna:**
```css
--primary: #8B6F5E;      /* Coklat kalem */
--primary-light: #C4A882; /* Coklat muda */
--accent: #E8D5C0;        /* Cream */
--bg: #FAF7F4;            /* Background putih cream */
--text: #3D2B1F;          /* Teks gelap coklat */
--text-light: #8B7355;    /* Teks sekunder */
--success: #6B8F71;       /* Hijau kalem */
--danger: #C0665A;        /* Merah kalem */
--white: #FFFFFF;
--border: #E5D5C5;
```

**Typography:**
```css
font-family: 'Plus Jakarta Sans', sans-serif; /* Load dari Google Fonts */
```

**Prinsip Desain:**
- Mobile-first (breakpoint utama 768px)
- Card produk: rounded-16, shadow halus, foto square 1:1
- Tombol: rounded-full, warna primary
- Semua input: rounded-12, border cream, focus ring coklat
- Loading state: skeleton screen (bukan spinner)

---

## 10. DUMMY DATA PRODUK AWAL

Buat 6 produk dummy ini di Supabase saat init:
```
1. Cardigan Rajut Kalem — Rp85.000 — stok 10
2. Daster Katun Premium — Rp65.000 — stok 15
3. Baju Busui Kekinian — Rp75.000 — stok 8
4. Set Piyama Wanita — Rp95.000 — stok 12
5. Blouse Casual Polos — Rp70.000 — stok 20
6. Celana Kulot Linen — Rp80.000 — stok 10
```
Foto: gunakan https://picsum.photos/seed/{nama}/400/400

---

## 11. VERCEL CONFIG (vercel.json)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## 12. URUTAN EKSEKUSI (untuk Claude Code)

```
1. Buat struktur folder
2. Buat js/config.js
3. Buat css/style.css (design system lengkap)
4. Buat js/supabase.js (Supabase client)
5. Buat js/ongkir.js (RajaOngkir helper)
6. Buat index.html (halaman toko)
7. Buat checkout.html
8. Buat sukses.html
9. Buat admin/index.html (login)
10. Buat admin/produk.html
11. Buat admin/order.html
12. Buat admin/setting.html
13. Buat js/toko.js
14. Buat js/checkout.js
15. Buat js/admin.js
16. Buat vercel.json
```

---

## 13. CATATAN PENTING

- JANGAN pakai framework (React, Vue, dll)
- JANGAN pakai bundler (Webpack, Vite, dll)
- SEMUA file harus jalan langsung di browser tanpa build step
- Supabase JS pakai CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- API key Tripay & RajaOngkir diisi manual di config.js setelah daftar
- COD tidak perlu Tripay — langsung redirect WA
- Admin login pakai sessionStorage (bukan JWT) — cukup untuk skala ini
- Semua harga dalam INTEGER (Rupiah, tanpa desimal)
- Format tampil harga: `Rp85.000` (titik sebagai pemisah ribuan)

---

## 14. SETUP SETELAH DEPLOY

Langkah yang harus dilakukan pemilik toko:
1. Daftar Supabase → dapat URL + anon key → isi di config.js
2. Jalankan SQL di bagian 4 → database siap
3. Daftar RajaOngkir starter → dapat API key → isi di config.js
4. Daftar Tripay → dapat API key + merchant code → isi di config.js
5. Deploy ke Vercel → toko live
6. Buka /admin → login → setting toko → isi nama toko, WA, dll
7. Tambah produk pertama via dashboard admin
8. TEST: order dummy sebelum share ke pembeli

---

*Dokumen ini cukup untuk eksekusi penuh tanpa pertanyaan tambahan.*
