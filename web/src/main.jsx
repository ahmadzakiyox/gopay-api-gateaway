import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Check, Clipboard, Hash, ImagePlus, KeyRound, Link2, Loader2, LogOut, QrCode, RefreshCw, ShieldCheck, Smartphone, Store, Trash2, User, WalletCards, X } from 'lucide-react';
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
          <p className="gpy-section-label">04 / SIMULATION</p>
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

function readQrisFromImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxSide = 1400;
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const scale = ratio < 1 ? ratio : Math.min(3, Math.max(1, 900 / Math.max(img.naturalWidth, img.naturalHeight)));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
        URL.revokeObjectURL(url);
        if (!result || !result.data) return reject(new Error('QR code tidak terdeteksi. Pastikan seluruh kode terlihat jelas dan tidak terpotong.'));
        resolve(result.data);
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
          <p className="gpy-section-label">03 / QRIS CONFIGURATION</p>
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
  const [apiKey, setApiKey] = useState('');
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

  const createKey = async () => {
    setBusy(true);
    try {
      const result = await request('/api/api-key', { method: 'POST' });
      setApiKey(result.apiKey.key);
      setNotice('API key siap digunakan.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revealKey = async () => {
    try {
      const result = await request('/api/api-key');
      setApiKey(result.apiKey.key);
    } catch (e) {
      setError(e.message);
    }
  };

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

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    setNotice('Disalin ke clipboard.');
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

          <div className="gpy-grid-two">
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

            <section className="gpy-panel" id="api-key">
              <div className="gpy-panel-head">
                <div>
                  <p className="gpy-section-label">02 / ACCESS</p>
                  <h3>API Key</h3>
                </div>
                <KeyRound size={18} />
              </div>
              <p className="gpy-desc">Satu key personal untuk menghubungkan gateway ke website atau backend kamu.</p>
              <div className="gpy-key-box">
                <code>{apiKey || (data.apiKey ? `${data.apiKey.key_prefix}••••••••••••` : 'Belum dibuat')}</code>
                {apiKey && <button aria-label="Salin API key" onClick={() => copy(apiKey)}><Clipboard size={15} /></button>}
                {!apiKey && data.apiKey && <button onClick={revealKey}>Lihat</button>}
              </div>
              <div className="gpy-actions-row">
                <button className="gpy-btn gpy-btn-primary" onClick={data.apiKey ? revealKey : createKey} disabled={busy}>
                  {data.apiKey ? 'Tampilkan & Salin' : 'Buat API Key'} <KeyRound size={14} />
                </button>
                {apiKey && (
                  <button className="gpy-btn-icon" aria-label="Salin API key" onClick={() => copy(apiKey)}>
                    <Clipboard size={15} />
                  </button>
                )}
              </div>
              <p className="gpy-warning-text">Jangan bagikan key ini ke publik.</p>
            </section>
          </div>

          <QrisCard configured={Boolean(data.qris.configured)} onSaved={load} />

          <SimulateCard onDone={load} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
function App() { const [auth, setAuth] = useState(null); useEffect(() => { request('/api/auth/status').then(setAuth).catch(() => setAuth({ authenticated: false })); }, []); if (!auth) return <div className="loading">Memuat…</div>; return auth.authenticated ? (window.location.pathname.replace(/\/$/, '') === '/gpy-manager' ? <GoPayManagement /> : <StudioTransactionDashboard request={request} user={auth.user || {}} />) : <Login />; }

createRoot(document.getElementById('root')).render(<App />);
