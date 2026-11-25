import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import './Header.css';

export function LoginHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="login-header">
        <div className="login-header-inner">
          <a href="/" className="login-brand">
            <img src="/logo.png" alt="Alternate Pay" className="login-logo" />
            <span className="brand-text">Alternate <b>Pay</b></span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="login-nav-desktop">
            <a href="/#keunggulan" className="login-nav-link">Keunggulan</a>
            <a href="/#fitur" className="login-nav-link">Fitur</a>
            <a href="/#cara-kerja" className="login-nav-link">Cara Kerja</a>
            <a href="/faq" className="login-nav-link">FAQ</a>
            <a href="/about" className="login-nav-link">Tentang</a>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button 
            type="button" 
            className="login-mobile-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="login-mobile-drawer">
          <a href="/#keunggulan" className="drawer-nav-link" onClick={() => setMobileMenuOpen(false)}>Keunggulan</a>
          <a href="/#fitur" className="drawer-nav-link" onClick={() => setMobileMenuOpen(false)}>Fitur</a>
          <a href="/#cara-kerja" className="drawer-nav-link" onClick={() => setMobileMenuOpen(false)}>Cara Kerja</a>
          <a href="/faq" className="drawer-nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <a href="/about" className="drawer-nav-link" onClick={() => setMobileMenuOpen(false)}>Tentang</a>
        </div>
      )}
    </>
  );
}
