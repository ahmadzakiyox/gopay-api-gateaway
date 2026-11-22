import './Footer.css';

const START_YEAR = 2026;

export function Footer() {
  const currentYear = new Date().getFullYear();
  const yearLabel =
    currentYear > START_YEAR ? `${START_YEAR} - ${currentYear}` : `${START_YEAR}`;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src="/logo.png" alt="" aria-hidden="true" className="site-footer-logo" />
          <span className="site-footer-wordmark">
            Alternate <b>Pay</b>
          </span>
        </div>

        <p className="site-footer-tagline">
          Alternatif Payment gateway menggunakan QRIS GoPay merchant.
        </p>

        <hr className="site-footer-rule" />

        <p className="site-footer-legal">
          &copy;{yearLabel} ALTERNATE PAY All rights reserved
        </p>
      </div>
    </footer>
  );
}
