import { Crab } from './Crab';

const ITEMS = [
  { id: 'home', href: '#/', icon: '🏠', label: 'Home' },
  { id: 'map', href: '#/map', icon: '🗺️', label: 'Map' },
  { id: 'log', href: '#/log', icon: '+', label: 'Log pull', big: true },
  { id: 'logbook', href: '#/logbook', icon: '📖', label: 'Logbook' },
  { id: 'alerts', href: '#/alerts', icon: '🔔', label: 'Alerts' },
];

export function Nav({ tab, alertCount }: { tab: string; alertCount: number }) {
  return (
    <nav className="nav" aria-label="Main">
      <a className="nav-brand" href="#/">
        <Crab size={44} />
        <span>Crabby</span>
      </a>
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className={`nav-item ${item.big ? 'nav-big' : ''} ${tab === item.id ? 'active' : ''}`}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden>
            {item.icon}
            {item.id === 'alerts' && alertCount > 0 && <span className="badge">{alertCount}</span>}
          </span>
          <span className="nav-label">{item.label}</span>
        </a>
      ))}
      <a className={`nav-item nav-settings ${tab === 'settings' ? 'active' : ''}`} href="#/settings">
        <span className="nav-icon" aria-hidden>⚙️</span>
        <span className="nav-label">Settings</span>
      </a>
    </nav>
  );
}
