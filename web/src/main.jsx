import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Check, Clipboard, KeyRound, Link2, LogOut, QrCode, RefreshCw, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
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

function Row({ icon: Icon, label, value, status }) {
  return (
    <div className="gpy-status-row">
      <div className="gpy-status-left">
        <Icon size={15} />
        <span>{label}</span>
      </div>
      <div className="gpy-status-val">
        <strong>{value}</strong>
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
  const statusLabel = !payment ? '' : payment.status === 'paid' ? 'PEMBAYARAN BERHASIL' : payment.status === 'expired' ? 'KEDALUWARSA' : `Menunggu pembayaran… ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
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
          <label className="gpy-label" htmlFor="sim-amount">Nominal (Rp)</label>
          <input className="gpy-input" id="sim-amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="10000" inputMode="numeric" />
          <div className="gpy-actions-row">
            <button className="gpy-btn gpy-btn-primary" disabled={busy || !Number(amount)}>
              Create QRIS <QrCode size={15} />
            </button>
          </div>
        </form>
      )}
      {payment && (
        <div className="gpy-sim-result">
          <div className="gpy-sim-status">
            <div className="gpy-sim-status-title">
              <b>Rp{payment.payableAmount.toLocaleString('id-ID')}</b>
              <small>{`Nominal dasar Rp${payment.baseAmount.toLocaleString('id-ID')} + penanda ${payment.surcharge}`}</small>
            </div>
            <span className={`gpy-pill ${payment.status === 'paid' ? 'connected' : ''}`}>{statusLabel}</span>
          </div>
          {payment.status === 'paid' ? (
            <div className="gpy-payment-success" role="status" aria-live="polite">
              <Check size={28} />
              <div>
                <strong>Pembayaran berhasil</strong>
                <span>Pembayaran GoPay sudah terkonfirmasi.</span>
              </div>
            </div>
          ) : payment.status === 'pending' ? (
            <div className="gpy-sim-qr-box">
              <img className="gpy-sim-qr" alt="QRIS dinamis" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payment.qris)}`} />
              <code className="gpy-sim-payload">{payment.qris}</code>
            </div>
          ) : (
            <p className="gpy-muted-text">Waktu pembayaran habis. Buat transaksi baru untuk mencoba lagi.</p>
          )}
          {pollError && payment.status === 'pending' && <p className="gpy-warning-text" role="status">{pollError}</p>}
          <button className="gpy-btn gpy-btn-secondary gpy-btn-full" onClick={() => { setPayment(null); setAmount(''); setSecondsLeft(0); setPollError(''); }}>
            Buat transaksi baru
          </button>
        </div>
      )}
      {error && <p className="gpy-warning-text">{error}</p>}
    </section>
  );
}
function GoPayManagement() {
  const [data, setData] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [qris, setQris] = useState('');
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
      setQris(result.qris.staticQris || '');
      setPhone(result.gopay.phone_number || '');
    } catch (e) {
      if (e.message.includes('Login')) window.location.href = '/';
      else setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const saveQris = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await request('/api/qris', { method: 'PUT', body: JSON.stringify({ staticQris: qris }) });
      setNotice('QRIS berhasil disimpan.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

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
        <Header management onLogout={logout} />
        <main className="workspace reports-workspace studio-dashboard gpy-dashboard">
          <header className="gpy-header">
            <div>
              <h1>GoPay Management</h1>
              <p>Kelola integrasi akun merchant GoPay, API key, dan QRIS statis.</p>
            </div>
            <div className="gpy-profile">
              <span className="gpy-avatar">{(data.user.first_name || 'G').slice(0, 1).toUpperCase()}</span>
              <div className="gpy-profile-info">
                <b>{data.user.username ? `@${data.user.username}` : 'Telegram user'}</b>
                <small>Personal workspace</small>
              </div>
            </div>
          </header>

          {notice && <div className="gpy-notice"><Check size={15} /> {notice}</div>}
          {error && <div className="gpy-error">{error}</div>}

          <div className="gpy-grid-two">
            <section className="gpy-panel" id="connection">
              <div className="gpy-panel-head">
                <div>
                  <p className="gpy-section-label">01 / CONNECTION</p>
                  <h3>GoPay Merchant</h3>
                </div>
                <Smartphone size={18} />
              </div>
              <p className="gpy-desc">Hubungkan akun GoPay/GoBiz untuk aktivasi QRIS dinamis.</p>
              <Row icon={Smartphone} label="Phone number" value={phone || 'Belum diatur'} status={data.gopay.status} />
              <Row icon={ShieldCheck} label="Session" value={data.gopay.status === 'connected' ? 'Token aktif' : 'Belum terhubung'} />
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
              <p className="gpy-muted-text">OTP hanya diproses backend dan tidak disimpan di browser.</p>
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

          <section className="gpy-panel" id="qris">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">03 / QRIS CONFIGURATION</p>
                <h3>QRIS statis GoPay</h3>
              </div>
              <QrCode size={18} />
            </div>
            <p className="gpy-desc">Simpan QRIS merchant kamu. Nominal dinamis akan diproses server menggunakan format EMVCo.</p>
            <form onSubmit={saveQris} className="gpy-form">
              <label className="gpy-label" htmlFor="qris">QRIS string</label>
              <textarea className="gpy-textarea" id="qris" value={qris} onChange={(e) => setQris(e.target.value)} placeholder="Tempel QRIS statis kamu di sini…" spellCheck="false" />
              <div className="gpy-actions-row">
                <button className="gpy-btn gpy-btn-primary" disabled={busy || !qris.trim()}>
                  {busy ? 'Menyimpan…' : 'Simpan QRIS'} <Check size={14} />
                </button>
                {data.qris.configured && (
                  <span className="gpy-saved-badge">
                    <Check size={14} /> QRIS tersimpan
                  </span>
                )}
              </div>
            </form>
          </section>

          <SimulateCard onDone={load} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
function App() { const [auth, setAuth] = useState(null); useEffect(() => { request('/api/auth/status').then(setAuth).catch(() => setAuth({ authenticated: false })); }, []); if (!auth) return <div className="loading">Memuat…</div>; return auth.authenticated ? (window.location.pathname.replace(/\/$/, '') === '/gpy-manager' ? <GoPayManagement /> : <StudioTransactionDashboard request={request} user={auth.user || {}} />) : <Login />; }

createRoot(document.getElementById('root')).render(<App />);
