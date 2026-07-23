# 🚀 GoPay Merchant Gateway (OTP Edition)

API Gateway ringkas untuk otomatisasi cek mutasi transaksi **GoPay Merchant / GoFood Merchant** dan pencetakan **QRIS Dinamis (EMVCo)** dengan login berbasis OTP di terminal & auto-refresh token otomatis.

---

## ⚡ Fitur Utama

- 🔐 **Login OTP Terminal**: Login cukup pakai Nomor HP (`node login.js`), tanpa perlu email/password.
- 🔄 **Auto-Refresh Sesi**: Token diperbarui otomatis di background. Login cukup **1x saja**.
- 🎨 **QRIS Dinamis**: Hasilkan QRIS nominal custom secara *in-memory* tanpa panggil API GoJek.
- 🌐 **API Request Simpel**: Bisa dipanggil langsung via URL (`GET`) di browser atau via `POST` JSON.

---

## 🚀 Quick Start (Cara Cepat)

### 1. Install Dependencies
```bash
npm install
```

### 2. Salin & Isi `.env`
```bash
cp .env.example .env
```
Atur `API_KEY` & `QRIS_STATIC` pada file `.env`.

### 3. Login OTP di Terminal (Cukup 1x di Awal)
```bash
node login.js
```
> Masukkan Nomor HP GoBiz & Kode OTP. File `.GOPAY_SESI_JANGAN_DIHAPUS.json` akan otomatis dibuat.

### 4. Jalankan Server Gateway
```bash
# Untuk Development
npm run dev

# Untuk Production (Di VPS via PM2)
pm2 start server.js --name "gopay-gateway"
```

---

## 📡 API Reference (Cara Request Simpel)

Gunakan `api_key` yang Anda atur di `.env`.

### 1. Cek Status Sesi Token
```text
GET http://vps-ip:3000/token-status?api_key=RAHASIA
```

### 2. Buat QRIS Dinamis
```text
GET http://vps-ip:3000/create-qris?amount=25000&api_key=RAHASIA
```
**Respon:**
```json
{
  "success": true,
  "data": {
    "qris_url": "http://vps-ip:3000/qr/abc123xyz",
    "qris_code": "00020101...",
    "amount": 25000,
    "expires_in": "5 menit"
  }
}
```

### 3. Cek Pembayaran Masuk (Check Payment)
```text
GET http://vps-ip:3000/check-payment?amount=25000&api_key=RAHASIA
```
**Respon (Jika Lunas):**
```json
{
  "success": true,
  "paid": true,
  "transaction": {
    "transaction_id": "TRX-12345",
    "amount": 25000,
    "payment_type": "QRIS"
  }
}
```

---

## 🚨 Poin Penting Wajib Diketahui

> [!WARNING]
> - **WAJIB VPS**: Gateway ini wajib di-deploy di **VPS / Dedicated Server** (seperti Hostinger, DigitalOcean, Vultr, AWS EC2, Biznet) yang memiliki penyimpanan permanen.
> - **DILARANG SERVERLESS GRATISAN**: Jangan gunakan Render free / Vercel / Netlify gratisan karena container akan *sleep* dan menghapus file sesi, yang bisa menyebabkan akun GoBiz Anda terkena limit/blokir.

> [!IMPORTANT]
> - **UNOFFICIAL GATEWAY**: Proyek ini tidak berafiliasi dengan PT. GoTo Gojek Tokopedia Tbk / GoPay.
> - **100% AMAN & PRIVATE**: Seluruh kode berjalan 100% di VPS Anda sendiri tanpa ada data yang dikirim ke pihak ketiga.
