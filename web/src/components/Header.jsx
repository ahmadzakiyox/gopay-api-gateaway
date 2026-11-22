import { LogOut, Activity, WalletCards } from 'lucide-react';
import './Header.css';

export function Header({ onLogout, managementMode = false }) {
  return (
    <aside className="workspace-nav header-nav">
      <a className="brand" href="/dashboard">
        <img src="/logo.png" alt="Alternate Pay Logo" className="brand-logo" />
        <span className="brand-text">
          Alternate
          <br />
          <b>Pay</b>
        </span>
      </a>
      <nav>
        <a href="/dashboard" className={!managementMode ? 'active' : ''}>
          <Activity size={17} />
          Dashboard
        </a>
        <a href="/gpy-manager" className={managementMode ? 'active' : ''}>
          <WalletCards size={17} />
          GoPay Management
        </a>
      </nav>
      <div className="side-bottom">
        <button className="logout" onClick={onLogout}>
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
