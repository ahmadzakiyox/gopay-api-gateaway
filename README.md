# GoPay Merchant Gateway

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Auth-OTP%20Based-00AED9" alt="OTP Auth" />
  <img src="https://img.shields.io/badge/QRIS-EMVCo-red" alt="QRIS" />
  <img src="https://img.shields.io/badge/Deploy-VPS%20Only-orange" alt="VPS" />
</p>

API Gateway self-hosted berbasis Node.js untuk otomatisasi cek transaksi dan cetak QRIS dinamis dari akun **GoPay / GoFood Merchant** kamu. Login cukup sekali via OTP terminal, token diperbarui otomatis di background.

> [!WARNING]
> **Proyek Tidak Resmi:** Project ini tidak berafiliasi dengan PT GoTo / GoPay. Gunakan dengan bijak. Polling yang terlalu agresif bisa memicu pembatasan akun. Risiko ditanggung pengguna.

---

## Fitur Utama

- 🔐 **Login OTP Terminal** — Login via `node login.js` menggunakan nomor HP GoBiz, tanpa email/password
- 🔄 **Auto-Refresh Token** — Token diperbarui otomatis setiap 6 jam di background. Login cukup **1 kali**
- 🧾 **QRIS Dinamis (EMVCo)** — Generate QRIS nominal custom dari QRIS statis merchant, dihitung lokal (CRC16)
- ✅ **Cek Pembayaran** — Cocokkan nominal + waktu transaksi secara real-time, anti duplikat klaim
- 📋 **Riwayat Mutasi** — Ambil transaksi QRIS/GoPay/Kartu dalam rentang waktu tertentu
- 🔒 **Proteksi API Key** — Semua endpoint dilindungi `API_KEY` milik kamu sendiri
- 🐳 **Docker Ready** — Bisa di-deploy pakai `docker compose up -d`

---

## Persyaratan

