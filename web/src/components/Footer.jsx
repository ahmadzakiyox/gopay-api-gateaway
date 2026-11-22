import './Footer.css';

const columns = [
  {
    title: 'Workspace',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Transaksi', href: '/dashboard#transaction-log' },
      { label: 'GoPay Management', href: '/gpy-manager' },
    ],
  },
  {
    title: 'Gateway',
    links: [
      { label: 'Koneksi GoPay', href: '/gpy-manager#connection' },
      { label: 'API Key', href: '/gpy-manager#api-key' },
      { label: 'QRIS', href: '/gpy-manager#qris' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Owner', href: 'https://t.me/ahmadzakiyo', external: true },
      { label: 'Channel update', href: 'https://t.me/nuxysproject', external: true },
      {
        label: 'Status API',
        href: 'https://api-qris.alternat.my.id/api/health',
        external: true,
      },
    ],
  },
];

const trustFacts = [
  'Sesi merchant terenkripsi di server',
  'OTP tidak pernah disimpan di browser',
  'Satu API key personal per pengguna',
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-head">
        <a href="/dashboard" className="site-footer-brand">
          <img src="/logo.png" alt="" aria-hidden="true" className="site-footer-logo" />
          <span className="site-footer-wordmark">
            Alternate <b>Pay</b>
          </span>
        </a>
        <span className="site-footer-status">
          <span className="site-footer-pulse" aria-hidden="true" />
          Gateway operational
        </span>
      </div>

      <p className="site-footer-tagline">
        Payment gateway untuk merchant: koneksi GoPay, QRIS dinamis, dan API
        integrasi dari satu workspace.
      </p>

      <div className="site-footer-cols">
        {columns.map((column) => (
          <div className="site-footer-col" key={column.title}>
            <p className="site-footer-col-title">{column.title}</p>
            <ul className="site-footer-links">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...(link.external
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    {link.label}
                    {link.external && (
                      <span className="site-footer-ext" aria-hidden="true">↗</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ul className="site-footer-trust">
        {trustFacts.map((fact) => (
          <li key={fact}>
            <span className="site-footer-dot" aria-hidden="true" />
            {fact}
          </li>
        ))}
      </ul>

      <div className="site-footer-bottom">
        <span className="site-footer-legal">
          &copy; {year} Alternate Pay. Seluruh hak dilindungi.
        </span>
        <span className="site-footer-meta">
          <span>Indonesia</span>
          <span className="site-footer-sep" aria-hidden="true">/</span>
          <span>v1.0</span>
        </span>
      </div>
    </footer>
  );
}
