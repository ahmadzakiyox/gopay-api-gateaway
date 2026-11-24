import React from 'react';
import { Shield, Lock, Eye, Database, Trash2, KeyRound } from 'lucide-react';
import { LegalLayout } from './LegalLayout';

export default function PrivacyPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="privacy"
      title="Kebijakan Privasi"
      tagline="Komitmen kami dalam mengamankan data akun, privasi pengguna, dan hak pengelolaan data Anda."
      date="Terakhir diperbarui: 24 November 2026"
      user={user}
      onLogout={onLogout}
    >
      <p>
        AlternatePay ("Kami") berkomitmen untuk selalu menjunjung tinggi keamanan dan kerahasiaan data Anda ("Anda" atau "Pengguna") sehubungan dengan penggunaan layanan otomasi transaksi QRIS Kami melalui situs web AlternatePay. Kebijakan Privasi ini menjelaskan kebijakan Kami terkait perolehan, penyimpanan, pengamanan, dan hak penghapusan data Anda.
      </p>

      <h2>1. PENGUMPULAN DATA</h2>
      <p>
        Untuk dapat menggunakan layanan Kami, Pengguna memberikan data yang diperlukan secara sukarela melalui protokol autentikasi resmi:
      </p>
      <ul>
        <li><strong>Data Profil Telegram:</strong> Telegram ID, username, nama profil, dan foto profil yang diteruskan oleh sistem Telegram OAuth resmi.</li>
        <li><strong>Data Akun GoPay Merchant:</strong> Nomor telepon gerai, Merchant ID, nama outlet, dan nama pemilik gerai yang tercatat di GoBiz.</li>
        <li><strong>Token Sesi GoBiz:</strong> Access token dan refresh token yang diperoleh setelah verifikasi OTP, yang digunakan untuk mengecek mutasi transaksi QRIS gerai Anda secara berkala.</li>
        <li><strong>Konfigurasi QRIS:</strong> Payload string QRIS statis outlet resmi Anda untuk membuat QRIS dinamis.</li>
        <li><strong>Log & Riwayat Transaksi:</strong> Order ID, nominal transaksi, penanda unik (surcharge), status pembayaran, dan waktu transaksi.</li>
      </ul>

      <h2>2. PENGGUNAAN DATA</h2>
      <p>
        Kami hanya menggunakan data yang dikumpulkan untuk tujuan-tujuan berikut:
      </p>
      <ul>
        <li>Melakukan verifikasi dan pencocokan mutasi QRIS GoPay Merchant secara otomatis;</li>
        <li>Menyediakan statistik dan grafik analitik pada dashboard pengguna;</li>
        <li>Menyediakan layanan notifikasi status transaksi via REST API;</li>
        <li>Memastikan keamanan sistem dan mencegah akses tidak sah.</li>
      </ul>
      <p>
        <strong>Kami tidak pernah memperjualbelikan, menyewakan, atau membagikan data akun maupun transaksi Anda kepada pihak ketiga manapun untuk tujuan komersial atau periklanan.</strong>
      </p>

      <h2>3. PENGAMANAN DAN ENKRIPSI</h2>
      <p>
        Keamanan data Anda adalah prioritas utama Kami:
      </p>
      <ul>
        <li>Seluruh token sesi GoBiz (access token dan refresh token) disimpan dalam database menggunakan <strong>enkripsi simetris standar industri AES-256-GCM</strong>. Token sesi tidak pernah disimpan dalam format teks polos (plaintext).</li>
        <li>API Key yang dibuat hanya disimpan dalam bentuk <strong>kriptografi hash satu arah (SHA-256)</strong> di server kami, sehingga tidak dapat didekripsi kembali oleh pihak manapun.</li>
        <li>Kami tidak pernah meminta, mengakses, atau menyimpan PIN transaksi GoPay Anda.</li>
        <li>Seluruh komunikasi data antara peramban (browser) dan server Kami dilindungi oleh protokol HTTPS dengan enkripsi TLS/SSL modern.</li>
      </ul>

      <h2>4. HAK PENGHAPUSAN DATA (DATA PURGE)</h2>
      <p>
        Pengguna memiliki kendali penuh atas data mereka di AlternatePay:
      </p>
      <ul>
        <li>Melalui tombol <strong>Logout GoPay</strong> di menu GoPay Management, Anda dapat kapan saja memutuskan koneksi GoPay. Tindakan ini seketika menghapus token sesi GoBiz, access token, refresh token, dan konfigurasi QRIS statis Anda dari basis data kami secara permanen.</li>
        <li>Anda juga dapat melakukan logout dari sesi akun Telegram Anda kapan saja melalui tombol Logout pada menu navigasi.</li>
      </ul>

      <h2>5. LAYANAN PIHAK KETIGA</h2>
      <p>
        AlternatePay berinteraksi dengan layanan pihak ketiga seperti Telegram dan sistem GoBiz/GoPay. Setiap pihak ketiga memiliki kebijakan privasi dan ketentuan tersendiri, dan AlternatePay tidak memiliki kendali atau tanggung jawab atas kebijakan pihak ketiga tersebut.
      </p>

      <div className="legal-footer">
        <h2>HUBUNGI KAMI</h2>
        <p>Apabila terdapat keluhan, kendala, atau pertanyaan sehubungan dengan Kebijakan Privasi ini, silakan hubungi:</p>
        <p className="contact">ALTERNATE PAY</p>
        <p>Website: <a href="https://qris.alternat.my.id" target="_blank" rel="noopener noreferrer">https://qris.alternat.my.id</a></p>
      </div>
    </LegalLayout>
  );
}
