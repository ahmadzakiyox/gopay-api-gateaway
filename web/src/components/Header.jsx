import { useState, useRef, useEffect } from 'react';
import { LogOut, Activity, WalletCards, KeyRound, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './Header.css';

export function Header({ onLogout, managementMode = false, user = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ap_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [profile, setProfile] = useState(user);
  const [imgFailed, setImgFailed] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('desktop-sidebar-collapsed', sidebarCollapsed);
    try {
      localStorage.setItem('ap_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (user) {
      setProfile(user);
      setImgFailed(false);
      return;
    }
    // Fetch user info if not passed directly
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3100' : 'https://api-qris.alternat.my.id';
    fetch(`${apiBase}/api/auth/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setProfile(data.user);
          setImgFailed(false);
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

  const avatarLetter = (profile?.firstName || profile?.first_name || profile?.username || 'U').slice(0, 1).toUpperCase();
  const displayName = profile?.username ? `@${profile.username}` : (profile?.firstName || profile?.first_name || 'Personal workspace');
  const photoUrl = !imgFailed ? (profile?.photoUrl || profile?.photo_url || '') : '';
  const avatarNode = photoUrl ? (
    <img
      src={photoUrl}
      alt={displayName}
      className="nav-profile-avatar nav-profile-avatar-img"
      onError={() => setImgFailed(true)}
    />
  ) : (
    <span className="nav-profile-avatar">{avatarLetter}</span>
  );

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Activity, active: path === '/dashboard' || path === '/' },
    { href: '/koneksi-merchant', label: 'Koneksi Merchant', icon: WalletCards, active: path.startsWith('/koneksi-merchant') },
    { href: '/apikey', label: 'Api Key', icon: KeyRound, active: path.startsWith('/apikey') || path.startsWith('/api-key') },
    { href: '/documents', label: 'Doc', icon: FileText, active: path.startsWith('/documents') }
  ];
  const headerLinks = [
    { href: '/faq', label: 'FAQ', active: path.startsWith('/faq') },
    { href: '/privacy', label: 'Kebijakan Privasi', active: path.startsWith('/privacy') },
    { href: '/terms', label: 'Syarat & Ketentuan', active: path.startsWith('/terms') },
    { href: '/about', label: 'Tentang Kami', active: path.startsWith('/about') || path.startsWith('/tentang-kami') }
  ];

  return (
    <>
      <header className="desktop-top-header">
        <a className="desktop-top-brand" href="/dashboard">
          <img src="/logo.png" alt="Alternate Pay Logo" className="brand-logo" />
          <span className="brand-text">
            Alternate <b>Pay</b>
          </span>
        </a>
        <nav className="desktop-top-links" aria-label="Informasi dan legal">
          {headerLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`desktop-top-link${item.active ? ' active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <aside className={`workspace-nav header-nav${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <a className="brand" href="/dashboard">
          <img src="/logo.png" alt="Alternate Pay Logo" className="brand-logo" />
          <span className="brand-text">
            Alternate <b>Pay</b>
          </span>
        </a>
        <div className="desktop-sidebar-top">
          <span className="desktop-sidebar-label">WORKSPACE</span>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            title={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`desktop-nav-link${item.active ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span className="desktop-nav-text">{item.label}</span>
              </a>
            );
          })}
        </nav>
        <button ref={buttonRef} className={`hamburger-btn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
          <div className="hamburger-icon">
            <span className="bar bar1"></span>
            <span className="bar bar2"></span>
            <span className="bar bar3"></span>
          </div>
        </button>
        <div className="side-bottom">
          <div className="nav-profile-section" title={displayName}>
            {avatarNode}
            <div className="nav-profile-info">
              <span className="nav-profile-name">{displayName}</span>
              <span className="nav-profile-sub">Workspace</span>
            </div>
          </div>
          <button className="logout" onClick={onLogout} title="Keluar" aria-label="Keluar">
            <LogOut size={16} />
            <span className="logout-text">Keluar</span>
          </button>
        </div>
      </aside>
      {menuOpen && <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <div ref={menuRef} className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-profile">
          {avatarNode}
          <div className="nav-profile-info">
            <span className="nav-profile-name">{displayName}</span>
          </div>
        </div>
        <a href="/dashboard" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <Activity size={18} />
          <span>Dashboard</span>
        </a>
        <a href="/koneksi-merchant" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <WalletCards size={18} />
          <span>Koneksi Merchant</span>
        </a>
        <a href="/apikey" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <KeyRound size={18} />
          <span>Api Key</span>
        </a>
        <a href="/documents" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
          <FileText size={18} />
          <span>Doc</span>
        </a>
        <button className="mobile-menu-item logout-item" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
