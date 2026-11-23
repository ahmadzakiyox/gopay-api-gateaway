import { useState, useRef, useEffect } from 'react';
import { LogOut, Activity, WalletCards, KeyRound, FileText } from 'lucide-react';
import './Header.css';

export function Header({ onLogout, managementMode = false, user = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(user);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfile(user);
      return;
    }
    // Fetch user info if not passed directly
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setProfile(data.user);
        }
      })
      .catch(() => {});
  }, [user]);

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

  const avatarLetter = (profile?.first_name || profile?.username || 'U').slice(0, 1).toUpperCase();
  const displayName = profile?.username ? `@${profile.username}` : (profile?.first_name || 'Personal workspace');

  return (
    <>
      <aside className="workspace-nav header-nav">
        <a className="brand" href="/dashboard">
          <img src="/logo.png" alt="Alternate Pay Logo" className="brand-logo" />
          <span className="brand-text">
            Alternate <b>Pay</b>
          </span>
        </a>
        <button ref={buttonRef} className={`hamburger-btn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
          <div className="hamburger-icon">
            <span className="bar bar1"></span>
            <span className="bar bar2"></span>
            <span className="bar bar3"></span>
          </div>
        </button>
        <div className="side-bottom">
          <div className="nav-profile-section">
            <span className="nav-profile-avatar">{avatarLetter}</span>
            <div className="nav-profile-info">
              <span className="nav-profile-name">{displayName}</span>
              <span className="nav-profile-sub">Workspace</span>
            </div>
          </div>
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
        <a href="/apikey" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <KeyRound size={20} />
          <span>Api Key</span>
        </a>
        <a href="/documents" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <FileText size={20} />
          <span>Doc</span>
        </a>
        <div className="mobile-menu-profile">
          <span className="nav-profile-avatar">{avatarLetter}</span>
          <div className="nav-profile-info">
            <span className="nav-profile-name">{displayName}</span>
            <span className="nav-profile-sub">Personal workspace</span>
          </div>
        </div>
        <button className="mobile-menu-item logout-item" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
