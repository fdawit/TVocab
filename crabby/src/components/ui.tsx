import type { ReactNode } from 'react';
import type { SpotStatus } from '../lib/insights';

export function Toggle({ label, hint, icon, checked, onChange }: { label: string; hint?: string; icon: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`toggle ${checked ? 'on' : ''}`}>
      <span className="toggle-icon" aria-hidden>{icon}</span>
      <span className="toggle-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
    </label>
  );
}

/** Pick one of a list of chips, or type a new value. */
export function ChipPicker({ options, value, onChange, addLabel }: { options: string[]; value: string; onChange: (v: string) => void; addLabel: string }) {
  const custom = value && !options.some((o) => o.toLowerCase() === value.toLowerCase());
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip ${o === value ? 'on' : ''}`} onClick={() => onChange(o)} aria-pressed={o === value}>
          {o}
        </button>
      ))}
      <input
        className={`chip chip-input ${custom ? 'on' : ''}`}
        placeholder={addLabel}
        value={custom ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={addLabel}
      />
    </div>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" className="step-btn" onClick={() => onChange(Math.max(0, value - 1))} aria-label="One fewer">
        −
      </button>
      <input
        className="step-value"
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        aria-label="Keepers"
      />
      <button type="button" className="step-btn plus" onClick={() => onChange(value + 1)} aria-label="One more">
        +
      </button>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

const STATUS_ICON: Record<SpotStatus['kind'], string> = { new: '✨', fresh: '🦀', busy: '⚠️', resting: '😴', ready: '🌱' };

export function StatusPill({ status }: { status: SpotStatus }) {
  return (
    <span className={`pill pill-${status.kind}`}>
      <span aria-hidden>{STATUS_ICON[status.kind]}</span> {status.label}
    </span>
  );
}

export function SpotBadge({ number, kind = 'fresh', size = 'md' }: { number: number; kind?: SpotStatus['kind']; size?: 'md' | 'lg' }) {
  return <span className={`spot-badge s-${kind} ${size}`}>{number}</span>;
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
