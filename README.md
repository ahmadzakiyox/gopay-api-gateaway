# 🟢 GoPay Merchant Gateway

> API Gateway self-hosted untuk otomatisasi cek transaksi & cetak QRIS dinamis dari akun **GoPay / GoFood Merchant** kamu sendiri.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 🔐 Login OTP Terminal | Login pakai nomor HP GoBiz lewat terminal (`node login.js`) |
| 🔄 Auto-Refresh Token | Token diperbarui otomatis tiap 6 jam. Login cukup **1x saja** |
| 🧾 QRIS Dinamis | Generate QRIS nominal custom dari QRIS statis merchant kamu |
| ✅ Cek Pembayaran | Cocokkan nominal transaksi masuk secara real-time |
| 📋 Lihat Mutasi | Ambil daftar transaksi QRIS/GoPay dalam rentang waktu tertentu |
| 🔒 Proteksi API Key | Semua endpoint dilindungi `API_KEY` milik kamu sendiri |

---

## 🚀 Cara Mulai

### 1. Clone & Install
```bash
git clone <repo-url>
cd gopay-gateway
npm install
```

### 2. Buat file `.env`
```bash
cp .env.example .env
```
Isi `.env` sesuai konfigurasi kamu:
```env
PORT=3000
API_KEY=rahasia_api_key_kamu          # Kunci akses API kamu sendiri
QRIS_STATIC=00020101021126...         # QRIS statis dari aplikasi GoBiz
GOPAY_MERCHANT_ID=G020xxxxxx          # Opsional, diambil otomatis saat login
```

### 3. Login OTP (Cukup 1x)
```bash
node login.js
```
Masukkan nomor HP GoBiz kamu → masukkan kode OTP yang dikirim via SMS/WA.

> Sesi tersimpan di `.GOPAY_SESI_JANGAN_DIHAPUS.json` — **jangan dihapus!**

### 4. Jalankan Server
```bash
# Development
npm run dev

# Production (pakai PM2)
pm2 start server.js --name gopay-gateway
pm2 save
```

---

## 📡 API Endpoints

Semua endpoint butuh `api_key`. Bisa lewat **Header** atau **Query Param**.

### `GET /token-status` — Cek Status Sesi
```
http://vps-ip:3000/token-status?api_key=RAHASIA
```

### `GET /create-qris` — Buat QRIS Dinamis
```
http://vps-ip:3000/create-qris?amount=25000&api_key=RAHASIA
```
```json
{
  "success": true,
  "data": {
    "qris_url": "http://vps-ip:3000/qr/abc123",
    "qris_code": "00020101...",
    "amount": 25000,
    "expires_in": "5 menit"
  }
}
```

### `GET /check-payment` — Cek Pembayaran Lunas
```
http://vps-ip:3000/check-payment?amount=25000&api_key=RAHASIA
```
```json
{ "success": true, "paid": true, "transaction": { "amount": 25000, ... } }
```

### `GET /transactions` — Lihat Mutasi Transaksi
```
http://vps-ip:3000/transactions?api_key=RAHASIA
```

### `GET /api/logs` — Lihat Log Server
```
http://vps-ip:3000/api/logs?api_key=RAHASIA
```

> **Semua endpoint juga mendukung POST dengan JSON body** — fleksibel untuk integrasi apapun.

---

## 🐳 Deploy via Docker
```bash
docker compose up -d
```

---

## ⚠️ Hal Penting

> [!WARNING]
> **Wajib pakai VPS** (Hostinger, DigitalOcean, Vultr, dll). Jangan pakai hosting serverless gratis (Vercel, Render free) karena file sesi akan terhapus saat container tidur.

> [!CAUTION]
> Proyek ini **tidak resmi** dan tidak berafiliasi dengan PT GoTo / GoPay. Gunakan dengan bijak dan risiko ditanggung sendiri. Seluruh data berjalan 100% di server kamu — tidak ada data yang dikirim ke pihak ketiga.

---

## 📁 Struktur Project

```
gopay-gateway/
├── server.js                        # Express server + semua endpoint API
├── login.js                         # CLI login OTP interaktif
├── sessionManager.js                # Manajemen sesi & auto-refresh token
├── .env                             # Konfigurasi (jangan di-commit!)
├── .GOPAY_SESI_JANGAN_DIHAPUS.json  # File sesi aktif (jangan dihapus!)
└── Dockerfile                       # Deploy via Docker
```
