import React from 'react';
import { AlertTriangle, BookOpen, FileText, Info, Shield, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { LoginHeader } from './components/LoginHeader';
import { Footer } from './components/Footer';
import './legal.css';

export function LegalDisclaimerBanner() {
  return (
    <div className="legal-disclaimer-box" role="alert" aria-label="Pemberitahuan Penting dan Disclaimer">
      <div className="legal-disclaimer-badge">
        <AlertTriangle size={15} />
        <span>Pemberitahuan Penting & Disclaimer</span>
      </div>
      <p className="legal-disclaimer-text">
        <strong>PEMBERITAHUAN RESMI: AlternatePay adalah perangkat lunak dan layanan independen (unofficial). AlternatePay TIDAK berafiliasi, didukung, disponsori, atau bermitra secara resmi dalam bentuk apapun dengan PT GoTo Gojek Tokopedia Tbk, GoPay, GoBiz, maupun entitas grup GoTo lainnya.</strong> Seluruh nama merek dagang, logo, dan produk GoPay / GoBiz adalah hak milik sah dari masing-masing pemilik hak cipta. Layanan ini semata-mata bertindak sebagai alat otomasi pencatatan data mandiri. <strong>Segala penggunaan layanan, risiko pemblokiran akun pihak ketiga, kendala teknis, serta risiko finansial ditanggung sepenuhnya oleh pengguna (at your own risk).</strong>
      </p>
    </div>
  );
}

export function LegalLayout({ activeTab, title, subtitle, user, onLogout, children }) {
  const tabs = [
    { key: 'about', label: 'Tentang Kami', href: '/about', icon: Info },
    { key: 'privacy', label: 'Kebijakan Privasi', href: '/privacy', icon: Shield },
    { key: 'terms', label: 'Syarat & Ketentuan', href: '/terms', icon: FileText }
  ];

  const isAuthenticated = Boolean(user && user.id);

  return (
    <div className="page-shell legal-page-shell">
      {isAuthenticated ? (
        <Header user={user} onLogout={onLogout} />
      ) : (
        <LoginHeader />
      )}

      <main className="legal-shell">
        <div className="legal-container">
          <nav className="legal-tabs" aria-label="Menu Legal">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <a
                  key={tab.key}
                  href={tab.href}
                  className={`legal-tab ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </a>
              );
            })}
          </nav>

          <header className="legal-header">
            <span className="legal-eyebrow">Dokumen Hukum & Informasi</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>

          <LegalDisclaimerBanner />

          <article className="legal-card">
            {children}

            <div className="legal-meta-footer">
              <span>Terakhir diperbarui: 24 November 2026</span>
              <a href="/dashboard">Kembali ke Dashboard &rarr;</a>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
