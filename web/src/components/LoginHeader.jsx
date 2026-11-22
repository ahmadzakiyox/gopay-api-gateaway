import './Header.css';

export function LoginHeader() {
  return (
    <header className="login-header">
      <a href="/" className="login-brand">
        <img src="/logo.png" alt="Alternate Pay" className="login-logo" />
        <span className="brand-text">Alternate <b>Pay</b></span>
      </a>
    </header>
  );
}
