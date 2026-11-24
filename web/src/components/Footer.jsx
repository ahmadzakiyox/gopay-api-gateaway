import React from 'react';
import './Footer.css';

const START_YEAR = 2026;

export function Footer() {
  const currentYear = new Date().getFullYear();
  const yearLabel =
    currentYear > START_YEAR ? `${START_YEAR} - ${currentYear}` : `${START_YEAR}`;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="site-footer-brand-title">
              <img src="/logo.png" alt="" aria-hidden="true" className="site-footer-logo" />
              <span className="site-footer-wordmark">
                Alternate <b>Pay</b>
              </span>
            </div>
            <p className="footer-tagline">
              Payment gateway otomasi mutasi QRIS GoPay Merchant untuk kelancaran transaksi sistem kasir, aplikasi, dan website bisnis Anda.
            </p>
            <div className="footer-pill-tag">
              <span className="footer-pill-dot" />
              <span>Sistem Otomasi Mandiri</span>
            </div>
          </div>

          <div className="footer-nav-grid">
            <div className="footer-col">
              <h4 className="footer-col-title">Workspace</h4>
              <a href="/dashboard" className="footer-link">Dashboard</a>
              <a href="/gpy-manager" className="footer-link">GoPay Manager</a>
              <a href="/apikey" className="footer-link">API Key &amp; Sandbox</a>
              <a href="/documents" className="footer-link">Dokumentasi API</a>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Informasi &amp; Legal</h4>
              <a href="/about" className="footer-link">Tentang Kami</a>
              <a href="/privacy" className="footer-link">Kebijakan Privasi</a>
              <a href="/terms" className="footer-link">Syarat &amp; Ketentuan</a>
              <a href="/faq" className="footer-link">Tanya Jawab (FAQ)</a>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Tentang Layanan</h4>
              <p className="footer-info-text">
                Dirancang khusus untuk memonitor mutasi transaksi QRIS secara non-kustodian tanpa perantara pihak ketiga.
              </p>
              <div className="footer-status-indicator">
                <span className="status-ping" />
                <span>REST API Gateway v1.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-disclaimer-box">
          <p>
            <strong>Pemberitahuan:</strong> AlternatePay adalah perangkat lunak otomasi mandiri (unofficial) dan tidak berafiliasi, didukung, atau bekerja sama secara resmi dengan PT GoTo Gojek Tokopedia Tbk, GoPay, atau GoBiz. Seluruh risiko operasional ditanggung sepenuhnya oleh pengguna (at your own risk).
          </p>
        </div>

        <div className="footer-bottom">
          <p className="copyright">
            &copy; {yearLabel} AlternatePay. Seluruh hak cipta dilindungi undang-undang.
          </p>
          <div className="footer-bottom-links">
            <a href="/terms">Syarat Ketentuan</a>
            <span className="footer-bottom-dot">&bull;</span>
            <a href="/privacy">Privasi</a>
            <span className="footer-bottom-dot">&bull;</span>
            <a href="/faq">FAQ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
