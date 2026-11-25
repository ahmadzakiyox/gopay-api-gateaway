import { useState, useRef, useEffect } from 'react';
import { FileCode2, HelpCircle, Shield, FileCheck } from 'lucide-react';
import './Header.css';

export function LoginHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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
            <a href="/faq" className="login-nav-link">FAQ</a>
            <a href="/privacy" className="login-nav-link">Kebijakan Privasi</a>
            <a href="/terms" className="login-nav-link">Syarat & Ketentuan</a>
            <a href="/documents" className="login-nav-link">Dokumentasi API</a>
          </nav>

          {/* Mobile Hamburger Toggle (Same as Dashboard) */}
          <button 
            ref={buttonRef} 
            className={`hamburger-btn login-hamburger-btn ${menuOpen ? 'open' : ''}`} 
            onClick={() => setMenuOpen(!menuOpen)} 
            aria-label="Menu" 
            aria-expanded={menuOpen}
          >
            <div className="hamburger-icon">
              <span className="bar bar1"></span>
              <span className="bar bar2"></span>
              <span className="bar bar3"></span>
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Same style and animation as Dashboard) */}
      {menuOpen && <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <div ref={menuRef} className={`mobile-menu login-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/faq" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <HelpCircle size={18} />
          <span>FAQ</span>
        </a>
        <a href="/privacy" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <Shield size={18} />
          <span>Kebijakan Privasi</span>
        </a>
        <a href="/terms" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <FileCheck size={18} />
          <span>Syarat & Ketentuan</span>
        </a>
        <a href="/documents" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <FileCode2 size={18} />
          <span>Dokumentasi API</span>
        </a>
      </div>
    </>
  );
}
