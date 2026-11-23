import React, { useState } from 'react';
import { Ban, BookOpen, Check, Clipboard, Code2, FileText, KeyRound, Play, RefreshCw, ShieldCheck, Smartphone, Terminal } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const BASE_URL = 'https://api-qris.alternat.my.id';

const CREATE_REQ_JSON = `{
  "orderId": "INV-20261124-001",
  "amount": 10000
}`;

const CREATE_CURL = `curl -X POST "${BASE_URL}/api/v1/payments" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gpg_YOUR_API_KEY" \\
  -d '${JSON.stringify({ orderId: 'INV-20261124-001', amount: 10000 })}'`;

const CREATE_RES_JSON = `{
  "success": true,
  "payment": {
    "trxId": "019a4f20-8c1b-7000-8000-000000000001",
    "orderId": "INV-20261124-001",
    "status": "pending",
    "baseAmount": 10000,
    "surcharge": 35,
    "payableAmount": 10035,
    "qris": "00020101021226610014COM.GO-JEK.WWW...",
    "expiresIn": 300,
    "expiresAt": "2026-11-24T12:05:00.000Z",
    "paidAt": null
  }
}`;

const STATUS_CURL = `curl -X GET "${BASE_URL}/api/v1/payments/019a4f20-8c1b-7000-8000-000000000001" \\
  -H "x-api-key: gpg_YOUR_API_KEY"`;

const STATUS_RESPONSES = {
  pending: `{
  "success": true,
  "payment": {
    "trxId": "019a4f20-8c1b-7000-8000-000000000001",
    "orderId": "INV-20261124-001",
    "status": "pending",
    "baseAmount": 10000,
    "surcharge": 35,
    "payableAmount": 10035,
    "qris": "00020101021226610014COM.GO-JEK.WWW...",
    "expiresIn": 284,
    "expiresAt": "2026-11-24T12:05:00.000Z",
    "paidAt": null
  }
}`,
  paid: `{
  "success": true,
  "payment": {
    "trxId": "019a4f20-8c1b-7000-8000-000000000001",
    "orderId": "INV-20261124-001",
    "status": "paid",
    "baseAmount": 10000,
    "surcharge": 35,
    "payableAmount": 10035,
    "expiresIn": 0,
    "expiresAt": "2026-11-24T12:05:00.000Z",
    "paidAt": "2026-11-24T12:01:42.000Z",
    "providerTransaction": {
      "id": "GP-TRX-99887766",
      "orderId": "ORD-99887766",
      "paymentType": "qris",
      "issuer": "BCA",
      "transactionTime": "2026-11-24T12:01:42.000Z"
    }
  }
}`,
  cancelled: `{
  "success": true,
  "payment": {
    "trxId": "019a4f20-8c1b-7000-8000-000000000001",
    "orderId": "INV-20261124-001",
    "status": "cancelled",
    "baseAmount": 10000,
    "surcharge": 35,
    "payableAmount": 10035,
    "expiresIn": 0,
    "expiresAt": "2026-11-24T12:05:00.000Z",
    "paidAt": null
  }
}`,
  expired: `{
  "success": true,
  "payment": {
    "trxId": "019a4f20-8c1b-7000-8000-000000000001",
    "orderId": "INV-20261124-001",
    "status": "expired",
    "baseAmount": 10000,
    "surcharge": 35,
    "payableAmount": 10035,
    "expiresIn": 0,
    "expiresAt": "2026-11-24T12:05:00.000Z",
    "paidAt": null
  }
}`
};

const CANCEL_CURL = `curl -X POST "${BASE_URL}/api/v1/payments/019a4f20-8c1b-7000-8000-000000000001/cancel" \\
  -H "x-api-key: gpg_YOUR_API_KEY"`;

const CANCEL_RES_JSON = STATUS_RESPONSES.cancelled;

const ERROR_RES_JSON = `{
  "success": false,
  "error": "Transaksi sudah dibayar dan tidak dapat dibatalkan"
}`;

const NODE_EXAMPLE = `const API_BASE = "${BASE_URL}";
const API_KEY = process.env.ALTERNATE_PAY_API_KEY;

// 1. Buat tagihan QRIS (trxId & batas waktu 5 menit otomatis dari sistem)
async function createPayment(orderId, amount) {
  const res = await fetch(\`\${API_BASE}/api/v1/payments\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({ orderId, amount })
  });
  return res.json();
}

// 2. Cek status transaksi (stop polling jika status !== "pending")
async function checkPayment(trxId) {
  const res = await fetch(\`\${API_BASE}/api/v1/payments/\${trxId}\`, {
    headers: { "x-api-key": API_KEY }
  });
  return res.json();
}

// 3. Cancel transaksi pending (otomatis menghentikan polling)
async function cancelPayment(trxId) {
  const res = await fetch(\`\${API_BASE}/api/v1/payments/\${trxId}/cancel\`, {
    method: "POST",
    headers: { "x-api-key": API_KEY }
  });
  return res.json();
}`;

