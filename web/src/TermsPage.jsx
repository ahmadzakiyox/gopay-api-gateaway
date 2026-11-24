import React from 'react';
import { LegalLayout } from './LegalLayout';

export default function TermsPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="terms"
      title="Syarat dan Ketentuan"
      tagline="Ketentuan penggunaan layanan, hak & kewajiban pengguna, serta klausul pelepasan tanggung jawab."
      date="Terakhir diperbarui: 24 November 2026"
      user={user}
      onLogout={onLogout}
    >
      <h2>1. PENDAHULUAN</h2>
      <p>
        Selamat datang di AlternatePay ("Layanan"). Syarat dan Ketentuan ini ("Ketentuan") merupakan perjanjian yang mengikat secara hukum antara Anda sebagai pengguna ("Pengguna" atau "Anda") dan AlternatePay ("Kami").
      </p>
      <p>
        Dengan mengakses, mendaftar, atau menggunakan fitur-fitur pada AlternatePay, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum dalam dokumen ini. Jika Anda tidak menyetujui salah satu, sebagian, atau seluruh ketentuan ini, mohon untuk segera menghentikan penggunaan Layanan ini.
      </p>

      <h2>2. PENAFIAN AFILIASI & STATUS UNOFFICIAL</h2>
      <p>
        <strong>AlternatePay adalah proyek independen dan TIDAK berafiliasi, didukung, disponsori, atau bermitra secara resmi dengan PT GoTo Gojek Tokopedia Tbk, GoPay, GoBiz, maupun entitas grup GoTo lainnya.</strong>
      </p>
      <p>
        Layanan ini disediakan semata-mata sebagai utilitas otomasi teknis jembatan (bridge) untuk membantu pemilik usaha memonitor mutasi transaksi QRIS mereka sendiri melalui REST API. AlternatePay bukan perbankan, bukan lembaga keuangan, dan bukan Penyelenggara Jasa Pembayaran (PJP) berlisensi Bank Indonesia.
      </p>

      <h2>3. PELEPASAN TANGGUNG JAWAB & BATASAN RISIKO MUTLAK</h2>
      <p>
        Layanan ini disediakan dengan asas <strong>"SEBAGAIMANA ADANYA" (AS-IS)</strong> dan <strong>"SEBAGAIMANA TERSEDIA" (AS-AVAILABLE)</strong> tanpa jaminan atau garansi dalam bentuk apapun, baik tersurat maupun tersirat.
      </p>
      <div className="legal-callout-warning">
        <p><strong>RISIKO DITANGGUNG PENGGUNA SEPENUHNYA (AT YOUR OWN RISK):</strong></p>
        <ul>
          <li>
            Pengguna menyadari sepenuhnya bahwa integrasi otomasi terhadap sistem atau API pihak ketiga (GoBiz / GoPay) dapat bertentangan dengan Ketentuan Layanan pihak GoBiz dan berpotensi menimbulkan tindakan administratif dari pihak GoBiz, termasuk namun tidak terbatas pada penangguhan, pembatasan fitur, atau penutupan permanen akun merchant Anda.
          </li>
          <li>
            AlternatePay, pengembang, pengelola, maupun kontributornya <strong>TIDAK BERTANGGUNG JAWAB</strong> atas segala bentuk kerugian finansial, hilangnya potensi pendapatan, pembekuan dana di GoBiz, sanksi akun, maupun kerugian langsung atau tidak langsung lainnya yang timbul akibat penggunaan Layanan ini.
          </li>
        </ul>
      </div>

      <h2>4. KETENTUAN PENGGUNAAN LAYANAN</h2>
      <p>Pengguna diwajibkan untuk mematuhi ketentuan operasional berikut:</p>
      <ul>
        <li><strong>Kepemilikan Sah:</strong> Anda hanya diperbolehkan menghubungkan akun GoPay Merchant dan string QRIS yang secara sah merupakan hak milik usaha Anda sendiri.</li>
        <li><strong>Aktivitas Terlarang:</strong> Dilarang keras menggunakan AlternatePay untuk memproses transaksi yang berkaitan dengan judi online (perjudian), penipuan (scam / fraud), pencucian uang, pendanaan terorisme, perdagangan narkotika, pornografi, penjualan barang selundupan atau barang curian, maupun aktivitas lain yang melanggar hukum di wilayah hukum Negara Kesatuan Republik Indonesia.</li>
        <li><strong>Keamanan Kredensial:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan API Key Anda dan tidak membagikannya kepada pihak yang tidak berhak.</li>
      </ul>

      <h2>5. PERUBAHAN DAN PENGHENTIAN LAYANAN</h2>
      <p>
        Pengembang berhak untuk sewaktu-waktu mengubah, menangguhkan, atau menghentikan sebagian maupun seluruh fitur Layanan AlternatePay tanpa pemberitahuan sebelumnya, terutama apabila terjadi perubahan sistem, kebijakan, atau penutupan akses dari sistem upstream GoBiz/GoPay, ataupun alasan pemeliharaan server.
      </p>
      <p>
        Syarat & Ketentuan ini dapat diperbarui sewaktu-waktu. Penggunaan berkelanjutan atas Layanan setelah perubahan diumumkan merupakan bentuk persetujuan Anda terhadap versi terbaru dari Syarat & Ketentuan ini.
      </p>

      <h2>6. HUKUM YANG BERLAKU</h2>
      <p>
        Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Negara Kesatuan Republik Indonesia.
      </p>

      <div className="legal-footer">
        <h2>HUBUNGI KAMI</h2>
        <p>Apabila terdapat pertanyaan mengenai Syarat dan Ketentuan ini, silakan hubungi:</p>
        <p className="contact">ALTERNATE PAY</p>
        <p>Website: <a href="https://qris.alternat.my.id" target="_blank" rel="noopener noreferrer">https://qris.alternat.my.id</a></p>
      </div>
    </LegalLayout>
  );
}