- **VPS / Dedicated Server** dengan Node.js ≥ 18 (wajib, lihat [Catatan VPS](#-catatan-penting-wajib-vps))
- Akun GoBiz / GoFood Merchant aktif yang terdaftar dengan nomor HP
- QRIS statis dari aplikasi GoBiz (untuk fitur generate QRIS dinamis)

---

## Instalasi & Setup

### 1. Clone & Install

```bash
git clone <url-repo-ini>
cd gopay-gateway
npm install
```

### 2. Konfigurasi `.env`

```bash
cp .env.example .env
```

Buka `.env` dan isi sesuai kebutuhan:

```env
PORT=3000
API_KEY=rahasia_api_key_kamu          # Kunci untuk semua request API ke gateway ini
QRIS_STATIC=00020101021126...         # String QRIS statis dari aplikasi GoBiz
GOPAY_MERCHANT_ID=G020xxxxxx          # Opsional, diambil otomatis saat login
```

> **Catatan:** `GOPAY_MERCHANT_ID` akan otomatis terisi setelah kamu menjalankan `node login.js`.

### 3. Login OTP (Cukup 1 Kali)

```bash
node login.js
```

Program akan meminta nomor HP GoBiz kamu, mengirim OTP via SMS/WA, lalu menyimpan sesi ke file `.GOPAY_SESI_JANGAN_DIHAPUS.json`.

```
====================================================
   GOPAY MERCHANT / GOFOOD MERCHANT LOGIN OTP CLI
====================================================

>> Masukkan Nomor HP GoBiz/GoFood Merchant: 085119772671
[*] Mengirim permintaan OTP...
[+] Kode OTP (4 digit) berhasil dikirim via SMS!
>> Masukkan Kode OTP: 1234
[SUCCESS] LOGIN BERHASIL & SESI TERSIMPAN!
```

> [!IMPORTANT]
> **Jangan hapus** file `.GOPAY_SESI_JANGAN_DIHAPUS.json`. File ini berisi token aktif yang diperlukan gateway untuk berjalan. Jika terhapus, kamu harus login ulang.

### 4. Jalankan Server

```bash
# Development (auto-restart saat ada perubahan)
npm run dev

# Production menggunakan PM2
pm2 start server.js --name gopay-gateway
pm2 save
pm2 startup
```

Server berjalan di `http://localhost:3000` (atau port yang kamu atur di `.env`).

---

## API Reference

Semua endpoint memerlukan autentikasi. Bisa lewat **Header** atau **Query Parameter**:

```
Header   : X-Api-Key: <API_KEY>
Query    : ?api_key=<API_KEY>
```

---

### `GET /token-status` — Cek Status Sesi

Memverifikasi apakah token aktif dengan mencoba hit API GoPay secara langsung.

```http
GET http://vps-ip:3000/token-status?api_key=RAHASIA
```

**Respon:**
```json
{
  "success": true,
  "data": {
    "token_status": "valid",
    "message": "Token dan Sesi GoPay Merchant Aktif"
  }
}
```

---

### `GET /create-qris` — Buat QRIS Dinamis

Membuat QRIS dengan nominal tertentu secara lokal dari QRIS statis. Tidak memanggil API GoJek. QR aktif selama **5 menit**.

```http
GET http://vps-ip:3000/create-qris?amount=25000&api_key=RAHASIA
```

| Parameter | Tipe | Keterangan |
|---|---|---|
| `amount` | `number` | Nominal dalam Rupiah (wajib) |
| `api_key` | `string` | API Key kamu |

**Respon:**
```json
{
  "success": true,
  "data": {
    "qris_url": "http://vps-ip:3000/qr/abc123xyz",
    "qris_code": "00020101021126...",
    "amount": 25000,
    "expires_at": "2026-07-23T17:00:00.000Z",
    "expires_in": "5 menit"
  }
}
```

> `qris_url` adalah link gambar QR yang langsung bisa di-embed ke halaman web atau WhatsApp.

---

### `GET /check-payment` — Cek Pembayaran Masuk

Mencari transaksi yang cocok berdasarkan **nominal + waktu**. Setiap transaksi hanya bisa diklaim **1 kali** (anti double-claim).

```http
GET http://vps-ip:3000/check-payment?amount=25000&api_key=RAHASIA
```

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `amount` | `number` | — | Nominal yang dicari (wajib) |
| `startTime` | `string` | 24 jam lalu | ISO timestamp awal pencarian |
| `api_key` | `string` | — | API Key kamu |

**Respon (Lunas):**
```json
{
  "success": true,
  "paid": true,
  "transaction": {
    "transaction_id": "TRX-12345",
    "order_id": "GOPAY-1234567890",
    "amount": 25000,
    "payer_issuer": "GoPay / BCA",
    "payment_type": "QRIS",
    "transaction_time": "2026-07-23T17:05:12.000Z"
  }
}
```

**Respon (Belum Lunas):**
```json
{ "success": true, "paid": false, "message": "Pembayaran Belum Ditemukan Atau Sudah Pernah Diklaim" }
```

---

### `GET /transactions` — Riwayat Mutasi

Mengambil daftar transaksi QRIS/GoPay/Kartu dalam rentang waktu tertentu.

```http
GET http://vps-ip:3000/transactions?api_key=RAHASIA
```

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `startTime` | `unix timestamp` | 3 hari lalu | Waktu awal (dalam detik) |
| `endTime` | `unix timestamp` | Sekarang | Waktu akhir (dalam detik) |
| `pageSize` | `number` | `20` | Jumlah transaksi yang diambil |

---

### `GET /api/logs` — Log Aktivitas Server

```http
GET http://vps-ip:3000/api/logs?api_key=RAHASIA
```

Menampilkan 100 log aktivitas server terakhir (disimpan di memori).

---

## Cara Request: GET vs POST

Semua endpoint utama mendukung **dua cara request** — fleksibel untuk berbagai kebutuhan integrasi:

| Cara | Contoh |
|---|---|
| **GET (URL langsung)** | `?amount=25000&api_key=RAHASIA` |
| **POST (JSON Body)** | `{"amount": 25000}` + Header `X-Api-Key` |

Cocok untuk integrasi dari **PHP, Python, WordPress, platform toko online**, atau panggilan langsung dari browser.

---

## Deploy via Docker

```bash
docker compose up -d
```

Pastikan file `.env` dan `.GOPAY_SESI_JANGAN_DIHAPUS.json` ada di direktori yang sama sebelum menjalankan Docker.

---

## Struktur Project

```
gopay-gateway/
├── server.js                         # Express server & semua endpoint API
├── login.js                          # CLI login OTP interaktif
├── sessionManager.js                 # Manajemen sesi, auto-refresh token
├── .env                              # Konfigurasi rahasia (jangan di-commit!)
├── .env.example                      # Template konfigurasi
├── .GOPAY_SESI_JANGAN_DIHAPUS.json   # File sesi aktif (otomatis dibuat)
├── Dockerfile
└── docker-compose.yml
```

---

## ⚠️ Catatan Penting: Wajib VPS

> [!CAUTION]
> Gateway ini **wajib di-deploy di VPS atau Dedicated Server** (Hostinger, DigitalOcean, Vultr, AWS EC2, Biznet, dll).
>
> **Jangan gunakan:**
> - Hosting gratis seperti Render free, Railway free, Vercel, Netlify — container akan *sleep* dan menghapus file sesi
> - Laptop/PC pribadi — server harus berjalan 24/7 agar token tidak kedaluwarsa
>
> File `.GOPAY_SESI_JANGAN_DIHAPUS.json` harus tersimpan **secara permanen** di disk VPS agar auto-refresh token bisa bekerja.

---

## 💬 Kontak & Komunitas

Ada pertanyaan, error, atau mau diskusi? Hubungi langsung:

<p align="center">
  <a href="https://t.me/ahmadzakiyo">
    <img src="https://img.shields.io/badge/Telegram-Chat%20Owner-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Chat Owner" />
  </a>
  &nbsp;
  <a href="https://t.me/nuxysproject">
    <img src="https://img.shields.io/badge/Telegram-Channel%20Updates-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Channel" />
  </a>
</p>

- 👤 **Owner / Developer:** [@ahmadzakiyo](https://t.me/ahmadzakiyo)
- 📢 **Channel (Update & Project):** [@nuxysproject](https://t.me/nuxysproject)

---

## ☕ Dukung Project Ini

Kalau project ini bermanfaat buat kamu, traktir saya kopi ya! ☕

Scan QRIS di bawah (GoPay / semua e-wallet):

<p align="center">
  <img src="https://raw.githubusercontent.com/ahmadzakiyox/DB/main/6269360055874426106_121.jpg" alt="QRIS Donasi ahmadzakiyo" width="250" />
  <br/>
  <sub>Nominal bebas — terima kasih banyak! 🙏</sub>
</p>
