import React from 'react';
import { FileText, AlertOctagon, Scale, ShieldX, CheckCircle, HelpCircle } from 'lucide-react';
import { LegalLayout } from './LegalLayout';

export default function TermsPage({ user, onLogout }) {
  return (
    <LegalLayout
      activeTab="terms"
      title="Syarat & Ketentuan"
      subtitle="Ketentuan penggunaan layanan, hak & kewajiban pengguna, serta klausul pelepasan tanggung jawab."
      user={user}
      onLogout={onLogout}
    >
      <section className="legal-section">
        <h2>
          <Scale size={18} />
          1. Penerimaan Ketentuan
        </h2>
        <p>
          Dengan mendaftar, mengakses, atau menggunakan layanan AlternatePay ("Layanan"), Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat secara hukum oleh Syarat & Ketentuan ini. Jika Anda tidak menyetujui salah satu poin dalam ketentuan ini, Anda dilarang keras untuk menggunakan Layanan ini.
        </p>
      </section>

      <section className="legal-section">
        <h2>
          <AlertOctagon size={18} />
          2. Penafian Afiliasi & Status Unofficial
        </h2>
        <p>
          <strong>AlternatePay adalah proyek independen dan TIDAK berafiliasi, didukung, disertifikasi, atau bermitra resmi dengan PT GoTo Gojek Tokopedia Tbk, GoPay, GoBiz, maupun entitas grup GoTo lainnya.</strong>
        </p>
        <p>
          Layanan ini disediakan semata-mata sebagai utilitas otomasi teknis jembatan (bridge) untuk membantu pemilik merchant memonitor mutasi transaksi QRIS mereka sendiri melalui REST API. AlternatePay bukan perbankan, bukan lembaga keuangan, dan bukan Penyelenggara Jasa Pembayaran (PJP) berlisensi Bank Indonesia.
        </p>
      </section>

      <section className="legal-section">
        <h2>
          <ShieldX size={18} />
          3. Pelepasan Tanggung Jawab & Batasan Risiko Mutlak
        </h2>
        <p>
          Layanan ini disediakan dengan asas <strong>"SEBAGAIMANA ADANYA" (AS-IS)</strong> dan <strong>"SEBAGAIMANA TERSEDIA" (AS-AVAILABLE)</strong> tanpa jaminan atau garansi dalam bentuk apapun, baik tersurat maupun tersirat.
        </p>
        <div className="legal-callout-danger">
          <p>
            <strong>RISIKO DITANGGUNG PENGGUNA SEPENUHNYA (AT YOUR OWN RISK):</strong>
          </p>
          <ul>
            <li>
              Pengguna menyadari sepenuhnya bahwa integrasi otomasi terhadap sistem atau API pihak ketiga (GoBiz / GoPay) dapat bertentangan dengan Ketentuan Layanan pihak GoBiz dan berpotensi menimbulkan tindakan administratif dari pihak GoBiz, termasuk namun tidak terbatas pada penangguhan, pemblokiran fitur, atau penutupan permanen akun merchant Anda.
            </li>
            <li>
              AlternatePay, pengembang, pengelola, maupun kontributornya <strong>TIDAK BERTANGGUNG JAWAB</strong> atas segala bentuk kerugian finansial, hilangnya potensi pendapatan, pembekuan dana di GoBiz, sanksi akun, maupun kerugian langsung atau tidak langsung lainnya yang timbul akibat penggunaan Layanan ini.
            </li>
          </ul>
        </div>
      </section>

      <section className="legal-section">
        <h2>
          <CheckCircle size={18} />
          4. Kewajiban & Larangan Penggunaan
        </h2>
        <p>Pengguna diwajibkan untuk mematuhi ketentuan berikut:</p>
        <ul>
          <li>
            <strong>Kepemilikan Sah:</strong> Anda hanya diperbolehkan menghubungkan akun GoPay Merchant dan string QRIS yang secara sah merupakan hak milik usaha Anda sendiri.
          </li>
          <li>
            <strong>Aktivitas Terlarang:</strong> Dilarang keras menggunakan AlternatePay untuk memproses transaksi yang berkaitan dengan judi online (perjudian), penipuan (scam / fraud), pencucian uang, pendanaan terorisme, perdagangan narkotika, pornografi, penjualan barang selundupan atau barang curian, maupun aktivitas lain yang melanggar hukum di wilayah hukum Negara Kesatuan Republik Indonesia.
          </li>
          <li>
            <strong>Keamanan Kredensial:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan API Key Anda dan tidak membagikannya kepada pihak yang tidak berhak.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>
          <HelpCircle size={18} />
          5. Perubahan & Penghentian Layanan
        </h2>
        <p>
          Pengembang berhak untuk sewaktu-waktu mengubah, menangguhkan, atau menghentikan sebagian maupun seluruh fitur Layanan AlternatePay tanpa pemberitahuan sebelumnya, terutama apabila terjadi perubahan sistem, kebijakan, atau penutupan akses dari sistem upstream GoBiz/GoPay, ataupun alasan pemeliharaan server.
        </p>
        <p>
          Syarat & Ketentuan ini dapat diperbarui sewaktu-waktu. Penggunaan berkelanjutan atas Layanan setelah perubahan diumumkan merupakan bentuk persetujuan Anda terhadap versi terbaru dari Syarat & Ketentuan ini.
        </p>
      </section>
    </LegalLayout>
  );
}
