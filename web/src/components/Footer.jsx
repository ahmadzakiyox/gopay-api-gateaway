import './Footer.css';

const workspaceLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'GoPay Management', href: '/gpy-manager' },
];

const securityFacts = [
  'Session merchant terenkripsi di server',
  'OTP tidak pernah disimpan di browser',
  'Satu API key personal per pengguna',
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand-col">
          <a href="/dashboard" className="site-footer-brand">
            <img src="/logo.png" alt="" aria-hidden="true" className="site-footer-logo" />
            <span className="site-footer-wordmark">
              Alternate <b>Pay</b>
            </span>
          </a>
          <p className="site-footer-tagline">
            Payment gateway untuk merchant: koneksi GoPay, QRIS dinamis, dan API
            integrasi dari satu workspace.
          </p>
        </div>

        <div className="site-footer-col">
          <p className="site-footer-col-title">Workspace</p>
          <ul className="site-footer-links">
            {workspaceLinks.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col">
          <p className="site-footer-col-title">Keamanan</p>
          <ul className="site-footer-facts">
            {securityFacts.map((fact) => (
              <li key={fact}>
                <span className="site-footer-dot" aria-hidden="true" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span className="site-footer-legal">
          &copy; {year} Alternate Pay. Seluruh hak dilindungi.
        </span>
        <span className="site-footer-meta">
          <span>Secure merchant infrastructure</span>
          <span className="site-footer-sep" aria-hidden="true">/</span>
          <span>v1.0</span>
          <span className="site-footer-sep" aria-hidden="true">/</span>
          <span>ID</span>
        </span>
      </div>
    </footer>
  );
}
