import { useState, useRef, useEffect } from 'react';
import { LogOut, Activity, WalletCards } from 'lucide-react';
import './Header.css';

export function Header({ onLogout, managementMode = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await onLogout();
  };

  return (
    <>
      <aside className="workspace-nav header-nav">
        <a className="brand" href="/dashboard">
          <img src="/logo.png" alt="Alternate Pay Logo" className="brand-logo" />
          <span className="brand-text">
            Alternate
            <br />
            <b>Pay</b>
          </span>
        </a>
        <nav className="nav-desktop">
          <a href="/dashboard" className={!managementMode ? 'nav-link active' : 'nav-link'}>
            <Activity size={17} />
            Dashboard
          </a>
          <a href="/gpy-manager" className={managementMode ? 'nav-link active' : 'nav-link'}>
            <WalletCards size={17} />
            GoPay Management
          </a>
        </nav>
        <button ref={buttonRef} className={`hamburger-btn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
          <div className="hamburger-icon">
            <span className="bar bar1"></span>
            <span className="bar bar2"></span>
            <span className="bar bar3"></span>
          </div>
        </button>
        <div className="side-bottom">
          <button className="logout" onClick={onLogout}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>
      {menuOpen && <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <div ref={menuRef} className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/dashboard" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <Activity size={20} />
          <span>Dashboard</span>
        </a>
        <a href="/gpy-manager" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <WalletCards size={20} />
          <span>GoPay Management</span>
        </a>
        <button className="mobile-menu-item logout-item" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
