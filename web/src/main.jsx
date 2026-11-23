import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Check, Clipboard, Code2, Hash, ImagePlus, KeyRound, Link2, Loader2, LogOut, Play, QrCode, RefreshCw, ShieldCheck, Smartphone, Store, Terminal, Trash2, User, WalletCards, X } from 'lucide-react';
import jsQR from 'jsqr';
import './style.css';
import './studio-dashboard.css';
import './gpy-management.css';
import StudioTransactionDashboard from './StudioTransactionDashboard';
import { Header } from './components/Header';
import { LoginHeader } from './components/LoginHeader';
import { Footer } from './components/Footer';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3100';
async function request(path, options = {}) { const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Request gagal'); return data; }

function Login() { const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const login = async () => { setLoading(true); setError(''); try { const data = await request('/api/auth/telegram/start'); window.location.href = data.url; } catch (e) { setError(e.message); setLoading(false); } }; return <div className="page-shell"><LoginHeader /><main className="login-shell"><div className="login-mark"><span>AP</span><span>ALTERNATE PAY</span></div><div className="login-copy"><p className="eyebrow">PAYMENT GATEWAY</p><h1>Payment operations,<br /><em>without the busywork.</em></h1><p className="lede">Kelola koneksi GoPay, QRIS dinamis, dan API integrasi dari satu workspace yang jelas.</p><button className="primary" onClick={login} disabled={loading}>{loading ? 'Membuka Telegram…' : 'Login dengan Telegram'} <Link2 size={17} /></button>{error && <p className="error" role="alert">{error}</p>}<p className="legal">Dengan melanjutkan, kamu menyetujui penggunaan layanan sesuai ketentuan yang berlaku.</p></div></main><Footer /></div> ; }

function Row({ icon: Icon, label, value, status, valueClass }) {
  return (
    <div className="gpy-status-row">
      <div className="gpy-status-left">
        <Icon size={15} />
        <span>{label}</span>
      </div>
      <div className="gpy-status-val">
        <strong className={valueClass || ''}>{value}</strong>
        {status && (
          <span className={`gpy-pill ${status === 'connected' ? 'connected' : ''}`}>
            {status === 'connected' ? 'Connected' : status}
          </span>
        )}
      </div>
    </div>
  );
}
function SimulateCard({ onDone }) {
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [copied, setCopied] = useState(false);
  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setPollError(''); setPayment(null); setSecondsLeft(0);
    try {
      const result = await request('/api/v1/payments', { method: 'POST', body: JSON.stringify({ orderId: `sim-${Date.now()}`, amount: Number(amount) }) });
      setPayment(result.payment);
      setSecondsLeft(300);
      if (onDone) onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!payment || payment.status !== 'pending' || secondsLeft <= 0) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const result = await request(`/api/payments/${payment.trxId}`);
        if (!active) return;
        setPollError('');
        setPayment(result.payment);
      } catch {
        if (active) setPollError('Status pembayaran belum bisa diperiksa. Mencoba lagi otomatis…');
      }
    };
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 5));
      poll();
    }, 5000);
    return () => { active = false; clearInterval(tick); };
  }, [payment && payment.trxId, payment && payment.status, secondsLeft > 0]);
  const statusLabel = !payment ? '' : payment.status === 'paid' ? 'Lunas' : payment.status === 'expired' ? 'Kedaluwarsa' : 'Menunggu';
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const progress = Math.max(0, Math.min(100, (secondsLeft / 300) * 100));
  const quickAmounts = [10000, 25000, 50000, 100000];
  const copyPayload = async () => {
    try { await navigator.clipboard.writeText(payment.qris); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  return (
    <section className="gpy-panel" id="simulate">
      <div className="gpy-panel-head">
        <div>
          <p className="gpy-section-label">03 / SIMULATION</p>
          <h3>Simulasi transaksi</h3>
        </div>
        <QrCode size={18} />
      </div>
      <p className="gpy-desc">Buat QRIS dinamis dari nominal ini, lalu bayar lewat aplikasi GoPay. Status dicek otomatis selama 5 menit.</p>
      {!payment && (
        <form onSubmit={create} className="gpy-form">
          <label className="gpy-label" htmlFor="sim-amount">Nominal</label>
          <div className="gpy-amount-field">
            <span>Rp</span>
            <input id="sim-amount" value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" autoComplete="off" />
          </div>
          <div className="gpy-chips">
            {quickAmounts.map((value) => (
              <button type="button" key={value} className={`gpy-chip ${Number(amount) === value ? 'is-active' : ''}`} onClick={() => setAmount(String(value))}>
                {value >= 1000 ? `${value / 1000}rb` : value}
              </button>
            ))}
          </div>
          <div className="gpy-actions-row">
            <button className="gpy-btn gpy-btn-primary gpy-btn-block" disabled={busy || !Number(amount)}>
              {busy ? <><Loader2 size={15} className="gpy-spin" /> Membuat QRIS…</> : <>Buat QRIS <QrCode size={15} /></>}
            </button>
          </div>
        </form>
      )}
      {payment && (
        <div className="gpy-sim-result">
          <div className="gpy-sim-head">
            <div className="gpy-sim-head-main">
              <span className="gpy-sim-amount">Rp{payment.payableAmount.toLocaleString('id-ID')}</span>
              <small>Nominal dasar Rp{payment.baseAmount.toLocaleString('id-ID')} + penanda {payment.surcharge}</small>
            </div>
            <span className={`gpy-pill ${payment.status === 'paid' ? 'connected' : ''}`}>{statusLabel}</span>
          </div>
          {payment.status === 'pending' && (
            <div className="gpy-sim-timer">
              <div className="gpy-sim-timer-label">
                <span>Berlaku sampai</span>
                <b>{countdown}</b>
              </div>
              <div className="gpy-sim-progress"><span style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          {payment.status === 'paid' ? (
            <div className="gpy-payment-success" role="status" aria-live="polite">
              <Check size={26} />
              <div>
                <strong>Pembayaran berhasil</strong>
                <span>Pembayaran GoPay sudah terkonfirmasi.</span>
              </div>
            </div>
          ) : payment.status === 'pending' ? (
            <div className="gpy-sim-qr-box">
              <div className="gpy-sim-qr-frame">
                <img className="gpy-sim-qr" alt="QRIS dinamis" src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(payment.qris)}`} />
              </div>
              <p className="gpy-sim-hint">Pindai kode ini lewat aplikasi GoPay atau m-banking.</p>
              <div className="gpy-sim-payload">
                <code>{payment.qris}</code>
                <button type="button" onClick={copyPayload} aria-label="Salin payload QRIS">
                  {copied ? <Check size={14} /> : <Clipboard size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="gpy-sim-empty">
              <X size={22} />
              <p>Waktu pembayaran habis. Buat transaksi baru untuk mencoba lagi.</p>
            </div>
          )}
          {pollError && payment.status === 'pending' && <p className="gpy-warning-text" role="status">{pollError}</p>}
          <button className="gpy-btn gpy-btn-secondary gpy-btn-block" onClick={() => { setPayment(null); setAmount(''); setSecondsLeft(0); setPollError(''); }}>
            <RefreshCw size={14} /> Buat transaksi baru
          </button>
        </div>
      )}
      {error && <p className="gpy-warning-text">{error}</p>}
    </section>
  );
}

function decodeWithScale(img, scale, smoothing) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = smoothing;
  if (smoothing) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
}

function readQrisFromImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const longest = Math.max(img.naturalWidth, img.naturalHeight);
        const attempts = [];
        // Pass 1: cap large photos (downscale smooths sensor noise).
        if (longest > 1400) attempts.push([1400 / longest, true]);
        // Pass 2: native resolution.
        attempts.push([1, true]);
        // Pass 3: upscale small/screenshot QR codes with crisp edges.
        if (longest < 700) attempts.push([Math.min(3, 900 / longest), false]);
        // Pass 4: aggressive downscale for very large images.
        if (longest > 2400) attempts.push([900 / longest, true]);

        let decoded = null;
        for (const [scale, smoothing] of attempts) {
          decoded = decodeWithScale(img, scale, smoothing);
          if (decoded && decoded.data) break;
        }
        URL.revokeObjectURL(url);
        if (!decoded || !decoded.data) {
          return reject(new Error('QR code tidak terdeteksi. Pastikan seluruh kode terlihat jelas dan tidak terpotong.'));
        }
        resolve(decoded.data);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(new Error('Gambar tidak bisa dibaca. Coba foto lain.'));
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File gambar tidak valid.')); };
    img.src = url;
  });
}

function QrisCard({ configured, onSaved }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [payload, setPayload] = useState('');
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('Format harus berupa gambar (JPG atau PNG).'); return; }
    setError(''); setNotice(''); setPayload('');
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setReading(true);
    try {
      const decoded = await readQrisFromImage(selected);
      setPayload(decoded);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(''); setPayload(''); setError(''); setNotice('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = async () => {
    if (!payload) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request('/api/qris', { method: 'PUT', body: JSON.stringify({ staticQris: payload }) });
      setNotice('QRIS berhasil disimpan.');
      reset();
      if (onSaved) await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gpy-panel" id="qris">
      <div className="gpy-panel-head">
        <div>
          <p className="gpy-section-label">02 / QRIS CONFIGURATION</p>
          <h3>QRIS statis</h3>
        </div>
        <QrCode size={18} />
      </div>
      <p className="gpy-desc">Unggah foto QRIS merchant kamu. String QRIS akan dibaca otomatis dari gambar saat kamu konfirmasi.</p>

      {configured && !file && (
        <div className="gpy-saved-note">
          <ShieldCheck size={15} />
          <div>
            <strong>QRIS statis sudah tersimpan</strong>
            <small>Unggah foto baru untuk menggantinya.</small>
          </div>
        </div>
      )}

      {!file && (
        <div
          className={`gpy-drop ${dragging ? 'is-dragging' : ''}`}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current && inputRef.current.click(); } }}
        >
          <span className="gpy-drop-icon"><ImagePlus size={20} /></span>
          <b>Pilih foto QRIS</b>
          <small>JPG atau PNG, seluruh kode QR terlihat utuh</small>
        </div>
      )}
      <input ref={inputRef} className="gpy-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFile(e.target.files && e.target.files[0])} />

      {file && (
        <div className="gpy-qris-preview">
          <div className="gpy-qris-media">
            <img src={preview} alt="Pratinjau QRIS" />
            <button type="button" className="gpy-qris-remove" onClick={reset} aria-label="Hapus foto">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="gpy-qris-meta">
            <p className="gpy-qris-file">{file.name}</p>
            {reading && (
              <span className="gpy-qris-state is-reading"><Loader2 size={13} className="gpy-spin" /> Membaca QRIS dari gambar…</span>
            )}
            {!reading && payload && (
              <span className="gpy-qris-state is-ok"><Check size={13} /> QRIS berhasil dibaca</span>
            )}
            {!reading && !payload && error && (
              <span className="gpy-qris-state is-error"><X size={13} /> QRIS tidak terbaca</span>
            )}
            {payload && <code className="gpy-qris-payload">{payload}</code>}
          </div>
        </div>
      )}

      {file && (
        <div className="gpy-actions-row">
          <button className="gpy-btn gpy-btn-primary gpy-btn-block" onClick={save} disabled={busy || reading || !payload}>
            {busy ? <><Loader2 size={14} className="gpy-spin" /> Menyimpan…</> : <>Konfirmasi &amp; Simpan <Check size={14} /></>}
          </button>
        </div>
      )}
      {error && <p className="gpy-warning-text" role="alert">{error}</p>}
      {notice && <p className="gpy-notice-inline" role="status"><Check size={13} /> {notice}</p>}
    </section>
  );
}
function GoPayManagement() {
  const [data, setData] = useState(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await request('/api/dashboard');
      setData(result);
      setPhone(result.gopay.phone_number || '');
    } catch (e) {
      if (e.message.includes('Login')) window.location.href = '/';
      else setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const startGoPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/gopay/connect/start', { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) });
      setOtpSent(true);
      setNotice(`OTP dikirim. Berlaku ${Math.floor(result.expiresIn / 60)} menit.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyGoPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/gopay/connect/verify', { method: 'POST', body: JSON.stringify({ otp }) });
      setOtp('');
      setOtpSent(false);
      setNotice('GoPay berhasil terhubung.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (!data) return <div className="loading">Memuat workspace…</div>;

  return (
    <div className="page-shell">
      <div className="app-shell studio-shell gpy-management-shell">
        <Header management onLogout={logout} user={data.user} />
        <main className="workspace reports-workspace studio-dashboard gpy-dashboard">
          {notice && <div className="gpy-notice"><Check size={15} /> {notice}</div>}
          {error && <div className="gpy-error">{error}</div>}

          <section className="gpy-panel" id="connection">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">01 / CONNECTION</p>
                <h3>{data.gopay.merchant_name || 'GoPay Merchant'}</h3>
              </div>
              <Smartphone size={18} />
            </div>
            {data.gopay.merchant_name && (
              <Row icon={Store} label="Outlet" value={data.gopay.merchant_name} />
            )}
            {data.gopay.owner_name && (
              <Row icon={User} label="Owner" value={data.gopay.owner_name} />
            )}
            {data.gopay.merchant_id && (
              <Row icon={Hash} label="Merchant ID" value={data.gopay.merchant_id} />
            )}
            <Row icon={Smartphone} label="Phone number" value={phone || 'Belum diatur'} />
            <Row
              icon={ShieldCheck}
              label="Session"
              value={data.gopay.status === 'connected' ? 'Active' : 'Belum terhubung'}
              valueClass={data.gopay.status === 'connected' ? 'gpy-status-active' : ''}
            />
            {data.gopay.status !== 'connected' && !otpSent && (
              <form onSubmit={startGoPay} className="gpy-form">
                <label className="gpy-label" htmlFor="phone">Nomor GoPay/GoBiz</label>
                <input className="gpy-input" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
                <button className="gpy-btn gpy-btn-secondary gpy-btn-full" disabled={busy || !phone.trim()}>
                  <RefreshCw size={14} /> {busy ? 'Mengirim OTP…' : 'Kirim OTP'}
                </button>
              </form>
            )}
            {data.gopay.status !== 'connected' && otpSent && (
              <form onSubmit={verifyGoPay} className="gpy-form">
                <label className="gpy-label" htmlFor="otp">Kode OTP</label>
                <input className="gpy-input" id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Masukkan kode OTP" inputMode="numeric" autoComplete="one-time-code" />
                <button className="gpy-btn gpy-btn-primary gpy-btn-full" disabled={busy}>
                  <Check size={14} /> {busy ? 'Memverifikasi…' : 'Verifikasi OTP'}
                </button>
              </form>
            )}
            {data.gopay.status === 'connected' && (
              <button className="gpy-btn gpy-btn-secondary gpy-btn-full" onClick={() => { setOtpSent(false); setNotice('Masukkan nomor baru untuk reconnect.'); }}>
                <RefreshCw size={14} /> Reconnect GoPay
              </button>
            )}
          </section>

          <QrisCard configured={Boolean(data.qris.configured)} onSaved={load} />

          <SimulateCard onDone={load} />
        </main>
      </div>
      <Footer />
    </div>
  );
}

function ApiKeySandboxCard({ apiKey, apiKeyPrefix, onRequireKey }) {
  const endpointUrl = `${API}/api/v1/payments`;
  const [amount, setAmount] = useState('1000');
  const [orderId, setOrderId] = useState(() => `api-test-${Date.now()}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [responseJson, setResponseJson] = useState(null);
  const [payment, setPayment] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [logs, setLogs] = useState([]);
  const [copiedBlock, setCopiedBlock] = useState('');
  const lastLoggedStatusRef = useRef('');

  const addLog = (status, message) => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, status, message }]);
  };

  const copyBlock = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlock(key);
      setTimeout(() => setCopiedBlock((curr) => (curr === key ? '' : curr)), 1600);
    } catch {
      /* ignore */
    }
  };

  const displayKey = apiKey || (apiKeyPrefix ? `${apiKeyPrefix}••••••••••••` : 'gpg_YOUR_API_KEY');
  const numericAmount = Number(amount) || 1000;
  const sampleRequestPayload = {
    orderId: orderId || 'api-test-1',
    amount: numericAmount,
    expiresIn: 300
  };

  const curlSample = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: *** \\
  -d '${JSON.stringify(sampleRequestPayload)}'`;

  const sampleOutputFallback = {
    success: true,
    payment: {
      trxId: '019a0000-0000-7000-8000-000000000000',
      orderId: sampleRequestPayload.orderId,
      status: 'pending',
      baseAmount: numericAmount,
      surcharge: 35,
      payableAmount: numericAmount + 35,
      qris: '00020101021226610014COM.GO-JEK.WWW...',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      paidAt: null
    }
  };

  const runTest = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setPayment(null);
    setResponseJson(null);
    setSecondsLeft(0);
    setLogs([]);
    lastLoggedStatusRef.current = '';

    try {
      let activeKey = apiKey;
      if (!activeKey && onRequireKey) {
        activeKey = await onRequireKey();
      }
      if (!activeKey) {
        throw new Error('Buat atau tampilkan API Key terlebih dahulu di card atas.');
      }

      const currentOrderId = orderId.trim() || `api-test-${Date.now()}`;
      const bodyPayload = {
        orderId: currentOrderId,
        amount: Number(amount),
        expiresIn: 300
      };

      addLog('request', `POST /api/v1/payments (orderId: ${currentOrderId}, amount: Rp${Number(amount).toLocaleString('id-ID')})`);

      const res = await fetch(`${API}/api/v1/payments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-api-key': activeKey
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json().catch(() => ({}));
      setResponseJson(data);

      if (!res.ok || !data.payment) {
        addLog('error', `HTTP ${res.status} - ${data.error || 'Gagal membuat transaksi'}`);
        throw new Error(data.error || 'Gagal membuat transaksi test');
      }

      setPayment(data.payment);
      setSecondsLeft(300);
      lastLoggedStatusRef.current = data.payment.status;
      addLog(
        'pending',
        `PENDING — Tagihan QRIS aktif sebesar Rp${Number(data.payment.payableAmount).toLocaleString('id-ID')} (dasar Rp${Number(data.payment.baseAmount).toLocaleString('id-ID')} + penanda ${data.payment.surcharge}). Menunggu pembayaran…`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!payment || payment.status !== 'pending' || secondsLeft <= 0) return undefined;
    let active = true;

    const pollStatus = async () => {
      try {
        const headers = { 'content-type': 'application/json' };
        if (apiKey) headers['x-api-key'] = apiKey;
        const res = await fetch(`${API}/api/v1/payments/${payment.trxId}`, {
          credentials: 'include',
          headers
        });
        const data = await res.json().catch(() => ({}));
        if (!active || !res.ok || !data.payment) return;

        setResponseJson(data);
        setPayment(data.payment);

        if (data.payment.status !== lastLoggedStatusRef.current) {
          lastLoggedStatusRef.current = data.payment.status;
          if (data.payment.status === 'paid') {
            const issuer = data.payment.providerTransaction?.issuer || 'QRIS';
            addLog('paid', `SUKSES (PAID) — Pembayaran Rp${Number(data.payment.payableAmount).toLocaleString('id-ID')} diterima via ${issuer}.`);
          } else if (data.payment.status === 'expired') {
            addLog('expired', 'EXPIRED — Waktu pembayaran habis sebelum transaksi dibayar.');
          }
        }
      } catch {
        /* ignore transient poll error */
      }
    };

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 3);
        if (next === 0 && lastLoggedStatusRef.current === 'pending') {
          lastLoggedStatusRef.current = 'expired';
          setPayment((curr) => (curr ? { ...curr, status: 'expired' } : curr));
          setResponseJson((curr) => (curr && curr.payment ? { ...curr, payment: { ...curr.payment, status: 'expired' } } : curr));
          addLog('expired', 'EXPIRED — Batas waktu 5 menit berakhir.');
        }
        return next;
      });
      pollStatus();
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [payment && payment.trxId, payment && payment.status, secondsLeft > 0, apiKey]);

  const statusLabel = !payment
    ? 'Contoh Output'
    : payment.status === 'paid'
    ? 'PAID / SUKSES'
    : payment.status === 'expired'
    ? 'EXPIRED'
    : 'PENDING';

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const progress = Math.max(0, Math.min(100, (secondsLeft / 300) * 100));
  const quickAmounts = [100, 1000, 10000, 25000];
  const jsonToDisplay = JSON.stringify(responseJson || sampleOutputFallback, null, 2);

  return (
    <section className="gpy-panel" id="api-key-sandbox">
      <div className="gpy-panel-head">
        <div>
          <p className="gpy-section-label">02 / API SANDBOX</p>
          <h3>Test transaksi via Api Key</h3>
        </div>
        <Terminal size={18} />
      </div>

      <form onSubmit={runTest} className="gpy-form">
        <div className="gpy-sandbox-inputs">
          <div>
            <label className="gpy-label" htmlFor="sandbox-amount">Nominal Test (Rp)</label>
            <div className="gpy-amount-field">
              <span>Rp</span>
              <input
                id="sandbox-amount"
                value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="1.000"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="gpy-chips">
              {quickAmounts.map((val) => (
                <button
                  type="button"
                  key={val}
                  className={`gpy-chip ${Number(amount) === val ? 'is-active' : ''}`}
                  onClick={() => setAmount(String(val))}
                >
                  {val >= 1000 ? `Rp${(val / 1000).toLocaleString('id-ID')}rb` : `Rp${val}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="gpy-label" htmlFor="sandbox-order-id">Order ID</label>
            <div className="gpy-orderid-row">
              <input
                id="sandbox-order-id"
                className="gpy-input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="api-test-123"
              />
              <button
                type="button"
                className="gpy-btn gpy-btn-secondary"
                onClick={() => setOrderId(`api-test-${Date.now()}`)}
                title="Generate Order ID baru"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="gpy-code-section">
          <div className="gpy-code-head">
            <span><Code2 size={13} /> Contoh Request (POST /api/v1/payments)</span>
            <button type="button" onClick={() => copyBlock('req', curlSample)}>
              {copiedBlock === 'req' ? <><Check size={12} /> Tersalin</> : <><Clipboard size={12} /> Salin</>}
            </button>
          </div>
          <pre className="gpy-code-pre"><code>{curlSample}</code></pre>
        </div>

        {error && <div className="gpy-error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}

        <div className="gpy-actions-row">
          <button className="gpy-btn gpy-btn-primary gpy-btn-block" disabled={busy || !Number(amount)}>
            {busy ? (
              <><Loader2 size={15} className="gpy-spin" /> Mengirim Request API…</>
            ) : (
              <><Play size={14} /> Test Buat QRIS via API Key</>
            )}
          </button>
        </div>
      </form>

      {payment && (
        <div className="gpy-sim-result" style={{ marginTop: 16 }}>
          <div className="gpy-sim-head">
            <div className="gpy-sim-head-main">
              <span className="gpy-sim-amount">Rp{Number(payment.payableAmount).toLocaleString('id-ID')}</span>
              <small>Nominal dasar Rp{Number(payment.baseAmount).toLocaleString('id-ID')} + penanda {payment.surcharge} • Order: {payment.orderId}</small>
            </div>
            <span className={`gpy-pill ${payment.status === 'paid' ? 'connected' : payment.status === 'expired' ? 'is-expired' : 'is-pending'}`}>
              {statusLabel}
            </span>
          </div>

          {payment.status === 'pending' && (
            <div className="gpy-sim-timer">
              <div className="gpy-sim-timer-label">
                <span>Berlaku sampai</span>
                <b>{countdown}</b>
              </div>
              <div className="gpy-sim-progress"><span style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          {payment.status === 'paid' ? (
            <div className="gpy-payment-success" role="status" aria-live="polite">
              <Check size={24} />
              <div>
                <strong>Pembayaran berhasil diterima</strong>
                <span>Transaksi {payment.trxId} sudah berstatus PAID.</span>
              </div>
            </div>
          ) : payment.status === 'pending' ? (
            <div className="gpy-sim-qr-box">
              <div className="gpy-sim-qr-frame">
                <img
                  className="gpy-sim-qr"
                  alt="QRIS dinamis test API"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(payment.qris)}`}
                />
              </div>
              <p className="gpy-sim-hint">Scan QRIS ini untuk menguji pembayaran dan melihat perubahan log JSON di bawah.</p>
              <div className="gpy-sim-payload">
                <code>{payment.qris}</code>
                <button type="button" onClick={() => copyBlock('qris', payment.qris)} aria-label="Salin payload QRIS">
                  {copiedBlock === 'qris' ? <Check size={14} /> : <Clipboard size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="gpy-sim-empty">
              <X size={20} />
              <p>Transaksi test kedaluwarsa (EXPIRED). Klik tombol di bawah untuk membuat test baru.</p>
            </div>
          )}

          <button
            type="button"
            className="gpy-btn gpy-btn-secondary gpy-btn-block"
            onClick={() => {
              setOrderId(`api-test-${Date.now()}`);
              setPayment(null);
              setSecondsLeft(0);
            }}
          >
            <RefreshCw size={14} /> Reset & Buat Order Baru
          </button>
        </div>
      )}

      <div className="gpy-code-section" style={{ marginTop: 16 }}>
        <div className="gpy-code-head">
          <span>
            <Terminal size={13} /> {responseJson ? 'Live Output JSON & Log Status' : 'Contoh Output JSON'}
          </span>
          <div className="gpy-code-head-right">
            <span className={`gpy-status-dot ${payment ? `is-${payment.status}` : ''}`}>
              {statusLabel}
            </span>
            <button type="button" onClick={() => copyBlock('json', jsonToDisplay)}>
              {copiedBlock === 'json' ? <><Check size={12} /> Tersalin</> : <><Clipboard size={12} /> Salin JSON</>}
            </button>
          </div>
        </div>
        <pre className="gpy-code-pre"><code>{jsonToDisplay}</code></pre>

        <div className="gpy-log-box">
          <div className="gpy-log-title">Live Polling</div>
          {logs.length > 0 && (
            <div className="gpy-log-list">
              {logs.map((item) => (
                <div key={item.id} className={`gpy-log-item is-${item.status}`}>
                  <span className="gpy-log-time">[{item.time}]</span>
                  <span className={`gpy-log-badge is-${item.status}`}>{item.status.toUpperCase()}</span>
                  <span className="gpy-log-msg">{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ApiKeyPage() {
  const [data, setData] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const endpointBase = `${API}/api/v1/payments`;

  const load = async () => {
    try {
      const result = await request('/api/dashboard');
      setData(result);
    } catch (e) {
      if (e.message.includes('Login')) window.location.href = '/';
      else setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const createKey = async (isRegenerate = false) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/api-key', { method: 'POST' });
      setApiKey(result.apiKey.key);
      setNotice(isRegenerate ? 'API key lama dihapus dan diganti dengan API key baru.' : 'API key siap digunakan.');
      setShowRegenerateModal(false);
      await load();
      return result.apiKey.key;
    } catch (e) {
      setError(e.message);
      return '';
    } finally {
      setBusy(false);
    }
  };

  const revealKey = async () => {
    setError('');
    try {
      const result = await request('/api/api-key');
      setApiKey(result.apiKey.key);
      return result.apiKey.key;
    } catch (e) {
      setError(e.message);
      return '';
    }
  };

  const ensureKeyForTest = async () => {
    if (apiKey) return apiKey;
    if (data?.apiKey) return await revealKey();
    return await createKey();
  };

  const copy = async (text, label = 'Disalin ke clipboard.') => {
    await navigator.clipboard.writeText(text);
    setNotice(label);
  };

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (!data) return <div className="loading">Memuat workspace…</div>;

  return (
    <div className="page-shell">
      <div className="app-shell studio-shell gpy-management-shell">
        <Header management onLogout={logout} user={data.user} />
        <main className="workspace reports-workspace studio-dashboard gpy-dashboard">
          {notice && <div className="gpy-notice"><Check size={15} /> {notice}</div>}
          {error && <div className="gpy-error">{error}</div>}

          <section className="gpy-panel" id="api-key">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">01 / ACCESS</p>
                <h3>Api Key</h3>
              </div>
              <KeyRound size={18} />
            </div>

            <label className="gpy-label">Endpoint API</label>
            <div className="gpy-key-box" style={{ marginTop: 6 }}>
              <code>{endpointBase}</code>
              <button aria-label="Salin Endpoint API" onClick={() => copy(endpointBase, 'Endpoint API disalin ke clipboard.')}>
                <Clipboard size={15} />
              </button>
            </div>

            <label className="gpy-label">API Key</label>
            <div className="gpy-key-box" style={{ marginTop: 6 }}>
              <code>{apiKey || (data.apiKey ? `${data.apiKey.key_prefix}••••••••••••` : 'Belum dibuat')}</code>
              {apiKey && <button aria-label="Salin API key" onClick={() => copy(apiKey, 'API Key disalin ke clipboard.')}><Clipboard size={15} /></button>}
              {!apiKey && data.apiKey && <button onClick={revealKey}>Lihat</button>}
            </div>
            <div className="gpy-actions-row" style={{ justifyContent: 'center' }}>
              {data.apiKey ? (
                <button className="gpy-btn gpy-btn-secondary" onClick={() => setShowRegenerateModal(true)} disabled={busy}>
                  <RefreshCw size={14} /> Regenerate API Key
                </button>
              ) : (
                <button className="gpy-btn gpy-btn-primary" onClick={() => createKey(false)} disabled={busy}>
                  Buat API Key <KeyRound size={14} />
                </button>
              )}
            </div>
          </section>

          {showRegenerateModal && (
            <div className="gpy-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="regen-modal-title">
              <div className="gpy-modal-card">
                <div className="gpy-modal-head">
                  <h4 id="regen-modal-title">Regenerate API Key?</h4>
                  <button
                    type="button"
                    className="gpy-modal-close"
                    aria-label="Tutup modal"
                    onClick={() => !busy && setShowRegenerateModal(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="gpy-modal-body">
                  API Key lama akan dihapus secara permanen dan diganti dengan API Key baru. Semua integrasi yang masih memakai API Key lama tidak akan bisa lagi mengakses endpoint.
                </p>
                <div className="gpy-modal-actions">
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-secondary"
                    onClick={() => setShowRegenerateModal(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-primary"
                    onClick={() => createKey(true)}
                    disabled={busy}
                  >
                    {busy ? <><Loader2 size={14} className="gpy-spin" /> Memproses…</> : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ApiKeySandboxCard
            apiKey={apiKey}
            apiKeyPrefix={data.apiKey?.key_prefix}
            onRequireKey={ensureKeyForTest}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(null);
  useEffect(() => { request('/api/auth/status').then(setAuth).catch(() => setAuth({ authenticated: false })); }, []);
  if (!auth) return <div className="loading">Memuat…</div>;
  if (!auth.authenticated) return <Login />;
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/gpy-manager') return <GoPayManagement />;
  if (path === '/apikey') return <ApiKeyPage />;
  return <StudioTransactionDashboard request={request} user={auth.user || {}} />;
}

createRoot(document.getElementById('root')).render(<App />);
