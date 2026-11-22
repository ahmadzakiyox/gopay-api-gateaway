import './Footer.css';

export function Footer({ note }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <span className="site-footer-brand">
          Alternate <b>Pay</b>
        </span>
        <span className="site-footer-meta">
          <span>SECURE MERCHANT INFRASTRUCTURE</span>
          <span className="site-footer-sep" aria-hidden="true">/</span>
          <span>v1.0 / ID</span>
          <span className="site-footer-sep" aria-hidden="true">/</span>
          <span>{year}</span>
        </span>
      </div>
      {note && <p className="site-footer-note">{note}</p>}
    </footer>
  );
}
