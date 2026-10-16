import { useMemo } from 'react';
import { Crab } from '../components/Crab';
import { PullCard } from '../components/PullCard';
import { PageHeader, SpotBadge, StatusPill } from '../components/ui';
import { fmtAgo, fmtDay, monthRange, nowLocal, parseLocal } from '../lib/dates';
import { fmtCoord } from '../lib/geo';
import { changeLog, pullsBySpot, spotStatus, summarize } from '../lib/insights';
import { go } from '../lib/router';
import { actions, toast, useData } from '../lib/store';

export function SpotDetail({ id }: { id: string }) {
  const data = useData();
  const spot = data.spots.find((s) => s.id === id);
  const pulls = useMemo(() => pullsBySpot(data.pulls).get(id) ?? [], [data.pulls, id]);

  if (!spot) {
    return (
      <div className="screen narrow">
        <div className="card center">
          <Crab size={80} mood="wow" />
          <p>That spot isn't in the notebook anymore.</p>
          <a className="btn" href="#/map">
            Back to the map
          </a>
        </div>
      </div>
    );
  }

  const status = spotStatus(spot, pulls, data.settings);
  const sum = summarize(pulls);
  const months = new Set(data.settings.earlySeasonMonths);
  const early = summarize(pulls.filter((p) => months.has(parseLocal(p.at).getMonth() + 1)));
  const events = changeLog({ ...data, spots: [spot] }).slice(0, 6);
  const manualActive = (status.kind === 'resting' || status.kind === 'ready') && status.manual;

  return (
    <div className="screen narrow">
      <PageHeader
        title={
          <span className="title-with-badge">
            <SpotBadge number={spot.number} kind={status.kind} size="lg" /> {spot.name}
          </span>
        }
        sub={`${fmtCoord(spot.lat, spot.lng)} · saved ${fmtDay(spot.createdAt)}`}
      />

      <div className={`card status-card st-${status.kind}`}>
        <Crab size={56} mood={status.kind === 'resting' ? 'sleepy' : status.kind === 'ready' ? 'wow' : 'happy'} />
        <div>
          <StatusPill status={status} />
          <p>{status.detail}</p>
          {status.kind === 'resting' && (
            <div className="progress" aria-label="Rest progress">
              <span style={{ width: `${Math.round(status.progress * 100)}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="action-row">
        <a className="btn btn-primary btn-lg" href={`#/log?spot=${spot.id}`}>
          🦀 Log pull here
        </a>
        <a className="btn btn-lg" href={`#/map?spot=${spot.id}`}>
          🗺️ Map
        </a>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{sum.count}</strong>
          <small>pulls</small>
        </div>
        <div className="stat">
          <strong>{sum.keepers}</strong>
          <small>keepers</small>
        </div>
        <div className="stat">
          <strong>{sum.avg.toFixed(1)}</strong>
          <small>avg per pull</small>
        </div>
      </div>

      <div className="card facts">
        <div>
          <span>Last pulled</span>
          <strong>{sum.last ? `${fmtAgo(sum.last.at)} (${sum.last.keepers})` : '—'}</strong>
        </div>
        <div>
          <span>Best bait here</span>
          <strong>{sum.bestBait ?? 'Need more pulls'}</strong>
        </div>
        <div>
          <span>Best trap here</span>
          <strong>{sum.bestTrap ?? 'Need more pulls'}</strong>
        </div>
        <div>
          <span>Early season ({monthRange(data.settings.earlySeasonMonths)})</span>
          <strong>{early.count ? `avg ${early.avg.toFixed(1)} over ${early.count} pulls` : 'No pulls yet'}</strong>
        </div>
      </div>

      {spot.notes && <div className="card notes-card">📝 {spot.notes}</div>}

      {events.length > 0 && (
        <section>
          <h2>Change log</h2>
          <ul className="timeline">
            {events.map((e, i) => (
              <li key={i} className={`ev ev-${e.kind}`}>
                <span className="ev-date">{fmtDay(e.at)}</span>
                {e.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>History</h2>
          {pulls.length > 0 && <a href={`#/logbook?spot=${spot.id}`}>Search ›</a>}
        </div>
        {pulls.length === 0 && <p className="muted">No pulls here yet.</p>}
        <div className="list">
          {[...pulls].reverse().map((p) => (
            <PullCard key={p.id} pull={p} spot={spot} showDate />
          ))}
        </div>
      </section>

      <div className="danger-zone">
        <a className="btn" href={`#/spot/${spot.id}/edit`}>
          ✏️ Edit spot
        </a>
        {manualActive ? (
          <button className="btn" onClick={() => actions.updateSpot(spot.id, { crabbedOutAt: null })}>
            ↩️ Undo “crabbed out”
          </button>
        ) : (
          status.kind !== 'resting' && (
            <button
              className="btn"
              onClick={() => {
                actions.updateSpot(spot.id, { crabbedOutAt: nowLocal() });
                toast(`#${spot.number} is resting now 😴`);
              }}
            >
              😴 Mark crabbed out
            </button>
          )
        )}
        <button
          className="btn btn-danger"
          onClick={() => {
            if (!confirm(`Delete #${spot.number} ${spot.name} and all ${pulls.length} of its pulls? This can't be undone.`)) return;
            actions.deleteSpot(spot.id);
            toast('Spot deleted');
            go('map', { replace: true });
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}
