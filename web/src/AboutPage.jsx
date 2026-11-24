import React from 'react';
import { Layers, ShieldCheck, Zap, HelpCircle, FileCheck2, AlertCircle } from 'lucide-react';
import { LegalLayout } from './LegalLayout';

export default function AboutPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="about"
      title="Tentang Kami"
      subtitle="Mengenal lebih dekat platform otomasi AlternatePay, prinsip layanan, dan batasan tanggung jawab."
      user={user}
      onLogout={onLogout}
    >
      <section className="legal-section">
        <h2>
          <Layers size={18} />
          1. Profil Singkat AlternatePay
        </h2>
        <p>
          AlternatePay adalah perangkat lunak jembatan otomasi (bridge & automation toolkit) mandiri yang dirancang untuk membantu para developer web, pengusaha rintisan, dan pemilik UMKM di Indonesia dalam menghubungkan serta memonitor transaksi pembayaran QRIS GoPay Merchant / GoBiz secara terprogram melalui REST API.
        </p>
        <p>
          Platform ini lahir untuk memecahkan kendala integrasi pembayaran instan tanpa mengharuskan pengguna melewati birokrasi pendaftaran yang berbelit atau biaya berlangganan gateway korporat yang mahal.
        </p>
      </section>

      <section className="legal-section">
        <h2>
          <Zap size={18} />
          2. Cara Kerja Sistem
        </h2>
        <p>
          AlternatePay bekerja murni sebagai pembantu operasional (utility layer):
        </p>
        <ul>
          <li>
            <strong>Koneksi Mandiri:</strong> Pengguna menghubungkan akun GoPay Merchant miliknya sendiri melalui protokol verifikasi OTP resmi dari GoBiz.
          </li>
          <li>
            <strong>Konfigurasi QRIS Statis:</strong> Pengguna mengunggah gambar atau string QRIS statis outlet resmi yang diterbitkan oleh GoBiz untuk gerai miliknya.
          </li>
          <li>
            <strong>QRIS Dinamis & Penanda Unik (Surcharge):</strong> Sistem mengonversi string statis menjadi QRIS dinamis bernominal dengan menambahkan kode penanda acak unik (Rp 1 – Rp 99) per pengguna. Hal ini memungkinkan mutasi yang masuk diidentifikasi secara otomatis ke pesanan yang sesuai.
          </li>
          <li>
            <strong>REST API & Sandbox:</strong> Pengguna dapat membuat transaksi, mengecek status kelunasan, atau membatalkan transaksi dari aplikasi mereka sendiri melalui REST API.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <ShieldCheck size={18} />
          3. Status Unofficial & Bukan Lembaga Finansial
        </h2>
        <p>
          Perlu ditegaskan secara transparan bahwa:
        </p>
        <ul>
          <li>
            AlternatePay <strong>BUKAN</strong> Penyelenggara Jasa Pembayaran (PJP) berlisensi Bank Indonesia.
          </li>
          <li>
            AlternatePay <strong>TIDAK</strong> pernah menampung, menyimpan, memotong, atau menguasai dana transaksi pelanggan.
          </li>
          <li>
            Seluruh pembayaran pelanggan masuk 100% secara langsung ke saldo GoPay Merchant (GoBiz) milik pengguna sendiri.
          </li>
          <li>
            AlternatePay merupakan proyek independen (unofficial) dan tidak memiliki keterikatan, kerja sama resmi, maupun sokongan dari PT GoTo Gojek Tokopedia Tbk.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <AlertCircle size={18} />
          4. Batasan Tanggung Jawab & Risiko Pengguna
        </h2>
        <p>
          Layanan ini disediakan "sebagaimana adanya" (<em>as-is</em>). Pengembang AlternatePay tidak menjamin ketersediaan tanpa gangguan atau kesesuaian operasional di masa mendatang, terutama apabila pihak penyedia pihak ketiga (GoBiz/GoPay) melakukan perubahan kebijakan atau teknis pada API mereka.
        </p>
        <div className="legal-callout-danger">
          <strong>Peringatan Risiko:</strong> Seluruh risiko teknis, risiko pembatasan atau sanksi terhadap akun GoBiz pengguna, serta segala dampak finansial yang mungkin terjadi akibat penggunaan otomasi ini sepenuhnya ditanggung oleh pengguna sendiri. AlternatePay tidak bertanggung jawab atas kerugian dalam bentuk apapun.
        </div>
      </section>
    </LegalLayout>
  );
}
