import React from 'react';
import { Shield, Lock, Eye, Database, Trash2, KeyRound } from 'lucide-react';
import { LegalLayout } from './LegalLayout';

export default function PrivacyPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="privacy"
      title="Kebijakan Privasi"
      subtitle="Komitmen kami dalam mengamankan data akun, privasi pengguna, dan hak pengelolaan data Anda."
      user={user}
      onLogout={onLogout}
    >
      <section className="legal-section">
        <h2>
          <Shield size={18} />
          1. Prinsip Kerahasiaan
        </h2>
        <p>
          AlternatePay ("kami") berkomitmen untuk menjaga privasi data Anda. Kebijakan Privasi ini menjelaskan jenis data apa saja yang kami kumpulkan saat Anda menggunakan platform AlternatePay, bagaimana data tersebut dipergunakan, disimpan, serta hak-hak Anda untuk menghapusnya.
        </p>
      </section>

      <section className="legal-section">
        <h2>
          <Database size={18} />
          2. Data yang Dikumpulkan
        </h2>
        <p>Kami hanya mengumpulkan data yang mutlak diperlukan untuk mengoperasikan fungsi otomasi:</p>
        <ul>
          <li>
            <strong>Data Profil Telegram:</strong> Telegram ID, nama tampilan, username, dan foto profil yang diteruskan oleh sistem Telegram OAuth resmi untuk proses masuk (login) yang aman.
          </li>
          <li>
            <strong>Data Akun GoPay Merchant:</strong> Nomor telepon gerai, ID Merchant, nama outlet, dan nama pemilik gerai yang tercatat di GoBiz.
          </li>
          <li>
            <strong>Token Sesi GoBiz:</strong> Access token dan refresh token yang diperoleh setelah verifikasi OTP, diperlukan untuk mengecek mutasi transaksi QRIS gerai Anda secara berkala.
          </li>
          <li>
            <strong>Konfigurasi QRIS:</strong> Payload string QRIS statis outlet resmi Anda untuk membuat QRIS dinamis.
          </li>
          <li>
            <strong>Log & Riwayat Transaksi:</strong> ID pesanan internal, nominal transaksi, penanda unik (surcharge), status pembayaran (sukses, kedaluwarsa, dibatalkan), dan waktu transaksi.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <Lock size={18} />
          3. Pengamanan & Enkripsi Data
        </h2>
        <p>
          Keamanan data Anda adalah prioritas kami:
        </p>
        <ul>
          <li>
            Seluruh token sesi GoBiz (access token dan refresh token) disimpan dalam database menggunakan <strong>enkripsi simetris standar industri AES-256-GCM</strong>. Data sesi tidak pernah disimpan dalam format teks polos (plaintext).
          </li>
          <li>
            API Key yang dibuat hanya disimpan dalam bentuk <strong>kriptografi hash satu arah (SHA-256)</strong> di server kami, sehingga tidak dapat didekripsi kembali oleh pihak manapun.
          </li>
          <li>
            Kami tidak pernah meminta, mengakses, atau menyimpan PIN transaksi GoPay Anda.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <Eye size={18} />
          4. Penggunaan & Pembagian Data
        </h2>
        <p>
          Data yang dikumpulkan hanya digunakan untuk kepentingan verifikasi mutasi, penampilan grafik analitik, dan penyediaan notifikasi API. <strong>Kami tidak pernah memperjualbelikan, menyewakan, atau membagikan data akun maupun transaksi Anda kepada pihak ketiga manapun untuk tujuan komersial atau periklanan.</strong>
        </p>
      </section>

      <section className="legal-section">
        <h2>
          <Trash2 size={18} />
          5. Hak Pengguna & Penghapusan Data (Data Purge)
        </h2>
        <p>
          Anda memegang kendali penuh atas data Anda di AlternatePay:
        </p>
        <ul>
          <li>
            Melalui tombol <strong>Logout GoPay</strong> di menu GoPay Management, Anda dapat kapan saja memutuskan koneksi. Tindakan ini seketika menghapus token sesi GoBiz, access token, refresh token, dan konfigurasi QRIS statis Anda dari basis data kami secara permanen.
          </li>
          <li>
            Anda juga dapat melakukan logout dari sesi akun Telegram Anda kapan saja melalui tombol Logout pada menu navigasi.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <KeyRound size={18} />
          6. Hubungan dengan Pihak Ketiga & Pelepasan Tanggung Jawab
        </h2>
        <p>
          AlternatePay tidak bertanggung jawab atas pengumpulan data atau kebijakan privasi yang diterapkan oleh entitas pihak ketiga seperti Telegram Messenger Inc. maupun PT GoTo Gojek Tokopedia Tbk. Segala interaksi Anda dengan pihak ketiga tersebut diatur oleh kebijakan masing-masing penyedia layanan.
        </p>
      </section>
    </LegalLayout>
  );
}
