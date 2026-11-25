import React from 'react';
import { Layers, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { LegalLayout } from './LegalLayout';

export default function AboutPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="about"
      title="Ciptakan ekosistem pembayaran mandiri yang fleksibel dan terotomasi."
      tagline="AlternatePay adalah perangkat lunak jembatan (bridge & automation) untuk mengintegrasikan QRIS GoPay Merchant dan ShopeePay Merchant secara mandiri ke sistem aplikasi Anda."
      user={user}
      onLogout={onLogout}
    >
      <h2>
        <Layers size={20} />
        Tentang AlternatePay
      </h2>
      <p>
        AlternatePay adalah platform utilitas perangkat lunak independen yang dirancang untuk memberdayakan pengembang web, perintis usaha, dan pelaku UMKM di Indonesia agar dapat mengotomasi penerimaan pembayaran QRIS dari akun GoPay Merchant (GoBiz) maupun ShopeePay Merchant (Shopee Partner) mereka sendiri tanpa kerumitan birokrasi pendaftaran payment gateway konvensional.
      </p>
      <p>
        Kami percaya bahwa setiap pemilik usaha berhak memiliki akses integrasi pembayaran digital yang cepat, transparan, dan sepenuhnya berada di bawah kendali pemilik usaha itu sendiri.
      </p>

      <div className="mission-vision">
        <div className="mission-box">
          <h3>Misi</h3>
          <p>
            Menyediakan teknologi integrasi otomasi mutasi QRIS yang sederhana, andal, dan siap pakai bagi pengembang dan pelaku bisnis digital di Indonesia.
          </p>
        </div>
        <div className="vision-box">
          <h3>Visi</h3>
          <p>
            Mendukung kemandirian teknologi pembayaran mikro dengan transparansi penuh, keamanan data tingkat tinggi, dan arsitektur yang efisien.
          </p>
        </div>
      </div>

      <h2>
        <Zap size={20} />
        Cara Kerja Sistem
      </h2>
      <p>
        AlternatePay beroperasi murni sebagai lapisan jembatan otomasi (bridge automation) antara aplikasi web Anda dan akun merchant milik Anda sendiri:
      </p>
      <ul>
        <li>
          <strong>Koneksi Mandiri:</strong> Pengguna menghubungkan akun GoPay Merchant (GoBiz) atau ShopeePay Merchant (Shopee Partner) miliknya sendiri melalui verifikasi akun dan OTP resmi masing-masing penyedia, serta dapat mengganti provider aktif kapan saja.
        </li>
        <li>
          <strong>Konfigurasi QRIS Statis:</strong> Pengguna mengunggah gambar atau string QRIS resmi yang diterbitkan oleh GoBiz maupun Shopee Partner untuk gerai miliknya.
        </li>
        <li>
          <strong>QRIS Dinamis & Penanda Unik (Surcharge):</strong> Sistem mengonversi string statis menjadi QRIS dinamis bernominal dengan menambahkan kode penanda acak unik (Rp 1 – Rp 99) per pengguna. Hal ini memungkinkan mutasi yang masuk diidentifikasi secara otomatis ke pesanan yang sesuai.
        </li>
        <li>
          <strong>REST API & Sandbox:</strong> Pengguna dapat membuat transaksi, mengecek status kelunasan, atau membatalkan transaksi dari aplikasi mereka sendiri melalui REST API.
        </li>
      </ul>

      <div className="values">
        <h3>Keunggulan Utama</h3>
        <div className="values-grid">
          <div className="value-item">
            <strong>Instan & Mandiri</strong>
            <span>Integrasi langsung menggunakan akun GoPay Merchant atau ShopeePay Merchant milik Anda sendiri tanpa perantara perbankan.</span>
          </div>
          <div className="value-item">
            <strong>Aman & Terenkripsi</strong>
            <span>Data sesi GoBiz dan Shopee Partner dienkripsi dengan AES-256-GCM serta API Key disimpan dalam bentuk hash SHA-256.</span>
          </div>
          <div className="value-item">
            <strong>Tanpa Potongan Saldo</strong>
            <span>100% dana dari pembeli langsung masuk ke saldo akun GoPay Merchant atau ShopeePay Merchant milik Anda sendiri.</span>
          </div>
          <div className="value-item">
            <strong>Developer Friendly</strong>
            <span>Dilengkapi REST API lengkap, dokumentasi interaktif, dan sandbox live test.</span>
          </div>
        </div>
      </div>

      <h2>
        <ShieldCheck size={20} />
        Status Unofficial & Bukan Lembaga Finansial
      </h2>
      <p>
        Perlu ditegaskan secara transparan kepada seluruh pengguna:
      </p>
      <ul>
        <li>
          AlternatePay <strong>BUKAN</strong> Penyelenggara Jasa Pembayaran (PJP) berlisensi Bank Indonesia dan bukan institusi perbankan.
        </li>
        <li>
          AlternatePay <strong>TIDAK</strong> pernah menampung, memotong, menahan, atau menguasai dana transaksi pelanggan.
        </li>
        <li>
          Seluruh pembayaran pelanggan masuk 100% secara langsung ke saldo GoPay Merchant (GoBiz) atau ShopeePay Merchant (Shopee Partner) milik pengguna sendiri.
        </li>
        <li>
          AlternatePay merupakan proyek independen (unofficial) dan tidak memiliki keterikatan, kerja sama resmi, maupun sokongan dari PT GoTo Gojek Tokopedia Tbk (GoPay/GoBiz) maupun PT Airpay International Indonesia (ShopeePay/Shopee Partner).
        </li>
      </ul>

      <h2>
        <AlertCircle size={20} />
        Batasan Tanggung Jawab & Risiko Pengguna
      </h2>
      <p>
        Layanan ini disediakan "sebagaimana adanya" (<em>as-is</em>). Pengembang AlternatePay tidak menjamin ketersediaan tanpa gangguan atau kesesuaian operasional di masa mendatang, terutama apabila pihak penyedia pihak ketiga (GoBiz/GoPay maupun Shopee Partner/ShopeePay) melakukan perubahan kebijakan atau teknis pada API mereka.
      </p>
      <div className="legal-callout-warning">
        <strong>Peringatan Risiko:</strong> Seluruh risiko teknis, risiko pembatasan atau sanksi terhadap akun GoBiz maupun Shopee Partner pengguna, serta segala dampak finansial yang mungkin terjadi akibat penggunaan otomasi ini sepenuhnya ditanggung oleh pengguna sendiri. AlternatePay tidak bertanggung jawab atas kerugian dalam bentuk apapun.
      </div>
    </LegalLayout>
  );
}
