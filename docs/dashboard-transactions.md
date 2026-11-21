# Dashboard transaksi dan GoPay Management

## Halaman
- `/dashboard`: grafik nominal pembayaran sukses berdasarkan `paid_at`, log order berdasarkan `created_at`, filter status/ID, pagination 20 baris, detail transaksi.
- `/gpy-manager`: dashboard konfigurasi sebelumnya, termasuk login GoPay, OTP, QRIS, API key, dan simulasi. Handler existing dipertahankan.
- Login Telegram dan callback backend tidak diubah. Pengguna terautentikasi di `/` juga melihat dashboard transaksi.

## Endpoint baru (session cookie existing wajib)
- `GET /api/dashboard/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/dashboard/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&status=all|pending|paid|expired&search=...&page=1`

Rentang tanggal inklusif dalam WIB, maksimal 366 hari; query memakai batas akhir eksklusif. Data hanya milik pengguna session. Endpoint hanya SELECT, tidak memanggil provider atau mengubah status. Status pending/expired mengikuti state tersimpan dari mekanisme existing.

Nominal terbayar/grafik berdasarkan waktu bayar; jumlah status dan log berdasarkan waktu order dibuat. Karena itu pembayaran order lama yang baru lunas dapat masuk grafik tetapi tidak ke jumlah order periode ini. Filter status/pencarian berlaku pada log saja. Simulasi termasuk karena sumber data existing tidak membedakannya.

## Deployment dan pemeriksaan staging
Tidak memerlukan migrasi. Deploy backend dan frontend bersama dengan konfigurasi `VITE_API_URL` existing. Restart backend lewat prosedur deployment yang biasa digunakan.

Web server harus memiliki SPA fallback, misalnya pada blok location frontend Nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Jangan mengganti blok proxy API/OAuth yang sudah berjalan. Pastikan refresh langsung `/dashboard` dan `/gpy-manager` tidak 404.

Waktu `paid_at` existing ditulis UTC oleh `toMysqlDateTime`. Pelaporan menganggap DATETIME order juga UTC; verifikasi timezone Node/database dan data historis pada staging sebelum mempercayai laporan lintas tengah malam. Tidak ada perubahan timezone koneksi atau writer pembayaran pada fitur ini.

Checklist staging:
- Pengguna tanpa session tidak dapat mengakses kedua API laporan.
- Akun A tidak melihat transaksi akun B.
- Cocokkan nominal grafik dengan SUM payable_amount paid_at pada rentang UTC ekuivalen WIB.
- Periksa transaksi dekat pukul 00.00 WIB, pending/sukses/expired, filter kosong dan pagination.
- Login GoPay/OTP, konfigurasi QRIS/API key, dan simulasi tetap tersedia di management.
- Periksa desktop dan ponsel; hard refresh bila aset lama masih tersimpan di cache.

## Referensi desain
- Utama: https://mercury.com/blog/updated-transactions-page — analitik di atas ledger, filter/log terbaca.
- Pendukung: https://docs.stripe.com/payments/analytics — hierarchy KPI.
- https://docs.stripe.com/reports/activity-breakdown — penelusuran ringkasan ke transaksi.

Reference lock: putih/netral, hijau existing #1E5A43 untuk aksi dan grafik, Inter, pemisah tipis, tanpa gradient atau shadow dekoratif. Grafik dan strip metrik berada dalam satu bagian; log berada di bawah. Status selalu memiliki teks. Angka rata kanan/tabular.

Verifikasi otomatis: `node --test platform/test/*.test.js`. Tes scope membandingkan backend dan handler frontend dengan baseline commit sebelum pemisahan; perubahan hanya penambahan registrasi laporan dan presentasi halaman.
