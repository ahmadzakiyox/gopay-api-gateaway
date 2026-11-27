import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="foodnoms-footer">
      <div className="container footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/dashboard" className="footer-brand-link">
              <img src="/logo.png" alt="Alternate Pay Logo" className="footer-brand-logo" />
              <span className="footer-brand-text">
                Alternate <b>Pay</b>
              </span>
            </a>
          </div>

          <div className="footer-nav-grid">
            <div className="footer-col">
              <h4 className="col-title">Layanan</h4>
              <a href="/dashboard" className="footer-link">Dashboard</a>
              <a href="/koneksi-merchant" className="footer-link">Koneksi Merchant</a>
              <a href="/apikey" className="footer-link">API Key</a>
              <a href="/documents" className="footer-link">Dokumentasi API</a>
            </div>
            <div className="footer-col">
              <h4 className="col-title">Tentang</h4>
              <a href="/about" className="footer-link">Tentang Kami</a>
              <a href="/terms" className="footer-link">Syarat &amp; Ketentuan</a>
              <a href="/privacy" className="footer-link">Kebijakan Privasi</a>
              <a href="/faq" className="footer-link">Tanya Jawab (FAQ)</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">&copy; 2026 AlternatePay. Hak cipta dilindungi undang-undang.</p>
        </div>
      </div>
    </footer>
  );
}
