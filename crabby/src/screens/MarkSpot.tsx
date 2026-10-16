import { useEffect, useState } from 'react';
import { PickMap } from '../components/CrabMap';
import { Field, PageHeader } from '../components/ui';
import { fmtDistance, getPosition, nearestSpot } from '../lib/geo';
import { back, go } from '../lib/router';
import { actions, toast, useData } from '../lib/store';

const num = (v: string | null) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

export function MarkSpot({ params, editId }: { params: URLSearchParams; editId?: string }) {
  const data = useData();
  const editing = data.spots.find((s) => s.id === editId);
  const nextNumber = Math.max(0, ...data.spots.map((s) => s.number)) + 1;

  const [name, setName] = useState(editing?.name ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [lat, setLat] = useState<number | null>(editing?.lat ?? num(params.get('lat')));
  const [lng, setLng] = useState<number | null>(editing?.lng ?? num(params.get('lng')));
  const [gps, setGps] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });

  const useGps = async () => {
    setGps({ busy: true, msg: '📡 Getting a GPS fix…' });
    try {
      const p = await getPosition();
      setLat(p.lat);
      setLng(p.lng);
      setGps({ busy: false, msg: `Got it! Accurate to about ${fmtDistance(p.accuracy)}.` });
    } catch (e) {
      setGps({ busy: false, msg: `${(e as Error).message} Tap the map or type the coordinates instead.` });
    }
  };

  useEffect(() => {
    if (!editing && lat === null) void useGps();
    // Only on first open.
  }, []);

  const others = data.spots.filter((s) => s.id !== editId);
  const near = lat !== null && lng !== null ? nearestSpot(others, lat, lng) : null;
  const tooClose = near && near.meters < 40 ? near : null;

  const save = () => {
    if (lat === null || lng === null) return;
    if (editing) {
      actions.updateSpot(editing.id, { name: name.trim() || editing.name, notes, lat, lng });
      toast('Spot updated ✏️');
      back(`spot/${editing.id}`);
      return;
    }
    const spot = actions.addSpot({ name, notes, lat, lng });
    toast(`Spot #${spot.number} saved 📍`);
    if (params.get('then') === 'log') go(`log?spot=${spot.id}`, { replace: true });
    else go(`spot/${spot.id}`, { replace: true });
  };

  return (
    <div className="screen narrow">
      <PageHeader title={editing ? `Edit spot #${editing.number}` : 'Mark a spot'} sub={editing ? undefined : `This will be spot #${nextNumber}.`} />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Location" hint="Tap the map or drag the ★ pin to fine-tune.">
          <button type="button" className="btn btn-sea btn-lg" onClick={useGps} disabled={gps.busy}>
            📡 {gps.busy ? 'Locating…' : 'Use my GPS'}
          </button>
          {gps.msg && <div className="gps-note">{gps.msg}</div>}
          <PickMap
            lat={lat}
            lng={lng}
            others={others}
            onPick={(a, b) => {
              setLat(a);
              setLng(b);
            }}
          />
          <div className="coord-row">
            <label>
              <span>Lat</span>
              <input className="input" inputMode="decimal" value={lat ?? ''} onChange={(e) => setLat(num(e.target.value))} placeholder="47.66" />
            </label>
            <label>
              <span>Lng</span>
              <input className="input" inputMode="decimal" value={lng ?? ''} onChange={(e) => setLng(num(e.target.value))} placeholder="-122.45" />
            </label>
          </div>
          {tooClose && (
            <div className="gps-note warn">
              Heads up: that's only {fmtDistance(tooClose.meters)} from #{tooClose.spot.number} {tooClose.spot.name}.
              {params.get('then') === 'log' && (
                <>
                  {' '}
                  <a href={`#/log?spot=${tooClose.spot.id}`}>Log there instead?</a>
                </>
              )}
            </div>
          )}
        </Field>

        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={editing?.name ?? `Spot ${nextNumber}`} />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows={3} placeholder="Depth, bottom, landmarks, hazards…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="form-actions sticky">
          <button className="btn btn-primary btn-xl" type="submit" disabled={lat === null || lng === null}>
            {lat === null || lng === null ? 'Need a location' : editing ? 'Save spot' : 'Save spot 📍'}
          </button>
        </div>
      </form>
    </div>
  );
}
