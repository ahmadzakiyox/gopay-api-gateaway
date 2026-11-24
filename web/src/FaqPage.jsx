import React, { useState } from 'react';
import { LegalLayout } from './LegalLayout';

function FaqItem({ question, children }) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={`faq-item ${isActive ? 'active' : ''}`}>
      <button
        type="button"
        className="faq-question"
        onClick={() => setIsActive(!isActive)}
        aria-expanded={isActive}
      >
        <span>{question}</span>
      </button>
      <div className="faq-answer">
        {children}
      </div>
    </div>
  );
}

export default function FaqPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="faq"
      title="Tanya Jawab (FAQ)"
      tagline="Pertanyaan yang sering diajukan seputar operasional, integrasi API, keamanan, dan penggunaan AlternatePay."
      user={user}
      onLogout={onLogout}
    >
      <div className="faq-category">
        <h2 className="faq-category-title">Umum & Layanan</h2>

        <FaqItem question="Apa itu AlternatePay?">
          <p>
            AlternatePay adalah perangkat lunak jembatan otomasi (bridge automation) mandiri yang membantu pengembang web dan pemilik usaha menghubungkan akun GoPay Merchant (GoBiz) ke aplikasi web atau sistem kasir Anda melalui REST API tanpa perlu birokrasi pendaftaran payment gateway konvensional.
          </p>
        </FaqItem>

        <FaqItem question="Apakah AlternatePay berafiliasi dengan GoPay atau PT GoTo Gojek Tokopedia Tbk?">
          <p>
            <strong>Tidak.</strong> AlternatePay adalah proyek perangkat lunak independen (unofficial) dan TIDAK berafiliasi, didukung, disertifikasi, atau bermitra resmi dalam bentuk apapun dengan PT GoTo Gojek Tokopedia Tbk, GoPay, maupun GoBiz. Seluruh risiko operasional ditanggung sepenuhnya oleh pengguna.
          </p>
        </FaqItem>

        <FaqItem question="Apakah AlternatePay memotong biaya per transaksi?">
          <p>
            Tidak ada potongan biaya transaksi dari AlternatePay. Saldo pembayaran dari pelanggan Anda 100% masuk langsung ke saldo akun GoPay Merchant Anda di aplikasi GoBiz.
          </p>
        </FaqItem>

        <FaqItem question="Di mana dana transaksi pembeli disimpan?">
          <p>
            AlternatePay <strong>bukan lembaga keuangan dan bukan tempat penampungan dana</strong>. Seluruh dana yang dibayarkan oleh pembeli langsung masuk seketika ke rekening saldo GoBiz milik Anda sendiri, sebagaimana transaksi QRIS toko biasa.
          </p>
        </FaqItem>
      </div>

      <div className="faq-category">
        <h2 className="faq-category-title">Cara Kerja & Mutasi QRIS</h2>

        <FaqItem question="Bagaimana sistem mengetahui bahwa pembeli sudah membayar?">
          <p>
            Sistem mengonversi QRIS statis outlet Anda menjadi QRIS dinamis bernominal dengan menambahkan kode penanda unik (surcharge acak Rp 1 – Rp 99) per pengguna. Saat pelanggan membayar dengan nominal persis tersebut, sistem polling AlternatePay mendeteksi mutasi transaksi yang masuk di sistem GoBiz dan otomatis mengubah status pembayaran menjadi <strong>SUKSES</strong> (paid).
          </p>
        </FaqItem>

        <FaqItem question="Berapa lama batas waktu (expiry) setiap transaksi QRIS?">
          <p>
            Batas waktu pembayaran dikunci mutlak selama <strong>5 menit (300 detik)</strong> sejak QRIS dibuat. Jika pembeli tidak menyelesaikan pembayaran dalam batas waktu tersebut, pesanan otomatis berstatus <strong>EXPIRED</strong> dan slot penanda unik akan dibebaskan kembali.
          </p>
        </FaqItem>

        <FaqItem question="Berapa banyak transaksi pending yang bisa diproses secara bersamaan?">
          <p>
            Setiap akun pengguna memiliki alokasi 99 slot surcharge unik (Rp 1 – Rp 99). Artinya, Anda dapat memproses hingga 99 transaksi pending secara paralel tanpa khawatir terjadi bentrok nominal.
          </p>
        </FaqItem>

        <FaqItem question="Bisakah membatalkan transaksi yang sedang pending?">
          <p>
            Bisa. Anda dapat membatalkan transaksi melalui tombol <strong>Cancel</strong> di halaman sandbox Api Key, atau melalui endpoint REST API <code>POST /api/v1/payments/:trxId/cancel</code>. Transaksi yang dibatalkan akan langsung berstatus <strong>CANCELLED</strong> dan slot penanda unik langsung dilepas.
          </p>
        </FaqItem>
      </div>

      <div className="faq-category">
        <h2 className="faq-category-title">Keamanan & Privasi</h2>

        <FaqItem question="Apakah data sesi dan token GoPay saya aman?">
          <p>
            Sangat aman. Token sesi (access token dan refresh token) disimpan dalam database menggunakan <strong>enkripsi simetris standar industri AES-256-GCM</strong>. Data sesi tidak pernah disimpan dalam bentuk teks biasa (plaintext).
          </p>
          <p>
            Selain itu, API Key Anda disimpan menggunakan hashing satu arah (SHA-256) sehingga tidak dapat dibaca kembali oleh siapapun.
          </p>
        </FaqItem>

        <FaqItem question="Apakah AlternatePay meminta PIN GoPay saya?">
          <p>
            <strong>Tidak pernah.</strong> Kami tidak pernah meminta, mengakses, atau menyimpan PIN transaksi GoPay Anda. Proses penghubungan akun GoPay Merchant murni menggunakan kode OTP resmi yang dikirimkan oleh GoBiz.
          </p>
        </FaqItem>

        <FaqItem question="Bagaimana cara memutuskan akun GoPay dari sistem?">
          <p>
            Anda dapat membuka menu <strong>GoPay Management</strong> lalu mengklik tombol merah <strong>Logout GoPay</strong>. Setelah dikonfirmasi, seluruh access token, refresh token, data outlet, dan string QRIS statis Anda akan dihapus permanen dari basis data kami seketika itu juga.
          </p>
        </FaqItem>
      </div>

      <div className="faq-category">
        <h2 className="faq-category-title">Integrasi API & Pengembang</h2>

        <FaqItem question="Bagaimana cara memulai integrasi REST API?">
          <p>
            Cukup buka menu <strong>Api Key</strong> di navigasi, salin API Key Anda, lalu pelajari panduan lengkap dan contoh kode cURL di menu <strong>Doc</strong> (Dokumentasi API).
          </p>
        </FaqItem>

        <FaqItem question="Apakah tersedia sandbox untuk menguji transaksi sebelum live?">
          <p>
            Ya. Pada menu <strong>Api Key</strong>, kami menyediakan <strong>API Sandbox</strong> interaktif di mana Anda dapat langsung membuat QRIS uji coba, memantau timer countdown, memeriksa hasil polling status, dan menguji tombol pembatalan transaksi secara real-time.
          </p>
        </FaqItem>

        <FaqItem question="Apa parameter wajib saat membuat pembayaran via API?">
          <p>
            Anda hanya perlu mengirimkan dua parameter pada body JSON: <code>orderId</code> (ID unik pesanan dari sistem Anda) dan <code>amount</code> (nominal dasar pembayaran dalam Rupiah).
          </p>
        </FaqItem>
      </div>

      <div className="legal-footer">
        <h2>Punya Pertanyaan Lain?</h2>
        <p>Jika pertanyaan Anda belum terjawab di sini, silakan kunjungi menu dokumentasi atau hubungi pengembang:</p>
        <p className="contact">ALTERNATE PAY</p>
        <p>Dokumentasi API: <a href="/documents">https://qris.alternat.my.id/documents</a></p>
      </div>
    </LegalLayout>
  );
}
