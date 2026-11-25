import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Ban, BookOpen, Bot, Check, Clipboard, Code2, Eye, EyeOff, FileText, Globe, Hash, ImagePlus, KeyRound, Link2, Loader2, LogOut, Play, QrCode, RefreshCw, Send, ShieldCheck, Smartphone, Store, Terminal, Trash2, User, WalletCards, Webhook, X } from 'lucide-react';
import jsQR from 'jsqr';
import './style.css';
import './studio-dashboard.css';
import './gpy-management.css';
import StudioTransactionDashboard from './StudioTransactionDashboard';
import DocumentsPage from './DocumentsPage';
import AboutPage from './AboutPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';
import FaqPage from './FaqPage';
import { Header } from './components/Header';
import { LoginHeader } from './components/LoginHeader';
import { LandingPage } from './LandingPage';
import { Footer } from './components/Footer';

const API = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3100' : 'https://api-qris.alternat.my.id');
async function request(path, options = {}) { const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Request gagal'); return data; }

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/auth/telegram/start');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return <LandingPage onLogin={login} loading={loading} error={error} />;
}

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

function QrisCard({ configured, onSaved, endpoint = '/api/qris', title = 'QRIS statis', sectionNumber = '02 / QRIS CONFIGURATION' }) {
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
      await request(endpoint, { method: 'PUT', body: JSON.stringify({ staticQris: payload }) });
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
          <p className="gpy-section-label">{sectionNumber}</p>
          <h3>{title}</h3>
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
          </div>
        </div>
      )}

      {payload && (
        <div className="gpy-qris-confirm">
          <button className="gpy-btn gpy-btn-primary gpy-btn-full" onClick={save} disabled={busy || reading}>
            <Save size={14} /> {busy ? 'Menyimpan…' : 'Simpan QRIS'}
          </button>
        </div>
      )}
      {error && <p className="gpy-warning-text" role="alert">{error}</p>}
      {notice && <p className="gpy-notice-inline" role="status"><Check size={13} /> {notice}</p>}
    </section>
  );
}
function MerchantConnection() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('gopay'); // 'gopay' | 'shopeepay'

  // GoPay state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOutGopay, setLoggingOutGopay] = useState(false);

  // ShopeePay state
  const [shopeePhone, setShopeePhone] = useState('');
  const [shopeePassword, setShopeePassword] = useState('');
  const [shopeeOtp, setShopeeOtp] = useState('');
  const [shopeeOtpSent, setShopeeOtpSent] = useState(false);
  const [shopeeChannel, setShopeeChannel] = useState(3);
  const [shopeeNeedStoreSelection, setShopeeNeedStoreSelection] = useState(false);
  const [shopeeStores, setShopeeStores] = useState([]);
  const [shopeeLogoutModalOpen, setShopeeLogoutModalOpen] = useState(false);
  const [loggingOutShopee, setLoggingOutShopee] = useState(false);

  // Common UI state
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await request('/api/dashboard');
      setData(result);
      setPhone(result.gopay?.phone_number || '');
      setOtpSent(result.gopay?.status === 'otp_pending');
      setShopeePhone(result.shopee?.phone_number || '');
      setShopeeOtpSent(result.shopee?.status === 'otp_pending');
    } catch (e) {
      if (e.message.includes('Login')) window.location.href = '/';
      else setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const switchProvider = async (targetProvider) => {
    if (data?.activeProvider === targetProvider) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/merchant/provider', { method: 'POST', body: JSON.stringify({ provider: targetProvider }) });
      setNotice(`Provider aktif berhasil diubah ke ${targetProvider === 'shopeepay' ? 'ShopeePay' : 'GoPay'}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // --- GoPay Handlers ---
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

  const resendGoPayOtp = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/gopay/connect/reset', { method: 'POST' });
      if (!phone.trim()) {
        setOtp('');
        setOtpSent(false);
        return;
      }
      const result = await request('/api/gopay/connect/start', { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) });
      setOtp('');
      setOtpSent(true);
      setNotice(`OTP baru dikirim. Berlaku ${Math.floor(result.expiresIn / 60)} menit.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetGoPayPhone = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/gopay/connect/reset', { method: 'POST' });
      setOtp('');
      setOtpSent(false);
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

  const logoutGoPay = async () => {
    setLoggingOutGopay(true);
    setError('');
    setNotice('');
    try {
      await request('/api/gopay/logout', { method: 'POST' });
      setLogoutModalOpen(false);
      setOtp('');
      setOtpSent(false);
      setPhone('');
      setNotice('Berhasil logout dari akun GoPay.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoggingOutGopay(false);
    }
  };

  // --- ShopeePay Handlers ---
  const startShopee = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/shopee/connect/start', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: shopeePhone, password: shopeePassword, channel: shopeeChannel })
      });
      setShopeeOtpSent(true);
      setNotice(`Kode verifikasi Shopee dikirim via ${result.channel === 3 ? 'WhatsApp' : 'SMS'}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyShopee = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/api/shopee/connect/verify', {
        method: 'POST',
        body: JSON.stringify({ otp: shopeeOtp })
      });
      if (result.needStoreSelection) {
        setShopeeNeedStoreSelection(true);
        setShopeeStores(result.stores || []);
        setNotice('Silakan pilih toko Shopee Partner kamu.');
        return;
      }
      setShopeeOtp('');
      setShopeePassword('');
      setShopeeOtpSent(false);
      setNotice('ShopeePay Merchant berhasil terhubung.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const selectShopeeStore = async (storeId) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/shopee/connect/select-store', {
        method: 'POST',
        body: JSON.stringify({ storeId })
      });
      setShopeeNeedStoreSelection(false);
      setShopeeOtp('');
      setShopeePassword('');
      setShopeeOtpSent(false);
      setNotice('Toko ShopeePay berhasil dipilih dan terhubung.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetShopee = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/api/shopee/connect/reset', { method: 'POST' });
      setShopeeOtp('');
      setShopeeOtpSent(false);
      setShopeeNeedStoreSelection(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logoutShopee = async () => {
    setLoggingOutShopee(true);
    setError('');
    setNotice('');
    try {
      await request('/api/shopee/logout', { method: 'POST' });
      setShopeeLogoutModalOpen(false);
      setShopeeOtp('');
      setShopeeOtpSent(false);
      setShopeePhone('');
      setShopeePassword('');
      setNotice('Berhasil logout dari akun ShopeePay.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoggingOutShopee(false);
    }
  };

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (!data) return <div className="loading">Memuat workspace…</div>;

  const isGopayConnected = data.gopay?.status === 'connected';
  const isShopeeConnected = data.shopee?.status === 'connected';
  const showGopayQrisCard = isGopayConnected && !data.qris?.configured;
  const showShopeeQrisCard = isShopeeConnected && !data.shopeeQris?.configured;
  const isGopayActive = data.activeProvider === 'gopay';
  const isShopeeActive = data.activeProvider === 'shopeepay';

  return (
    <div className="page-shell">
      <div className="app-shell studio-shell gpy-management-shell">
        <Header management onLogout={logout} user={data.user} />
        <main className="workspace reports-workspace studio-dashboard gpy-dashboard">
          {notice && <div className="gpy-notice"><Check size={15} /> {notice}</div>}
          {error && <div className="gpy-error">{error}</div>}

          <div className="merchant-tabs">
            <button
              type="button"
              className={`merchant-tab-btn ${activeTab === 'gopay' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('gopay')}
            >
              <Smartphone size={16} />
              <span>GoPay</span>
              <span className={`merchant-badge ${isGopayActive ? 'merchant-badge-active' : 'merchant-badge-inactive'}`}>
                {isGopayActive ? 'ON' : 'OFF'}
              </span>
            </button>
            <button
              type="button"
              className={`merchant-tab-btn ${activeTab === 'shopeepay' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('shopeepay')}
            >
              <Smartphone size={16} />
              <span>ShopeePay</span>
              <span className={`merchant-badge ${isShopeeActive ? 'merchant-badge-active' : 'merchant-badge-inactive'}`}>
                {isShopeeActive ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {activeTab === 'gopay' && (
            <>
              <section className="gpy-panel" id="gopay-connection">
                <div className="gpy-panel-head">
                  <div>
                    <p className="gpy-section-label">01 / CONNECTION · GOPAY</p>
                    <h3>{data.gopay?.merchant_name || 'GoPay Merchant'}</h3>
                  </div>
                  <Smartphone size={18} />
                </div>

                <div className="toggle-switch-wrapper">
                  <div className="toggle-switch-info">
                    <h4>Aktifkan GoPay sebagai Gateway</h4>
                    <p>{isGopayActive ? 'GoPay sedang aktif menerima pembayaran' : 'GoPay nonaktif'}</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${isGopayActive ? 'is-on' : ''}`}
                    onClick={() => switchProvider(isGopayActive ? 'shopeepay' : 'gopay')}
                    disabled={busy || !isGopayConnected}
                    title={!isGopayConnected ? 'Hubungkan akun GoPay terlebih dahulu' : 'Toggle status GoPay'}
                    aria-label="Toggle GoPay"
                  >
                    <span className="toggle-switch-handle" />
                  </button>
                </div>

                {data.gopay?.merchant_name && (
                  <Row icon={Store} label="Outlet" value={data.gopay.merchant_name} />
                )}
                {data.gopay?.owner_name && (
                  <Row icon={User} label="Owner" value={data.gopay.owner_name} />
                )}
                {data.gopay?.merchant_id && (
                  <Row icon={Hash} label="Merchant ID" value={data.gopay.merchant_id} />
                )}
                <Row icon={Smartphone} label="Phone number" value={phone || 'Belum diatur'} />
                <Row
                  icon={QrCode}
                  label="String Qris"
                  value={data.qris?.configured ? 'Oke' : 'Belum diatur'}
                  valueClass={data.qris?.configured ? 'gpy-status-active' : ''}
                />
                <Row
                  icon={ShieldCheck}
                  label="Session"
                  value={isGopayConnected ? 'Active' : 'Belum terhubung'}
                  valueClass={isGopayConnected ? 'gpy-status-active' : ''}
                />

                {!isGopayConnected && !otpSent && (
                  <form onSubmit={startGoPay} className="gpy-form">
                    <label className="gpy-label" htmlFor="gopay-phone">Nomor GoPay/GoBiz</label>
                    <input className="gpy-input" id="gopay-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
                    <button className="gpy-btn gpy-btn-secondary gpy-btn-full" disabled={busy || !phone.trim()}>
                      <RefreshCw size={14} /> {busy ? 'Mengirim OTP…' : 'Kirim OTP'}
                    </button>
                  </form>
                )}

                {!isGopayConnected && otpSent && (
                  <form onSubmit={verifyGoPay} className="gpy-form">
                    <label className="gpy-label" htmlFor="gopay-otp">Kode OTP</label>
                    <input className="gpy-input" id="gopay-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Masukkan kode OTP" inputMode="numeric" autoComplete="one-time-code" />
                    <button className="gpy-btn gpy-btn-primary gpy-btn-full" disabled={busy}>
                      <Check size={14} /> {busy ? 'Memverifikasi…' : 'Verifikasi OTP'}
                    </button>
                    <div className="gpy-actions-row">
                      <button type="button" className="gpy-btn gpy-btn-secondary" onClick={resendGoPayOtp} disabled={busy}>
                        <RefreshCw size={14} /> Kirim ulang OTP
                      </button>
                      <button type="button" className="gpy-btn gpy-btn-secondary" onClick={resetGoPayPhone} disabled={busy}>
                        Ganti nomor
                      </button>
                    </div>
                  </form>
                )}

                {isGopayConnected && (
                  <>
                    <button className="gpy-btn gpy-btn-secondary gpy-btn-full" onClick={() => { setOtpSent(false); setNotice('Masukkan nomor baru untuk reconnect.'); }}>
                      <RefreshCw size={14} /> Reconnect GoPay
                    </button>
                    <button
                      type="button"
                      className="gpy-btn gpy-btn-danger gpy-btn-full"
                      onClick={() => setLogoutModalOpen(true)}
                      disabled={busy || loggingOutGopay}
                    >
                      <LogOut size={14} /> Logout GoPay
                    </button>
                  </>
                )}
              </section>

              {showGopayQrisCard && (
                <QrisCard configured={Boolean(data.qris?.configured)} onSaved={load} endpoint="/api/qris" title="QRIS Statis GoPay" sectionNumber="02 / QRIS GOPAY" />
              )}
            </>
          )}

          {activeTab === 'shopeepay' && (
            <>
              <section className="gpy-panel" id="shopee-connection">
                <div className="gpy-panel-head">
                  <div>
                    <p className="gpy-section-label">01 / CONNECTION · SHOPEEPAY</p>
                    <h3>{data.shopee?.store_name || data.shopee?.merchant_name || 'ShopeePay Merchant'}</h3>
                  </div>
                  <Smartphone size={18} />
                </div>

                <div className="toggle-switch-wrapper">
                  <div className="toggle-switch-info">
                    <h4>Aktifkan ShopeePay sebagai Gateway</h4>
                    <p>{isShopeeActive ? 'ShopeePay sedang aktif menerima pembayaran' : 'ShopeePay nonaktif'}</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${isShopeeActive ? 'is-on' : ''}`}
                    onClick={() => switchProvider(isShopeeActive ? 'gopay' : 'shopeepay')}
                    disabled={busy || !isShopeeConnected}
                    title={!isShopeeConnected ? 'Hubungkan akun ShopeePay terlebih dahulu' : 'Toggle status ShopeePay'}
                    aria-label="Toggle ShopeePay"
                  >
                    <span className="toggle-switch-handle" />
                  </button>
                </div>

                {data.shopee?.store_name && (
                  <Row icon={Store} label="Store" value={data.shopee.store_name} />
                )}
                {data.shopee?.merchant_name && (
                  <Row icon={User} label="Merchant" value={data.shopee.merchant_name} />
                )}
                {data.shopee?.store_id && (
                  <Row icon={Hash} label="Store ID" value={data.shopee.store_id} />
                )}
                <Row icon={Smartphone} label="Phone number" value={shopeePhone || 'Belum diatur'} />
                <Row
                  icon={QrCode}
                  label="String Qris"
                  value={data.shopeeQris?.configured ? 'Oke' : 'Belum diatur'}
                  valueClass={data.shopeeQris?.configured ? 'gpy-status-active' : ''}
                />
                <Row
                  icon={ShieldCheck}
                  label="Session"
                  value={isShopeeConnected ? 'Active' : 'Belum terhubung'}
                  valueClass={isShopeeConnected ? 'gpy-status-active' : ''}
                />

                {!isShopeeConnected && !shopeeOtpSent && !shopeeNeedStoreSelection && (
                  <form onSubmit={startShopee} className="gpy-form">
                    <label className="gpy-label" htmlFor="shopee-phone">Nomor HP Shopee Partner</label>
                    <input className="gpy-input" id="shopee-phone" value={shopeePhone} onChange={(e) => setShopeePhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
                    <label className="gpy-label" htmlFor="shopee-password" style={{ marginTop: '10px' }}>Password Akun Shopee</label>
                    <input className="gpy-input" id="shopee-password" type="password" value={shopeePassword} onChange={(e) => setShopeePassword(e.target.value)} placeholder="Password akun Shopee" />
                    <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" name="channel" value={3} checked={shopeeChannel === 3} onChange={() => setShopeeChannel(3)} /> WhatsApp
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" name="channel" value={1} checked={shopeeChannel === 1} onChange={() => setShopeeChannel(1)} /> SMS
                      </label>
                    </div>
                    <button className="gpy-btn gpy-btn-secondary gpy-btn-full" disabled={busy || !shopeePhone.trim() || !shopeePassword.trim()} style={{ marginTop: '14px' }}>
                      <RefreshCw size={14} /> {busy ? 'Mengirim OTP…' : 'Kirim Kode Verifikasi'}
                    </button>
                  </form>
                )}

                {!isShopeeConnected && shopeeOtpSent && !shopeeNeedStoreSelection && (
                  <form onSubmit={verifyShopee} className="gpy-form">
                    <label className="gpy-label" htmlFor="shopee-otp">Kode OTP (WhatsApp/SMS)</label>
                    <input className="gpy-input" id="shopee-otp" value={shopeeOtp} onChange={(e) => setShopeeOtp(e.target.value)} placeholder="Masukkan kode OTP" inputMode="numeric" autoComplete="one-time-code" />
                    <button className="gpy-btn gpy-btn-primary gpy-btn-full" disabled={busy}>
                      <Check size={14} /> {busy ? 'Memverifikasi…' : 'Verifikasi & Hubungkan'}
                    </button>
                    <div className="gpy-actions-row">
                      <button type="button" className="gpy-btn gpy-btn-secondary" onClick={resetShopee} disabled={busy}>
                        Batal / Ganti Nomor
                      </button>
                    </div>
                  </form>
                )}

                {shopeeNeedStoreSelection && (
                  <div className="gpy-form">
                    <label className="gpy-label">Pilih Toko Shopee</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {shopeeStores.map((s) => (
                        <button
                          key={s.storeId}
                          type="button"
                          className="gpy-btn gpy-btn-secondary"
                          style={{ justifyContent: 'space-between' }}
                          onClick={() => selectShopeeStore(s.storeId)}
                          disabled={busy}
                        >
                          <span>{s.storeName} ({s.storeId})</span>
                          <Check size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isShopeeConnected && (
                  <>
                    <button className="gpy-btn gpy-btn-secondary gpy-btn-full" onClick={() => { setShopeeOtpSent(false); setNotice('Masukkan kredensial untuk reconnect.'); }}>
                      <RefreshCw size={14} /> Reconnect ShopeePay
                    </button>
                    <button
                      type="button"
                      className="gpy-btn gpy-btn-danger gpy-btn-full"
                      onClick={() => setShopeeLogoutModalOpen(true)}
                      disabled={busy || loggingOutShopee}
                    >
                      <LogOut size={14} /> Logout ShopeePay
                    </button>
                  </>
                )}
              </section>

              {showShopeeQrisCard && (
                <QrisCard configured={Boolean(data.shopeeQris?.configured)} onSaved={load} endpoint="/api/shopee/qris" title="QRIS Statis ShopeePay" sectionNumber="02 / QRIS SHOPEEPAY" />
              )}
            </>
          )}

          {logoutModalOpen && (
            <div className="gpy-modal-backdrop" onClick={() => !loggingOutGopay && setLogoutModalOpen(false)}>
              <div className="gpy-modal-card" role="dialog" aria-modal="true" aria-labelledby="gopay-logout-title" onClick={(e) => e.stopPropagation()}>
                <div className="gpy-modal-head">
                  <h4 id="gopay-logout-title">Logout GoPay?</h4>
                  <button
                    type="button"
                    className="gpy-modal-close"
                    onClick={() => !loggingOutGopay && setLogoutModalOpen(false)}
                    aria-label="Tutup modal"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="gpy-modal-body">
                  Token, refresh token GoPay Merchant, dan string QRIS statis yang tersimpan akan dihapus dari sistem. Kamu harus login ulang dengan OTP dan mengunggah QRIS kembali untuk mengaktifkan koneksi.
                </p>
                <div className="gpy-modal-actions">
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-secondary"
                    onClick={() => setLogoutModalOpen(false)}
                    disabled={loggingOutGopay}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-danger"
                    onClick={logoutGoPay}
                    disabled={loggingOutGopay}
                  >
                    {loggingOutGopay ? <><Loader2 size={14} className="gpy-spin" /> Memproses…</> : 'Konfirmasi'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {shopeeLogoutModalOpen && (
            <div className="gpy-modal-backdrop" onClick={() => !loggingOutShopee && setShopeeLogoutModalOpen(false)}>
              <div className="gpy-modal-card" role="dialog" aria-modal="true" aria-labelledby="shopee-logout-title" onClick={(e) => e.stopPropagation()}>
                <div className="gpy-modal-head">
                  <h4 id="shopee-logout-title">Logout ShopeePay?</h4>
                  <button
                    type="button"
                    className="gpy-modal-close"
                    onClick={() => !loggingOutShopee && setShopeeLogoutModalOpen(false)}
                    aria-label="Tutup modal"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="gpy-modal-body">
                  Sesi Shopee Partner, token, dan string QRIS Shopee yang tersimpan akan dihapus dari sistem. Kamu harus login kembali untuk mengaktifkan koneksi ShopeePay.
                </p>
                <div className="gpy-modal-actions">
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-secondary"
                    onClick={() => setShopeeLogoutModalOpen(false)}
                    disabled={loggingOutShopee}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="gpy-btn gpy-btn-danger"
                    onClick={logoutShopee}
                    disabled={loggingOutShopee}
                  >
                    {loggingOutShopee ? <><Loader2 size={14} className="gpy-spin" /> Memproses…</> : 'Konfirmasi'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [responseJson, setResponseJson] = useState(null);
  const [payment, setPayment] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [logs, setLogs] = useState([]);
  const [copiedBlock, setCopiedBlock] = useState('');
  const lastLoggedStatusRef = useRef('');
  const activeTestKeyRef = useRef('');

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
    amount: numericAmount
  };

  const curlSample = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
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
      expiresIn: 300,
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
      activeTestKeyRef.current = activeKey;

      const currentOrderId = orderId.trim() || `api-test-${Date.now()}`;
      const bodyPayload = {
        orderId: currentOrderId,
        amount: Number(amount)
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
      setSecondsLeft(Number(data.payment.expiresIn) || 300);
      lastLoggedStatusRef.current = data.payment.status;
      addLog(
        'pending',
        `PENDING (${data.payment.orderId}) — Tagihan QRIS aktif sebesar Rp${Number(data.payment.payableAmount).toLocaleString('id-ID')} (dasar Rp${Number(data.payment.baseAmount).toLocaleString('id-ID')} + penanda ${data.payment.surcharge}). Berlaku 5 menit.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelTestPayment = async () => {
    if (!payment || payment.status !== 'pending' || cancelling) return;
    setCancelling(true);
    setError('');
    try {
      const key = activeTestKeyRef.current || apiKey || (onRequireKey ? await onRequireKey() : '');
      if (!key) throw new Error('API Key tidak ditemukan.');
      addLog('request', `POST /api/v1/payments/${payment.trxId}/cancel`);
      const res = await fetch(`${API}/api/v1/payments/${payment.trxId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key
        }
      });
      const data = await res.json().catch(() => ({}));
      setResponseJson(data);
      if (!res.ok || !data.payment) {
        addLog('error', `HTTP ${res.status} - ${data.error || 'Gagal membatalkan transaksi'}`);
        throw new Error(data.error || 'Gagal membatalkan transaksi');
      }
      lastLoggedStatusRef.current = data.payment.status;
      setPayment(data.payment);
      setSecondsLeft(0);
      addLog('cancelled', 'CANCELLED — Transaksi dibatalkan. Polling otomatis dihentikan.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!payment || payment.status !== 'pending' || secondsLeft <= 0) return undefined;
    let active = true;

    const pollStatus = async () => {
      try {
        const headers = { 'content-type': 'application/json' };
        const key = activeTestKeyRef.current || apiKey;
        if (key) headers['x-api-key'] = key;
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
          } else if (data.payment.status === 'cancelled') {
            setSecondsLeft(0);
            addLog('cancelled', 'CANCELLED — Transaksi dibatalkan. Polling otomatis dihentikan.');
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
    : payment.status === 'cancelled'
    ? 'CANCELLED'
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
          <p className="gpy-section-label">03 / API SANDBOX</p>
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
          {payment && payment.status === 'pending' && (
            <button
              type="button"
              className="gpy-btn gpy-btn-cancel"
              onClick={cancelTestPayment}
              disabled={cancelling}
            >
              {cancelling ? <><Loader2 size={14} className="gpy-spin" /> Membatalkan…</> : <><Ban size={14} /> Cancel</>}
            </button>
          )}
        </div>
      </form>

      {payment && (
        <div className="gpy-sim-result" style={{ marginTop: 16 }}>
          <div className="gpy-sim-head">
            <div className="gpy-sim-head-main">
              <span className="gpy-sim-amount">Rp{Number(payment.payableAmount).toLocaleString('id-ID')}</span>
              <small>Nominal dasar Rp{Number(payment.baseAmount).toLocaleString('id-ID')} + penanda {payment.surcharge} • Order: {payment.orderId}</small>
            </div>
            <span className={`gpy-pill ${payment.status === 'paid' ? 'connected' : payment.status === 'cancelled' ? 'is-cancelled' : payment.status === 'expired' ? 'is-expired' : 'is-pending'}`}>
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
          ) : payment.status === 'cancelled' ? (
            <div className="gpy-sim-empty is-cancelled">
              <Ban size={20} />
              <p>Transaksi dibatalkan (CANCELLED). Polling otomatis dihentikan.</p>
            </div>
          ) : (
            <div className="gpy-sim-empty">
              <X size={20} />
              <p>Transaksi test kedaluwarsa (EXPIRED). Klik tombol di bawah untuk membuat test baru.</p>
            </div>
          )}

          <div className="gpy-sandbox-footer-actions">
            {payment.status === 'pending' && (
              <button
                type="button"
                className="gpy-btn gpy-btn-cancel"
                onClick={cancelTestPayment}
                disabled={cancelling}
              >
                {cancelling ? <><Loader2 size={14} className="gpy-spin" /> Membatalkan…</> : <><Ban size={14} /> Cancel Transaksi</>}
              </button>
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
  const [keyVisible, setKeyVisible] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [testStatus, setTestStatus] = useState({ loading: false, result: null });
  const [selectedService, setSelectedService] = useState('website');
  const [regenService, setRegenService] = useState('website');
  const endpointBase = `${API}/api/v1/payments`;

  const load = async () => {
    try {
      const result = await request('/api/dashboard');
      setData(result);
      if (result.apiKey?.service_type) {
        setSelectedService(result.apiKey.service_type);
        setRegenService(result.apiKey.service_type);
      }
      if (result.webhook) {
        setWebhookUrl(result.webhook.url || '');
        setWebhookSecret(result.webhook.secret || '');
        setWebhookActive(result.webhook.isActive ?? true);
      }
    } catch (e) {
      if (e.message.includes('Login')) window.location.href = '/';
      else setError(e.message);
    }
  };

  const createKey = async (isRegenerate = false, serviceToUse = null) => {
    setBusy(true);
    setError('');
    setNotice('');
    const targetService = serviceToUse || (isRegenerate ? regenService : selectedService);
    try {
      const result = await request('/api/api-key', {
        method: 'POST',
        body: JSON.stringify({ serviceType: targetService })
      });
      setApiKey(result.apiKey.key);
      setKeyVisible(true);
      setSelectedService(result.apiKey.serviceType || targetService);
      setRegenService(result.apiKey.serviceType || targetService);
      setNotice(isRegenerate ? 'API key lama diganti dengan API key baru.' : 'API key siap digunakan.');
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

  const saveWebhook = async () => {
    setWebhookBusy(true);
    setNotice('');
    setError('');
    setTestStatus({ loading: false, result: null });
    try {
      const res = await request('/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ url: webhookUrl, secret: webhookSecret, isActive: webhookActive })
      });
      if (res.webhook) {
        setWebhookUrl(res.webhook.url || '');
        setWebhookSecret(res.webhook.secret || '');
        setWebhookActive(res.webhook.isActive ?? true);
        setNotice(res.message || 'Webhook berhasil disimpan.');
      } else {
        setWebhookUrl('');
        setWebhookSecret('');
        setNotice('Webhook dinonaktifkan.');
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWebhookBusy(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setTestStatus({ loading: true, result: null });
    setError('');
    try {
      const res = await request('/api/webhook/test', {
        method: 'POST',
        body: JSON.stringify({ url: webhookUrl, secret: webhookSecret })
      });
      setTestStatus({ loading: false, result: res });
    } catch (e) {
      setTestStatus({
        loading: false,
        result: { success: false, error: e.message, statusCode: 0, responseTimeMs: 0 }
      });
    }
  };

  useEffect(() => { load(); }, []);

  const fetchRealKey = async () => {
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

  const toggleKeyVisibility = async () => {
    if (keyVisible) {
      setKeyVisible(false);
      return;
    }
    if (apiKey) {
      setKeyVisible(true);
      return;
    }
    const fetched = await fetchRealKey();
    if (fetched) setKeyVisible(true);
  };

  const copyApiKey = async () => {
    let realKey = apiKey;
    if (!realKey && data?.apiKey) {
      realKey = await fetchRealKey();
    }
    if (!realKey) return;
    await navigator.clipboard.writeText(realKey);
    setCopiedTarget('apikey');
    setTimeout(() => setCopiedTarget((curr) => (curr === 'apikey' ? '' : curr)), 1600);
    setNotice('API Key disalin ke clipboard.');
  };

  const ensureKeyForTest = async () => {
    if (apiKey) return apiKey;
    if (data?.apiKey) return await fetchRealKey();
    return await createKey();
  };

  const copy = async (text, label = 'Disalin ke clipboard.', target = '') => {
    await navigator.clipboard.writeText(text);
    if (target) {
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget((curr) => (curr === target ? '' : curr)), 1600);
    }
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
              <div className="gpy-key-actions">
                <button
                  type="button"
                  className="gpy-key-icon-btn"
                  aria-label="Salin Endpoint API"
                  onClick={() => copy(endpointBase, 'Endpoint API disalin ke clipboard.', 'endpoint')}
                >
                  {copiedTarget === 'endpoint' ? <Check size={15} /> : <Clipboard size={15} />}
                </button>
              </div>
            </div>

            <label className="gpy-label">API Key</label>
            <div className="gpy-key-box" style={{ marginTop: 6 }}>
              <code className={`gpy-key-text ${keyVisible ? 'is-revealed' : 'is-masked'}`}>
                {keyVisible && apiKey
                  ? apiKey
                  : data.apiKey
                  ? `${data.apiKey.key_prefix}••••••••••••`
                  : 'Belum dibuat'}
              </code>
              {data.apiKey && (
                <div className="gpy-key-actions">
                  <button
                    type="button"
                    className={`gpy-key-icon-btn gpy-eye-btn ${keyVisible ? 'is-open' : ''}`}
                    aria-label={keyVisible ? 'Sembunyikan API key' : 'Tampilkan API key'}
                    onClick={toggleKeyVisibility}
                  >
                    <span className="gpy-eye-stack">
                      <EyeOff size={15} className="gpy-eye-icon gpy-eye-closed" />
                      <Eye size={15} className="gpy-eye-icon gpy-eye-open" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="gpy-key-icon-btn"
                    aria-label="Salin API key"
                    onClick={copyApiKey}
                  >
                    {copiedTarget === 'apikey' ? <Check size={15} /> : <Clipboard size={15} />}
                  </button>
                </div>
              )}
            </div>

            {!data.apiKey && (
              <div style={{ marginTop: 18, marginBottom: 6 }}>
                <label className="gpy-label" style={{ marginBottom: 8, display: 'block' }}>
                  Pilih Layanan Integrasi
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedService('website')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `2px solid ${selectedService === 'website' ? 'var(--green, #29544B)' : '#e5e7eb'}`,
                      background: selectedService === 'website' ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: selectedService === 'website' ? 'var(--green, #29544B)' : '#111827' }}>
                      <Globe size={16} />
                      <span>Website</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                      Membutuhkan Webhook URL untuk notifikasi pembayaran lunas secara instan.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedService('bot')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `2px solid ${selectedService === 'bot' ? 'var(--green, #29544B)' : '#e5e7eb'}`,
                      background: selectedService === 'bot' ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: selectedService === 'bot' ? 'var(--green, #29544B)' : '#111827' }}>
                      <Bot size={16} />
                      <span>Bot (Telegram / WA)</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                      Tanpa domain publik. Menggunakan sistem polling status berkala.
                    </span>
                  </button>
                </div>
              </div>
            )}

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
                <p className="gpy-modal-body" style={{ marginBottom: 16 }}>
                  API Key lama akan dihapus secara permanen dan diganti dengan API Key baru.
                </p>

                <div style={{ marginBottom: 18, textAlign: 'left' }}>
                  <label className="gpy-label" style={{ marginBottom: 8, display: 'block' }}>
                    Jenis Layanan
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setRegenService('website')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `2px solid ${regenService === 'website' ? 'var(--green, #29544B)' : '#e5e7eb'}`,
                        background: regenService === 'website' ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        color: regenService === 'website' ? 'var(--green, #29544B)' : '#374151'
                      }}
                    >
                      <Globe size={15} />
                      <span>Website</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegenService('bot')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `2px solid ${regenService === 'bot' ? 'var(--green, #29544B)' : '#e5e7eb'}`,
                        background: regenService === 'bot' ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        color: regenService === 'bot' ? 'var(--green, #29544B)' : '#374151'
                      }}
                    >
                      <Bot size={15} />
                      <span>Bot</span>
                    </button>
                  </div>
                </div>

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
                    onClick={() => createKey(true, regenService)}
                    disabled={busy}
                  >
                    {busy ? <><Loader2 size={14} className="gpy-spin" /> Memproses…</> : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {data.apiKey && (data.apiKey.service_type || selectedService) === 'website' && (
          <section className="gpy-panel" id="webhook-config">
            <div className="gpy-panel-head">
              <div>
                <p className="gpy-section-label">02 / WEBHOOK (CALLBACK)</p>
                <h3>Webhook Notification</h3>
              </div>
              <Webhook size={18} />
            </div>

            <p className="gpy-desc">
              Kirim notifikasi HTTP POST otomatis ke server kamu seketika saat pembayaran lunas (<code>PAID</code>).
            </p>

            <label className="gpy-label" htmlFor="webhook-url-input">Webhook URL</label>
            <div style={{ marginTop: 6, marginBottom: 14 }}>
              <input
                id="webhook-url-input"
                type="url"
                className="gpy-input"
                placeholder="https://api.domain-kamu.com/callback/gopay"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={webhookBusy}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <label className="gpy-label">Webhook Secret (HMAC-SHA256)</label>
            <div className="gpy-key-box" style={{ marginTop: 6, marginBottom: 16 }}>
              <code style={{ fontSize: '13px' }}>{webhookSecret || 'Akan di-generate otomatis saat disimpan'}</code>
              {webhookSecret && (
                <div className="gpy-key-actions">
                  <button
                    type="button"
                    className="gpy-key-icon-btn"
                    aria-label="Salin Webhook Secret"
                    onClick={() => copy(webhookSecret, 'Webhook Secret disalin ke clipboard.', 'webhook-secret')}
                  >
                    {copiedTarget === 'webhook-secret' ? <Check size={15} /> : <Clipboard size={15} />}
                  </button>
                </div>
              )}
            </div>

            {testStatus.result && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: 16,
                  fontSize: '13px',
                  lineHeight: 1.5,
                  background: testStatus.result.success ? '#eefbf4' : '#fff5f5',
                  border: `1px solid ${testStatus.result.success ? '#a7f3d0' : '#fecaca'}`,
                  color: testStatus.result.success ? '#065f46' : '#991b1b'
                }}
              >
                <strong>{testStatus.result.success ? 'Uji Coba Berhasil' : 'Uji Coba Gagal'}:</strong>{' '}
                {testStatus.result.success ? (
                  <span>HTTP {testStatus.result.statusCode} ({testStatus.result.responseTimeMs}ms)</span>
                ) : (
                  <span>{testStatus.result.error || `HTTP ${testStatus.result.statusCode}`}</span>
                )}
                {testStatus.result.responseBody && (
                  <div style={{ marginTop: 6, fontSize: '11.5px', fontFamily: 'monospace', opacity: 0.85 }}>
                    Respon server: {testStatus.result.responseBody}
                  </div>
                )}
              </div>
            )}

            <div className="gpy-actions-row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="gpy-btn gpy-btn-primary"
                onClick={saveWebhook}
                disabled={webhookBusy || testStatus.loading}
              >
                {webhookBusy ? <><Loader2 size={14} className="gpy-spin" /> Menyimpan…</> : 'Simpan Webhook'}
              </button>
              <button
                type="button"
                className="gpy-btn gpy-btn-secondary"
                onClick={testWebhook}
                disabled={webhookBusy || testStatus.loading || !webhookUrl.trim()}
              >
                {testStatus.loading ? <><Loader2 size={14} className="gpy-spin" /> Menguji Ping…</> : <><Send size={14} /> Test Webhook</>}
              </button>
            </div>
          </section>
          )}

          <ApiKeySandboxCard
            apiKey={keyVisible ? apiKey : ''}
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

  const path = window.location.pathname.replace(/\/$/, '');
  const isAbout = path === '/about' || path === '/tentang-kami';
  const isPrivacy = path === '/privacy' || path === '/kebijakan-privasi';
  const isTerms = path === '/terms' || path === '/syarat-ketentuan';
  const isFaq = path === '/faq' || path === '/tanya-jawab';
  const isDocuments = path === '/documents' || path === '/dokumentasi-api' || path === '/docs';

  const logout = async () => {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    window.location.href = '/';
  };

  if (isAbout) return <AboutPage user={auth?.user} onLogout={logout} />;
  if (isPrivacy) return <PrivacyPage user={auth?.user} onLogout={logout} />;
  if (isTerms) return <TermsPage user={auth?.user} onLogout={logout} />;
  if (isFaq) return <FaqPage user={auth?.user} onLogout={logout} />;
  if (isDocuments) return <DocumentsPage request={request} user={auth?.user} />;

  if (!auth) return <div className="loading">Memuat…</div>;
  if (!auth.authenticated) return <Login />;

  if (path === '/gpy-manager' || path === '/koneksi-merchant') return <MerchantConnection />;
  if (path === '/apikey') return <ApiKeyPage />;
  return <StudioTransactionDashboard request={request} user={auth.user || {}} />;
}

createRoot(document.getElementById('root')).render(<App />);
