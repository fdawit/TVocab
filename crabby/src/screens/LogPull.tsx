import { useEffect, useMemo, useState } from 'react';
import { ChipPicker, Field, PageHeader, SpotBadge, Stepper, Toggle } from '../components/ui';
import { nowLocal } from '../lib/dates';
import { fmtDistance, getPosition, nearestSpot } from '../lib/geo';
import { back, go } from '../lib/router';
import { actions, toast, useData } from '../lib/store';
import type { Pull } from '../lib/types';

/** Within this distance we assume she's at a saved spot. */
const NEAR_METERS = 250;

type Gps = { state: 'idle' | 'looking' | 'error'; msg?: string } | { state: 'found'; lat: number; lng: number; nearId: string | null; meters: number | null };

export function LogPull({ params }: { params: URLSearchParams }) {
  const data = useData();
  const editing = data.pulls.find((p) => p.id === params.get('edit'));

  const [form, setForm] = useState<Omit<Pull, 'id'>>(() =>
    editing
      ? { ...editing }
      : {
          spotId: params.get('spot') ?? '',
          at: nowLocal(),
          keepers: 0,
          trapType: data.settings.lastTrap,
          bait: data.settings.lastBait,
          overnight: false,
          experimental: false,
          notes: '',
        },
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Recently used spots first, so the usual ones are one tap away.
  const spotsByRecent = useMemo(() => {
    const lastUsed = new Map<string, string>();
    for (const p of data.pulls) if ((lastUsed.get(p.spotId) ?? '') < p.at) lastUsed.set(p.spotId, p.at);
    return [...data.spots].sort((a, b) => (lastUsed.get(b.id) ?? b.createdAt).localeCompare(lastUsed.get(a.id) ?? a.createdAt));
  }, [data.spots, data.pulls]);

  const [gps, setGps] = useState<Gps>({ state: 'idle' });
  const locate = async (autoPick: boolean) => {
    setGps({ state: 'looking' });
    try {
      const pos = await getPosition();
      const near = nearestSpot(data.spots, pos.lat, pos.lng);
      const nearId = near && near.meters <= NEAR_METERS ? near.spot.id : null;
      setGps({ state: 'found', lat: pos.lat, lng: pos.lng, nearId, meters: near?.meters ?? null });
      if (autoPick && nearId) setForm((f) => (f.spotId ? f : { ...f, spotId: nearId }));
    } catch (e) {
      setGps({ state: 'error', msg: (e as Error).message });
    }
  };

  useEffect(() => {
    if (!editing && !form.spotId && data.spots.length > 0) void locate(true);
    // Only on first open.
  }, []);

  const chosen = data.spots.find((s) => s.id === form.spotId);
  const nearSpot = gps.state === 'found' ? data.spots.find((s) => s.id === gps.nearId) : undefined;
  const quickSpots = spotsByRecent.slice(0, 6);
  const canSave = !!chosen;

  const save = () => {
    if (!chosen) return;
    if (editing) {
      actions.updatePull(editing.id, form);
      toast('Changes saved ✏️');
      back('logbook');
    } else {
      actions.addPull(form);
      toast(`Logged ${form.keepers} keeper${form.keepers === 1 ? '' : 's'} at #${chosen.number} 🦀`);
      go('');
    }
  };

  if (data.spots.length === 0) {
    return (
      <div className="screen narrow">
        <PageHeader title="Log a pull" />
        <div className="card center">
          <p>First, mark the spot where your traps are.</p>
          <a className="btn btn-primary btn-lg" href="#/spot/new?then=log">
            📍 Mark a spot
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="screen narrow">
      <PageHeader title={editing ? 'Edit pull' : 'Log a pull'} sub={editing ? undefined : 'Quick! Before your hands get cold.'} />

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Where?">
          {gps.state === 'looking' && <div className="gps-note">📡 Finding you…</div>}
          {gps.state === 'found' && gps.nearId && (
            <div className="gps-note ok">
              📍 Looks like you're at <strong>#{nearSpot?.number} {nearSpot?.name}</strong> ({fmtDistance(gps.meters!)} away)
            </div>
          )}
          {gps.state === 'found' && !gps.nearId && (
            <div className="gps-note">
              No saved spot right here{gps.meters !== null && ` (closest is ${fmtDistance(gps.meters)} away)`}.{' '}
              <a href={`#/spot/new?lat=${gps.lat}&lng=${gps.lng}&then=log`}>Mark this spot</a>
            </div>
          )}
          {gps.state === 'error' && (
            <div className="gps-note">
              {gps.msg}{' '}
              <button type="button" className="linklike" onClick={() => locate(true)}>
                Try again
              </button>
            </div>
          )}
          <div className="spot-grid">
            {quickSpots.map((s) => (
              <button type="button" key={s.id} className={`spot-choice ${form.spotId === s.id ? 'on' : ''}`} onClick={() => set('spotId', s.id)} aria-pressed={form.spotId === s.id}>
                <SpotBadge number={s.number} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          {data.spots.length > quickSpots.length && (
            <select className="input" value={form.spotId} onChange={(e) => set('spotId', e.target.value)} aria-label="All spots">
              <option value="">All spots…</option>
              {[...data.spots]
                .sort((a, b) => a.number - b.number)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.number} {s.name}
                  </option>
                ))}
            </select>
          )}
        </Field>

        <Field label="Keepers">
          <Stepper value={form.keepers} onChange={(v) => set('keepers', v)} />
        </Field>

        <Field label="Trap">
          <ChipPicker options={data.settings.trapTypes} value={form.trapType} onChange={(v) => set('trapType', v)} addLabel="+ other trap" />
        </Field>

        <Field label="Bait">
          <ChipPicker options={data.settings.baits} value={form.bait} onChange={(v) => set('bait', v)} addLabel="+ other bait" />
        </Field>

        <div className="toggles">
          <Toggle icon="🌙" label="Overnight soak" hint="Left the traps in overnight" checked={form.overnight} onChange={(v) => set('overnight', v)} />
          <Toggle icon="🧪" label="Experimental drop" hint="New spot or trying a new bait" checked={form.experimental} onChange={(v) => set('experimental', v)} />
        </div>

        <Field label="When">
          <input className="input" type="datetime-local" value={form.at} onChange={(e) => set('at', e.target.value)} required />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows={3} placeholder="Tide, weather, anything worth remembering…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="form-actions sticky">
          <button className="btn btn-primary btn-xl" type="submit" disabled={!canSave}>
            {canSave ? (editing ? 'Save changes' : `Save · ${form.keepers} keeper${form.keepers === 1 ? '' : 's'}`) : 'Pick a spot first'}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!confirm('Delete this pull from the logbook?')) return;
                actions.deletePull(editing.id);
                toast('Pull deleted');
                back('logbook');
              }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
