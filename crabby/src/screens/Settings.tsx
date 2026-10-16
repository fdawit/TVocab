import { useRef } from 'react';
import { Field, PageHeader } from '../components/ui';
import { MONTHS, toLocal } from '../lib/dates';
import { isSampleData, sampleData } from '../lib/sample';
import { actions, getData, normalize, toast, useData } from '../lib/store';

function NumberSetting({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <label className="num-setting">
      <span>{label}</span>
      <span className="num-input">
        <input className="input" type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Math.floor(Number(e.target.value) || min))))} />
        {suffix}
      </span>
    </label>
  );
}

function ListSetting({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) {
  return (
    <div className="chips">
      {items.map((v) => (
        <span key={v} className="chip chip-removable">
          {v}
          <button onClick={() => onRemove(v)} aria-label={`Remove ${v}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const data = useData();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `crabby-backup-${toLocal(new Date()).slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (file: File) => {
    try {
      const next = normalize(JSON.parse(await file.text()));
      if (!confirm(`Replace everything with this backup (${next.spots.length} spots, ${next.pulls.length} pulls)?`)) return;
      actions.replaceAll(next);
      toast('Backup restored 🦀');
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="screen narrow">
      <PageHeader title="Settings" />

      <section className="card form">
        <h2>Spot health</h2>
        <NumberSetting label="“Fished a lot” means" value={s.heavyPulls} min={2} max={30} suffix="pulls" onChange={(v) => actions.updateSettings({ heavyPulls: v })} />
        <NumberSetting label="…within" value={s.heavyWindowDays} min={3} max={120} suffix="days" onChange={(v) => actions.updateSettings({ heavyWindowDays: v })} />
        <NumberSetting label="Crabbed-out spots rest for" value={s.restDays} min={7} max={1095} suffix="days" onChange={(v) => actions.updateSettings({ restDays: v })} />
      </section>

      <section className="card form">
        <h2>Early season</h2>
        <Field label="Which months count as early season?">
          <div className="chips months">
            {MONTHS.map((m, i) => {
              const on = s.earlySeasonMonths.includes(i + 1);
              return (
                <button
                  key={m}
                  className={`chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() => actions.updateSettings({ earlySeasonMonths: on ? s.earlySeasonMonths.filter((x) => x !== i + 1) : [...s.earlySeasonMonths, i + 1] })}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </Field>
      </section>

      <section className="card form">
        <h2>Quick-pick lists</h2>
        <p className="muted small">New traps and baits are added automatically when you type them in a log.</p>
        <Field label="Traps">
          <ListSetting items={s.trapTypes} onRemove={(v) => actions.updateSettings({ trapTypes: s.trapTypes.filter((x) => x !== v) })} />
        </Field>
        <Field label="Baits">
          <ListSetting items={s.baits} onRemove={(v) => actions.updateSettings({ baits: s.baits.filter((x) => x !== v) })} />
        </Field>
      </section>

      <section className="card form">
        <h2>Your notebook</h2>
        <p className="muted small">
          Everything is saved on this device. Download a backup now and then so nothing ever gets lost.
        </p>
        <div className="stack">
          <button className="btn btn-sea" onClick={exportBackup}>
            💾 Download backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📂 Restore from backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
          {(data.spots.length === 0 || isSampleData(data)) && (
            <button
              className="btn"
              onClick={() => {
                actions.replaceAll(sampleData());
                toast('Sample notebook loaded 🦀');
              }}
            >
              👀 Load sample data
            </button>
          )}
          <button
            className="btn btn-danger"
            onClick={() => {
              if (!confirm(isSampleData(data) ? 'Clear the sample data and start fresh?' : 'Erase ALL spots and pulls? Download a backup first!')) return;
              actions.eraseAll(isSampleData(data));
              toast('Fresh notebook ✨');
            }}
          >
            {isSampleData(data) ? '✨ Clear sample data' : '🗑️ Erase everything'}
          </button>
        </div>
      </section>
    </div>
  );
}
