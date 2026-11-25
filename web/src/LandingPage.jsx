import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Zap, 
  Code2, 
  Webhook, 
  Smartphone, 
  Lock, 
  Activity, 
  RefreshCw,
  Terminal,
  Send,
  Layers
} from 'lucide-react';
import { LoginHeader } from './components/LoginHeader';
import { Footer } from './components/Footer';
import './landing.css';

export function LandingPage({ onLogin, loading, error }) {
  // Rotating headline word animation
  const words = ['Bisnis Web', 'Bot Telegram', 'Layanan Otomatis', 'Produk Digital'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Scroll reveal observer (IntersectionObserver)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const revealElements = document.querySelectorAll('[data-reveal]');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-shell">
      <LoginHeader />

      <main className="landing-main">
        {/* HERO SECTION */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="hero-badge" data-reveal>
              <span className="badge-dot" />
              <span>Gateway QRIS Otomatis Real-Time</span>
            </div>

            <h1 className="hero-title" data-reveal>
              Terima Pembayaran QRIS untuk
              <div className="rotating-text-row">
                <span className="rotating-text-wrapper">
                  <span className="rotating-text-word" key={wordIndex}>
                    {words[wordIndex]}
                  </span>
                </span>
              </div>
              Langsung ke Rekening GoPay &amp; ShopeePay Kamu
            </h1>

            <p className="hero-subtitle" data-reveal>
              Tinggalkan verifikasi mutasi manual. Alternate Pay memverifikasi transfer QRIS secara otomatis
              hanya dalam hitungan detik dengan surcharge unik dan webhook callback instan.
            </p>

            <div className="hero-cta-group" data-reveal>
              <button 
                type="button" 
                className="landing-btn-telegram" 
                onClick={onLogin} 
                disabled={loading}
              >
                <svg className="telegram-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
                <span>{loading ? 'Membuka Telegram…' : 'Login with Telegram'}</span>
              </button>
            </div>

            {error && (
              <p className="landing-login-error" role="alert">{error}</p>
            )}

            {/* LIVE PREVIEW INTERACTIVE SIMULATION */}
            <div className="hero-preview-container" data-reveal>
              <div className="preview-window">
                <div className="preview-window-header">
                  <div className="preview-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <div className="preview-address-bar">
                    <Lock size={12} className="preview-lock-icon" />
                    <span>api.alternat.my.id/api/v1/payments</span>
                  </div>
                  <div className="preview-mode-tag">PRODUCTION READY</div>
                </div>

                <div className="preview-content-grid">
                  {/* Left: Code Box */}
                  <div className="preview-code-box">
                    <div className="preview-box-label">
                      <Code2 size={13} />
                      <span>CREATE TRANSACTION (POST)</span>
                    </div>
                    <pre className="preview-code-block">
                      <code>{`const res = await fetch('/api/v1/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': 'gpg_live_••••••'
  },
  body: JSON.stringify({
    orderId: 'INV-904',
    amount: 50000,
    webhookUrl: 'https://api.toko.com/cb'
  })
});`}</code>
                    </pre>
                  </div>

                  {/* Right: Payment Simulation Card */}
                  <div className="preview-card-box">
                    <div className="preview-box-label">
                      <Activity size={13} />
                      <span>MUTASI & SETTLEMENT OTOMATIS</span>
                    </div>
                    <div className="preview-sim-body">
                      <div className="preview-amount-row">
                        <span>Nominal Dasar</span>
                        <strong>Rp 50.000</strong>
                      </div>
                      <div className="preview-amount-row surcharge-row">
                        <span>Kode Unik (Surcharge)</span>
                        <strong className="text-orange">+Rp 42</strong>
                      </div>
                      <div className="preview-divider" />
                      <div className="preview-amount-row total-row">
                        <span>Total Bayar Pelanggan</span>
                        <strong className="text-green">Rp 50.042</strong>
                      </div>
                      <div className="preview-status-badge">
                        <span className="status-ping" />
                        <span>Status: PAID • Webhook Sent (200 OK)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 PILLARS VALUE PROPOSITIONS */}
        <section id="keunggulan" className="pillars-section">
          <div className="landing-container">
            <div className="section-head text-center" data-reveal>
              <span className="section-kicker">KEUNGGULAN UTAMA</span>
              <h2 className="section-heading">Arsitektur Pembayaran yang Bersih dan Tepat</h2>
              <p className="section-desc">Dibangun khusus untuk pengembang, pemilik bot, dan pengusaha digital.</p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-item" data-reveal>
                <div className="pillar-icon">
                  <Zap size={24} />
                </div>
                <h3 className="pillar-title">Settlement Real-Time</h3>
                <p className="pillar-desc">
                  Sistem mengecek mutasi GoPay Merchant &amp; ShopeePay Merchant tiap beberapa detik tanpa jeda manual saat ada transaksi berlangsung.
                </p>
              </div>

              <div className="pillar-item" data-reveal>
                <div className="pillar-icon">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="pillar-title">Keamanan Sandi Tingkat Tinggi</h3>
                <p className="pillar-desc">
                  Sesi merchant dan kunci API disimpan dengan enkripsi AES-256-GCM. Dilengkapi proteksi SSRF dan tanda tangan HMAC.
                </p>
              </div>

              <div className="pillar-item" data-reveal>
                <div className="pillar-icon">
                  <Layers size={24} />
                </div>
                <h3 className="pillar-title">Dukungan Dual-Mode</h3>
                <p className="pillar-desc">
                  Gunakan Webhook HTTP Callback instan untuk Website atau Polling API terjadwal untuk Bot Telegram & WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2X2 FEATURES GRID ALA POS KEDAI */}
        <section id="fitur" className="features-section">
          <div className="landing-container">
            <div className="section-head text-center" data-reveal>
              <span className="section-kicker">FITUR LENGKAP</span>
              <h2 className="section-heading">Dirancang untuk Mengotomatiskan Transaksi</h2>
              <p className="section-desc">Semua perkakas yang kamu butuhkan untuk mengelola integrasi pembayaran QRIS.</p>
            </div>

            <div className="features-grid">
              {/* Feature 1 */}
              <div className="feature-card" data-reveal>
                <div className="feature-card-content">
                  <span className="card-pill pill-green">MUTASI & QRIS</span>
                  <h3 className="feature-title">QRIS Dinamis Otomatis</h3>
                  <p className="feature-desc">
                    Unggah QRIS statis GoPay atau ShopeePay milikmu sekali, dan sistem otomatis menghasilkan string QRIS dinamis siap scan sesuai nominal tagihan.
                  </p>
                </div>
                <div className="feature-card-footer">
                  <div className="feature-chip">
                    <Check size={14} /> <span>Kompatibel Semua E-Wallet & Bank</span>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="feature-card" data-reveal>
                <div className="feature-card-content">
                  <span className="card-pill pill-blue">DEVELOPER API</span>
                  <h3 className="feature-title">Integrasi API Ramah Developer</h3>
                  <p className="feature-desc">
                    REST API sederhana untuk create payment, polling status transaksi, serta pembatalan pesanan yang aman dan teruji.
                  </p>
                </div>
                <div className="feature-card-footer">
                  <div className="feature-chip">
                    <Check size={14} /> <span>Dokumentasi Interaktif & Sandbox</span>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="feature-card" data-reveal>
                <div className="feature-card-content">
                  <span className="card-pill pill-orange">WEBHOOK CALLBACK</span>
                  <h3 className="feature-title">Notifikasi Webhook Seketika</h3>
                  <p className="feature-desc">
                    Server kamu menerima callback HTTP POST seketika saat pembayaran lunas lengkap dengan verifikasi checksum HMAC-SHA256.
                  </p>
                </div>
                <div className="feature-card-footer">
                  <div className="feature-chip">
                    <Check size={14} /> <span>Proteksi SSRF & Validasi HTTPS</span>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="feature-card" data-reveal>
                <div className="feature-card-content">
                  <span className="card-pill pill-purple">DASHBOARD</span>
                  <h3 className="feature-title">Workspace & Riwayat Transaksi</h3>
                  <p className="feature-desc">
                    Pantau volume transaksi harian, grafik pendapatan, dan status settlement mutasi QRIS dalam satu dasbor yang bersih.
                  </p>
                </div>
                <div className="feature-card-footer">
                  <div className="feature-chip">
                    <Check size={14} /> <span>Filter Fleksibel & Audit Trail</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW STEPS */}
        <section id="cara-kerja" className="steps-section">
          <div className="landing-container">
            <div className="section-head text-center" data-reveal>
              <span className="section-kicker">3 LANGKAH MUDAH</span>
              <h2 className="section-heading">Bagaimana Cara Kerjanya?</h2>
              <p className="section-desc">Mulai terima pembayaran otomatis dalam waktu kurang dari 5 menit.</p>
            </div>

            <div className="steps-grid">
              <div className="step-card" data-reveal>
                <div className="step-number">01</div>
                <h4 className="step-title">Hubungkan Merchant QRIS</h4>
                <p className="step-desc">
                  Masuk dengan Telegram dan hubungkan akun GoPay Merchant atau ShopeePay Merchant kamu menggunakan nomor telepon dan OTP resmi.
                </p>
              </div>

              <div className="step-card" data-reveal>
                <div className="step-number">02</div>
                <h4 className="step-title">Generate API Key</h4>
                <p className="step-desc">
                  Pilih tipe layananmu (Website atau Bot) lalu salin API Key untuk dipasang pada backend sistem kamu.
                </p>
              </div>

              <div className="step-card" data-reveal>
                <div className="step-number">03</div>
                <h4 className="step-title">Terima Pembayaran Otomatis</h4>
                <p className="step-desc">
                  Pelanggan membayar via QRIS, dan transaksi otomatis berstatus lunas tanpa perlu memeriksa mutasi secara manual.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
