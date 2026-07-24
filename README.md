# GoPay Merchant Gateway

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Auth-OTP%20Based-00AED9" alt="OTP Auth" />
  <img src="https://img.shields.io/badge/QRIS-EMVCo-red" alt="QRIS" />
  <img src="https://img.shields.io/badge/Deploy-cPanel%20%26%20VPS-orange" alt="cPanel & VPS" />
</p>

<p align="center">
  <a href="https://t.me/ahmadzakiyo">
    <img src="https://img.shields.io/badge/Telegram-Chat%20Owner-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Chat Owner" />
  </a>
  &nbsp;
  <a href="https://t.me/nuxysproject">
    <img src="https://img.shields.io/badge/Telegram-Channel%20Updates-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Channel" />
  </a>
</p>

API Gateway self-hosted berbasis Node.js untuk otomatisasi cek transaksi dan cetak QRIS dinamis dari akun **GoPay / GoFood Merchant** kamu.

---

> [!NOTE]
> 💬 **HUBUNGI OWNER & BERGABUNG CHANNEL:**
> - 👤 **Developer / Owner:** [@ahmadzakiyo](https://t.me/ahmadzakiyo)
> - 📢 **Channel Update & Project:** [@nuxysproject](https://t.me/nuxysproject)

> [!TIP]
> 📣 **PENGUMUMAN & UPDATE TERBARU: Sistem Login OTP Terminal & Auto-Refresh Token**
> Gateway ini sekarang menggunakan sistem autentikasi **OTP Terminal** (`node login.js`). Kamu tidak perlu lagi copy-paste cookie browser atau memasukkan password. Cukup masukkan nomor HP GoBiz & kode OTP 1 kali saja — token akan tersimpan dan **otomatis di-refresh oleh server di background** setiap 6 jam tanpa perlu login ulang!

> [!CAUTION]
> 🚨 **PERSYARATAN DEPLOYMENT (VPS / cPanel Hosting)**
> Gateway ini **dapat di-deploy di VPS maupun cPanel Hosting (Node.js Selector v18.x)** yang memiliki penyimpanan permanen 24/7.
> **DILARANG MENGGUNAKAN HOSTING SERVERLESS GRATISAN** (seperti Render Free, Vercel, Netlify) karena container akan *sleep* dan menghapus file sesi (`.GOPAY_SESI_JANGAN_DIHAPUS.json`), yang mengakibatkan sesi hangus dan harus login OTP ulang.

> [!WARNING]
> ⚠️ **DISCLAIMER PROYEK TIDAK RESMI:**
> Project ini **tidak berafiliasi** dengan PT GoTo Gojek Tokopedia Tbk / GoPay. Gunakan dengan bijak. Polling yang terlalu agresif bisa memicu pembatasan akun. Risiko ditanggung pengguna sepenuhnya. Seluruh data berjalan 100% aman di server Anda sendiri tanpa dikirim ke pihak ketiga.

---

## ✨ Fitur Utama

- 🔐 **Login OTP Terminal** — Login resmi via SMS/WA (`node login.js`) menggunakan nomor HP GoBiz.
- 🔄 **Auto-Refresh Token (Set-and-Forget)** — Token diperbarui otomatis di background. Login cukup **1 kali saja**.
- 🧾 **QRIS Dinamis (EMVCo)** — Generate QRIS nominal custom dari QRIS statis merchant secara lokal (CRC16).
- ✅ **Cek Pembayaran Real-Time** — Cocokkan nominal + waktu transaksi secara otomatis, anti duplikat klaim.
- 📋 **Riwayat Mutasi Transaksi** — Ambil daftar mutasi QRIS/GoPay/Kartu dalam rentang waktu tertentu.
- 🌐 **Dua Cara Request (GET & POST)** — Bisa dipanggil via URL query di browser atau JSON body dari backend web store.
- 🔒 **Proteksi API Key** — Seluruh endpoint dilindungi oleh `API_KEY` rahasia milik kamu sendiri.
- 🐳 **Docker & PM2 Ready** — Siap di-deploy ke VPS Linux dalam hitungan menit.

---

## 💻 Persyaratan System

- **VPS / Dedicated Server** dengan Linux (Ubuntu 20.04/22.04, Debian, AlmaLinux, dll) & Node.js ≥ 18.
- Akun GoBiz / GoFood Merchant aktif yang terdaftar dengan nomor HP.
- QRIS statis dari aplikasi GoBiz (untuk fitur generate QRIS dinamis).

---

## 🛠️ Quick Start (Pengujian Lokal)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ahmadzakiyox/gopay-api-gateaway.git
cd gopay-api-gateaway
npm install
```

### 2. Konfigurasi `.env`
Salin template `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi variabel di file `.env`:
```env
PORT=3000
API_KEY=YOUR_API_KEY_HERE
QRIS_STATIC=YOUR_QRIS_STATIC_HERE
GOPAY_MERCHANT_ID=YOUR_MERCHANT_ID_HERE
```

### 3. Login OTP di Terminal (1 Kali Saja)
```bash
node login.js
```
- Masukkan nomor HP GoBiz (contoh: `085119772671`).
- Masukkan kode OTP (4 digit) yang dikirimkan via SMS/WA.
- Sesi login akan disimpan secara permanen di file `.GOPAY_SESI_JANGAN_DIHAPUS.json`.

---

## 🚀 Panduan Deploy Lengkap ke VPS (Production Setup)

Untuk memastikan gateway berjalan **24/7 non-stop** di VPS dan token auto-refresh bekerja dengan baik, ikuti langkah deploy di bawah ini:

### 📍 Langkah 1: Install Node.js & Git di VPS
Jalankan perintah ini di terminal VPS kamu (contoh untuk Ubuntu/Debian):
```bash
# Update package list & install Git
sudo apt update && sudo apt install -y git curl

# Install Node.js v20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 📍 Langkah 2: Setup Project & Login OTP Pertama Kali
```bash
# Clone repository
git clone https://github.com/ahmadzakiyox/gopay-api-gateaway.git
cd gopay-api-gateaway

# Install dependencies
npm install

# Buat & sesuaikan .env
cp .env.example .env
nano .env   # (isi API_KEY & QRIS_STATIC kamu)

# Jalankan login OTP (masukkan no HP & OTP)
node login.js
```

---

### 📍 Langkah 3: Pilih Metode Deploy Production

Kamu bisa memilih salah satu dari 2 metode deploy production berikut:

#### 🟢 Metode A: Deploy Menggunakan PM2 (Sangat Direkomendasikan)
PM2 adalah Process Manager untuk Node.js agar server otomatis hidup kembali jika terjadi crash atau VPS di-reboot.

1. **Install PM2 secara global:**
   ```bash
   sudo npm install -g pm2
   ```

2. **Jalankan gateway dengan PM2:**
   ```bash
   pm2 start server.js --name "gopay-gateway"
   ```

3. **Simpan agar otomatis jalan saat VPS di-reboot:**
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Jalankan perintah yang dimunculkan oleh `pm2 startup` jika ada).*

4. **Perintah Berguna PM2:**
   - Cek status server: `pm2 status`
   - Cek log real-time: `pm2 logs gopay-gateway`
   - Restart server: `pm2 restart gopay-gateway`

---

#### 🐳 Metode B: Deploy Menggunakan Docker & Docker Compose
Jika VPS kamu sudah terinstall Docker:

1. **Pastikan file `.env` dan `.GOPAY_SESI_JANGAN_DIHAPUS.json` sudah ada.**
2. **Jalankan container di background:**
   ```bash
   docker compose up -d
   ```
3. **Cek status & log container:**
   ```bash
   docker compose logs -f
   ```

---

### 🔒 (Opsional) Langkah 4: Setup Nginx Reverse Proxy & SSL HTTPS

Jika kamu ingin mengakses gateway via domain HTTPS (misal `https://gopay.domainkamu.com`):

```nginx
server {
    server_name gopay.domainkamu.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Gunakan **Certbot** untuk SSL gratis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gopay.domainkamu.com
```

## 🌐 Panduan Deploy ke cPanel Hosting (Setup Node.js App)

Bagi kamu yang menggunakan **cPanel Shared Hosting / Web Hosting** (seperti Niagahoster, Hostinger cPanel, DomaiNesia, JagoanHosting, dll), ikuti panduan setup berikut:

> [!IMPORTANT]
> ⚠️ **WAJIB MENGGUNAKAN NODE.JS VERSION 18.x DI CPANEL!**
> Jangan memilih Node.js 20.x di cPanel karena fitur internal WebAssembly (`undici`) di Node 20 akan menyebabkan error `RangeError: WebAssembly.instantiate(): Out of memory` akibat pembatasan Virtual Memory CloudLinux cPanel. **Gunakan versi Node.js 18.x.**

### 📍 Langkah 1: Upload File ke cPanel
1. Masuk ke **cPanel** -> **File Manager**.
2. Buat folder baru (misal `gopay-gateway`) atau upload seluruh source code ke folder yang diinginkan.
3. Pastikan file `.env` sudah ada dan diisi (salin dari `.env.example`).
   - ⚠️ **Perhatian Port:** Jangan menyetel `PORT=443` atau `PORT=80` di `.env`. Biarkan `PORT=3000` atau hapus baris `PORT`. cPanel akan secara otomatis menangani SSL HTTPS domain kamu.

### 📍 Langkah 2: Setup Aplikasi di cPanel
1. Buka menu **Setup Node.js App** di cPanel.
2. Klik **Create Application**.
3. Isi konfigurasi sebagai berikut:
   - **Node.js version:** Pilih **`18.x`** *(Wajib 18.x)*
   - **Application mode:** `Production`
   - **Application root:** Nama folder tempat upload (contoh: `gopay-gateway`)
   - **Application URL:** Domain/subdomain kamu (contoh: `gopay.domainkamu.com`)
   - **Application startup file:** **`server.js`** *(Wajib diubah dari default app.js)*
4. Klik **Create** di pojok kanan atas.

### 📍 Langkah 3: Install Dependencies & Login OTP via Terminal cPanel
1. Masuk ke menu **Terminal** di cPanel (atau SSH ke cPanel).
2. Copy perintah pengaktifan virtualenv dari bagian atas halaman **Setup Node.js App** (contoh: `source /home/user/nodevenv/gopay-gateway/18/bin/activate && cd /home/user/gopay-gateway`).
3. Jalankan script otomatisasi `setup.sh`:
   ```bash
   bash setup.sh
   ```
   *Script ini akan otomatis meng-install dependencies dan memandu login OTP GoPay (`node login.js`).*

4. Kembali ke menu **Setup Node.js App** di cPanel, lalu klik tombol **Restart**.
5. Cek aplikasi di browser: `https://gopay.domainkamu.com/health`.

---

## 📡 API Reference

Semua endpoint memerlukan autentikasi. Bisa lewat **Header** atau **Query Parameter**:

```text
Header   : X-Api-Key: <API_KEY>
Query    : ?api_key=<API_KEY>
```

---

### `GET /token-status` — Cek Status Sesi Token
Memverifikasi apakah token GoPay Merchant masih aktif dan valid.
```http
GET http://vps-ip:3000/token-status?api_key=RAHASIA
```
**Respon Sukses:**
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
Membuat QRIS nominal custom dari QRIS statis secara *in-memory* (lokal). QR aktif selama **5 menit**.
```http
GET http://vps-ip:3000/create-qris?amount=25000&api_key=RAHASIA
```
| Parameter | Tipe | Keterangan |
|---|---|---|
| `amount` | `number` | Nominal transaksi dalam Rupiah (wajib) |
| `api_key` | `string` | API Key kamu |

**Respon Sukses:**
```json
{
  "success": true,
  "data": {
    "qris_url": "http://vps-ip:3000/qr/abc123xyz",
    "qris_code": "00020101021126...",
    "amount": 25000,
    "expires_at": "2026-07-24T00:20:00.000Z",
    "expires_in": "5 menit"
  }
}
```

---

### `GET /check-payment` — Cek Pembayaran Masuk
Mencari transaksi yang cocok berdasarkan nominal dan timestamp. Setiap transaksi hanya bisa diklaim 1x (anti klaim ganda).
```http
GET http://vps-ip:3000/check-payment?amount=25000&api_key=RAHASIA
```
| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `amount` | `number` | — | Nominal transaksi yang dicari (wajib) |
| `startTime` | `string` | 24 jam lalu | Timestamp ISO awal pencarian |
| `api_key` | `string` | — | API Key kamu |

**Respon Sukses (Lunas):**
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
    "transaction_time": "2026-07-24T00:15:12.000Z"
  }
}
```

---

### `GET /transactions` — Riwayat Mutasi Transaksi
```http
GET http://vps-ip:3000/transactions?api_key=RAHASIA
```
| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `startTime` | `unix timestamp` | 3 hari lalu | Waktu awal (dalam detik) |
| `endTime` | `unix timestamp` | Sekarang | Waktu akhir (dalam detik) |
| `pageSize` | `number` | `20` | Jumlah transaksi yang diambil |

---

### `GET /api/logs` — Log Aktivitas Gateway
```http
GET http://vps-ip:3000/api/logs?api_key=RAHASIA
```

---

## 🌐 Cara Request: GET vs POST

Gateway ini sangat fleksibel untuk diintegrasikan ke sistem toko online (PHP, Laravel, Node.js, Python, WordPress, dll):

| Metode | Contoh Pemanggilan |
|---|---|
| **GET (URL Query)** | `http://vps-ip:3000/create-qris?amount=25000&api_key=RAHASIA` |
| **POST (JSON Body)** | `POST /create-qris` dengan Body: `{"amount": 25000}` & Header `X-Api-Key` |

---

## 📁 Struktur Project

```
gopay-gateway/
├── server.js                         # Express API Server & Logika Gateway
├── login.js                          # CLI Login OTP Interaktif Terminal (Encrypted)
├── sessionManager.js                 # Auto-Refresh Sesi & Token Manager (Encrypted)
├── setup.sh                          # Script Omatisasi Install & Setup (Linux/cPanel)
├── .env                              # File Konfigurasi Rahasia (Local)
├── .env.example                      # Template Konfigurasi
├── .GOPAY_SESI_JANGAN_DIHAPUS.json   # File Sesi Aktif (Wajib Ada di VPS/cPanel)
├── Dockerfile                        # Konfigurasi Docker
└── docker-compose.yml                # Konfigurasi Docker Compose
```

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

<p align="center">
  <img src="https://raw.githubusercontent.com/ahmadzakiyox/DB/main/6269360055874426106_121.jpg" alt="QRIS Donasi ahmadzakiyo" width="250" />
  <br/>
  <sub>Nominal bebas — terima kasih banyak! 🙏</sub>
</p>