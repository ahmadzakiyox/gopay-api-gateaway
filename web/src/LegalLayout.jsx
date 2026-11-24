import React from 'react';
import { AlertTriangle, FileText, Info, Shield } from 'lucide-react';
import { Header } from './components/Header';
import { LoginHeader } from './components/LoginHeader';
import { Footer } from './components/Footer';
import './legal.css';

export function LegalDisclaimerBanner() {
  return (
    <div className="legal-disclaimer-card" role="alert" aria-label="Pemberitahuan Penting dan Disclaimer">
      <div className="legal-disclaimer-head">
        <AlertTriangle size={17} />
        <span>PEMBERITAHUAN PENTING & DISCLAIMER RESMI</span>
      </div>
      <p className="legal-disclaimer-body">
        <strong>AlternatePay adalah perangkat lunak dan layanan independen (unofficial). AlternatePay TIDAK berafiliasi, didukung, disponsori, atau bermitra secara resmi dalam bentuk apapun dengan PT GoTo Gojek Tokopedia Tbk, GoPay, GoBiz, maupun entitas grup GoTo lainnya.</strong> Seluruh nama merek dagang, logo, dan produk GoPay / GoBiz adalah hak milik sah dari masing-masing pemilik hak cipta. Layanan ini semata-mata bertindak sebagai alat otomasi pencatatan data mandiri. <strong>Segala penggunaan layanan, risiko pemblokiran akun pihak ketiga, kendala teknis, serta risiko finansial ditanggung sepenuhnya oleh pengguna (at your own risk).</strong>
      </p>
    </div>
  );
}

export function LegalLayout({ activeTab, title, tagline, date, user, onLogout, children }) {
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

      <main className="legal-page">
        <div className="legal-container">
          <div className="legal-nav-wrapper">
            <nav className="legal-tabs-pill" aria-label="Menu Legal">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <a
                    key={tab.key}
                    href={tab.href}
                    className={`legal-tab-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="legal-header">
            <h1>{title}</h1>
            {tagline && <p className="tagline">{tagline}</p>}
            {date && <p className="date">{date}</p>}
          </div>

          <LegalDisclaimerBanner />

          <div className="legal-content-card">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