function CodeBlock({ id, title, code, copiedId, onCopy }) {
  return (
    <div className="gpy-code-section">
      <div className="gpy-code-head">
        <span><Code2 size={13} /> {title}</span>
        <button type="button" onClick={() => onCopy(id, code)}>
          {copiedId === id ? <><Check size={12} /> Tersalin</> : <><Clipboard size={12} /> Salin</>}
        </button>
      </div>
      <pre className="gpy-code-pre"><code>{code}</code></pre>
    </div>
  );
}

export default function DocumentsPage({ request, user }) {
  const [copiedId, setCopiedId] = useState('');
  const [statusTab, setStatusTab] = useState('paid');

  const copyText = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? '' : curr)), 1600);
    } catch {
      /* ignore */
    }
  };

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <div className="page-shell">
      <div className="app-shell studio-shell gpy-management-shell">
        <Header management onLogout={logout} user={user} />
        <main className="workspace reports-workspace studio-dashboard gpy-dashboard">

          <section className="gpy-panel" id="doc-setup">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">01 / SETUP GOPAY</p>
                <h3>Login Akun GoPay Merchant & QRIS</h3>
              </div>
              <Smartphone size={18} />
            </div>
            <ol className="gpy-doc-steps">
              <li>
                <strong>Hubungkan akun GoPay Merchant:</strong> Buka halaman <a href="/gpy-manager" className="gpy-doc-link">GoPay Management</a>, masukkan nomor HP yang terdaftar di aplikasi GoPay Merchant / GoBiz, lalu klik <strong>Kirim OTP</strong>.
              </li>
              <li>
                <strong>Verifikasi OTP:</strong> Masukkan kode OTP yang diterima di SMS/aplikasi GoPay Merchant. Setelah berhasil, informasi Outlet, Merchant ID, dan Nama Pemilik akan tampil dengan status <strong>Terhubung</strong>.
              </li>
              <li>
                <strong>Unggah QRIS Statis:</strong> Pada panel <strong>QRIS Configuration</strong> di halaman yang sama, unggah gambar QRIS statis milik merchant kamu. Sistem akan mendecode payload QRIS secara otomatis untuk dijadikan dasar QRIS dinamis.
              </li>
            </ol>
          </section>

          <section className="gpy-panel" id="doc-auth">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">02 / API KEY & AUTH</p>
                <h3>Generate API Key & Autentikasi</h3>
              </div>
              <KeyRound size={18} />
            </div>
            <ol className="gpy-doc-steps">
              <li>
                Buka halaman <a href="/apikey" className="gpy-doc-link">Api Key</a> dari menu kanan atas.
              </li>
              <li>
                Klik <strong>Buat API Key</strong> (jika belum ada) atau salin langsung menggunakan ikon salin. Jika key bocor, gunakan tombol <strong>Regenerate API Key</strong> untuk menghapus key lama dan menggantinya dengan key baru.
              </li>
              <li>
                Sertakan API Key di setiap request melalui header <code>x-api-key</code> atau <code>Authorization: Bearer &lt;API_KEY&gt;</code>.
              </li>
            </ol>

            <label className="gpy-label">Base URL API</label>
            <div className="gpy-key-box" style={{ marginTop: 6 }}>
              <code>{BASE_URL}</code>
              <div className="gpy-key-actions">
                <button
                  type="button"
                  className="gpy-key-icon-btn"
                  aria-label="Salin Base URL"
                  onClick={() => copyText('base-url', BASE_URL)}
                >
                  {copiedId === 'base-url' ? <Check size={15} /> : <Clipboard size={15} />}
                </button>
              </div>
            </div>
          </section>

          <section className="gpy-panel" id="doc-create">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">03 / CREATE PAYMENT</p>
                <h3>Buat Tagihan QRIS Dinamis</h3>
              </div>
              <Play size={18} />
            </div>

            <div className="gpy-doc-endpoint">
              <span className="gpy-doc-method is-post">POST</span>
              <code>/api/v1/payments</code>
            </div>

            <p className="gpy-doc-note">
              Waktu tunggu pembayaran <strong>5 menit</strong> (<code>expiresIn: 300</code>).
            </p>

            <div className="gpy-doc-param-list">
              <div className="gpy-doc-param">
                <code>orderId</code>
                <span className="gpy-doc-req">wajib</span>
                <p>ID pesanan/invoice unik dari backend kamu (string, maks 128 karakter).</p>
              </div>
              <div className="gpy-doc-param">
                <code>amount</code>
                <span className="gpy-doc-req">wajib</span>
                <p>Nominal dasar dalam Rupiah (integer &gt; 0). Sistem menambahkan penanda unik <code>surcharge</code> agar <code>payableAmount</code> unik.</p>
              </div>
            </div>

            <CodeBlock id="create-json" title="Request Body (JSON)" code={CREATE_REQ_JSON} copiedId={copiedId} onCopy={copyText} />
            <CodeBlock id="create-curl" title="Contoh Request (cURL)" code={CREATE_CURL} copiedId={copiedId} onCopy={copyText} />
            <CodeBlock id="create-res" title="Output JSON (201 Created)" code={CREATE_RES_JSON} copiedId={copiedId} onCopy={copyText} />
          </section>

          <section className="gpy-panel" id="doc-status">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">04 / CHECK STATUS</p>
                <h3>Cek Status Transaksi</h3>
              </div>
              <RefreshCw size={18} />
            </div>

            <div className="gpy-doc-endpoint">
              <span className="gpy-doc-method is-get">GET</span>
              <code>/api/v1/payments/:trxId</code>
            </div>

            <p className="gpy-doc-note">
              Lakukan polling setiap 3 – 5 detik selama status masih <code>pending</code>. Hentikan polling segera setelah status berubah menjadi <code>paid</code>, <code>cancelled</code>, atau <code>expired</code>.
            </p>

            <CodeBlock id="status-curl" title="Contoh Request (cURL)" code={STATUS_CURL} copiedId={copiedId} onCopy={copyText} />

            <div className="gpy-doc-tabs" role="tablist" aria-label="Contoh output status transaksi">
              {[
                { key: 'pending', label: 'PENDING' },
                { key: 'paid', label: 'PAID' },
                { key: 'cancelled', label: 'CANCELLED' },
                { key: 'expired', label: 'EXPIRED' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={statusTab === tab.key}
                  className={`gpy-doc-tab is-${tab.key} ${statusTab === tab.key ? 'is-active' : ''}`}
                  onClick={() => setStatusTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <CodeBlock
              id={`status-res-${statusTab}`}
              title={`Output JSON — ${statusTab.toUpperCase()}`}
              code={STATUS_RESPONSES[statusTab]}
              copiedId={copiedId}
              onCopy={copyText}
            />
          </section>

          <section className="gpy-panel" id="doc-cancel">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">05 / CANCEL PAYMENT</p>
                <h3>Batalkan Transaksi Pending</h3>
              </div>
              <Ban size={18} />
            </div>

            <div className="gpy-doc-endpoint">
              <span className="gpy-doc-method is-cancel">POST</span>
              <code>/api/v1/payments/:trxId/cancel</code>
            </div>

            <p className="gpy-doc-note">
              Membatalkan transaksi yang masih berstatus <code>pending</code>. Setelah dibatalkan, status berubah menjadi <code>cancelled</code>, slot penanda nominal unik langsung dilepas, dan polling otomatis dihentikan. Transaksi yang sudah <code>paid</code> atau <code>expired</code> akan mengembalikan HTTP <code>409</code>.
            </p>

            <CodeBlock id="cancel-curl" title="Contoh Request (cURL)" code={CANCEL_CURL} copiedId={copiedId} onCopy={copyText} />
            <CodeBlock id="cancel-res" title="Output JSON (200 OK)" code={CANCEL_RES_JSON} copiedId={copiedId} onCopy={copyText} />
          </section>

          <section className="gpy-panel" id="doc-errors">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">06 / ERROR & IMPLEMENTASI</p>
                <h3>Kode Error & Contoh Integrasi</h3>
              </div>
              <Terminal size={18} />
            </div>

            <div className="gpy-doc-param-list">
              <div className="gpy-doc-param">
                <code>400</code>
                <span className="gpy-doc-opt">Bad Request</span>
                <p>Parameter <code>orderId</code>, <code>amount</code>, atau format <code>trxId</code> tidak valid.</p>
              </div>
              <div className="gpy-doc-param">
                <code>401</code>
                <span className="gpy-doc-opt">Unauthorized</span>
                <p>Header <code>x-api-key</code> kosong, salah, atau sudah di-regenerate.</p>
              </div>
              <div className="gpy-doc-param">
                <code>404</code>
                <span className="gpy-doc-opt">Not Found</span>
                <p>Transaksi dengan <code>trxId</code> tersebut tidak ditemukan.</p>
              </div>
              <div className="gpy-doc-param">
                <code>409</code>
                <span className="gpy-doc-opt">Conflict</span>
                <p>Akun GoPay belum terhubung, QRIS statis belum disimpan, slot nominal unik penuh, atau transaksi sudah <code>paid</code> / <code>expired</code> saat dicancel.</p>
              </div>
              <div className="gpy-doc-param">
                <code>502</code>
                <span className="gpy-doc-opt">Bad Gateway</span>
                <p>Gagal berkomunikasi sementara dengan layanan GoPay.</p>
              </div>
            </div>

            <CodeBlock id="error-json" title="Format Output Error JSON" code={ERROR_RES_JSON} copiedId={copiedId} onCopy={copyText} />
            <CodeBlock id="node-example" title="Contoh Implementasi (Node.js / JavaScript)" code={NODE_EXAMPLE} copiedId={copiedId} onCopy={copyText} />
          </section>

        </main>
      </div>
      <Footer />
    </div>
  );
}
