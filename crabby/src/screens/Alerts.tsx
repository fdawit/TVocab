import { useMemo } from 'react';
import { Crab } from '../components/Crab';
import { PageHeader, SpotBadge, StatusPill } from '../components/ui';
import { fmtDay } from '../lib/dates';
import { changeLog, statusMap, type SpotStatus } from '../lib/insights';
import { useData } from '../lib/store';
import type { Spot } from '../lib/types';

const ICON: Record<string, string> = { 'crabbed-out': '🪫', flagged: '😴', rested: '🌱', returned: '🦀' };

export function Alerts() {
  const data = useData();
  const statuses = useMemo(() => statusMap(data), [data]);
  const log = useMemo(() => changeLog(data), [data]);
  const spotsById = useMemo(() => new Map(data.spots.map((s) => [s.id, s])), [data.spots]);

  const withStatus = (kind: SpotStatus['kind']) =>
    data.spots.flatMap((spot) => {
      const status = statuses.get(spot.id)!;
      return status.kind === kind ? [{ spot, status }] : [];
    });
  const ready = withStatus('ready');
  const resting = withStatus('resting').sort((a, b) => (a.status.kind === 'resting' && b.status.kind === 'resting' ? a.status.daysLeft - b.status.daysLeft : 0));
  const busy = withStatus('busy');
  const s = data.settings;

  const row = ({ spot, status }: { spot: Spot; status: SpotStatus }) => (
    <a key={spot.id} className="card alert-row" href={`#/spot/${spot.id}`}>
      <SpotBadge number={spot.number} kind={status.kind} />
      <div>
        <strong>{spot.name}</strong>
        <p>{status.detail}</p>
        {status.kind === 'resting' && (
          <div className="progress">
            <span style={{ width: `${Math.round(status.progress * 100)}%` }} />
          </div>
        )}
      </div>
      <StatusPill status={status} />
    </a>
  );

  return (
    <div className="screen narrow">
      <PageHeader title="Alerts" sub="Which spots need a break, and which have bounced back." />

      {ready.length + resting.length + busy.length === 0 && (
        <div className="card center">
          <Crab size={80} />
          <p>All your spots look healthy. Nothing to worry about!</p>
        </div>
      )}

      {ready.length > 0 && (
        <section>
          <h2>🌱 Rested &amp; ready</h2>
          <div className="list">{ready.map(row)}</div>
        </section>
      )}
      {busy.length > 0 && (
        <section>
          <h2>⚠️ Fished a lot lately</h2>
          <div className="list">{busy.map(row)}</div>
        </section>
      )}
      {resting.length > 0 && (
        <section>
          <h2>😴 Resting</h2>
          <div className="list">{resting.map(row)}</div>
        </section>
      )}

      <section>
        <h2>📜 Change log</h2>
        {log.length === 0 ? (
          <p className="muted">Nothing yet. Changes show up here as your spots get busy, crabbed out, or rested.</p>
        ) : (
          <ul className="timeline">
            {log.slice(0, 40).map((e, i) => {
              const spot = spotsById.get(e.spotId);
              return (
                <li key={i} className={`ev ev-${e.kind}`}>
                  <span className="ev-date">
                    {ICON[e.kind]} {fmtDay(e.at)}
                  </span>
                  <a href={`#/spot/${e.spotId}`}>
                    <strong>
                      #{spot?.number} {spot?.name}
                    </strong>
                  </a>{' '}
                  {e.text}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="muted small rule">
        How Crabby decides: {s.heavyPulls}+ pulls within {s.heavyWindowDays} days is “fished a lot”. If the catch then falls to half its best, the spot is
        “crabbed out” and rests for {s.restDays} days. You can also mark a spot crabbed out yourself. <a href="#/settings">Adjust these</a>
      </p>
    </div>
  );
}
