import { useMemo } from 'react';
import { Crab } from '../components/Crab';
import { PullCard } from '../components/PullCard';
import { dayKey, fmtAgo, fmtDay, parseLocal } from '../lib/dates';
import { statusMap } from '../lib/insights';
import { sampleData } from '../lib/sample';
import { actions, toast, useData } from '../lib/store';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up early, captain!';
  if (h < 12) return 'Good morning, captain!';
  if (h < 17) return 'Ahoy there!';
  return 'Planning tomorrow?';
}

export function Home() {
  const data = useData();
  const spotsById = useMemo(() => new Map(data.spots.map((s) => [s.id, s])), [data.spots]);
  const statuses = useMemo(() => statusMap(data), [data]);
  const recent = useMemo(() => [...data.pulls].sort((a, b) => b.at.localeCompare(a.at)), [data.pulls]);

  const year = new Date().getFullYear();
  const season = recent.filter((p) => parseLocal(p.at).getFullYear() === year);
  const seasonKeepers = season.reduce((a, p) => a + p.keepers, 0);
  const lastDay = recent[0] ? recent.filter((p) => dayKey(p.at) === dayKey(recent[0].at)) : [];

  const ready = data.spots.filter((s) => statuses.get(s.id)?.kind === 'ready');
  const busy = data.spots.filter((s) => statuses.get(s.id)?.kind === 'busy');
  const resting = data.spots.filter((s) => statuses.get(s.id)?.kind === 'resting');

  if (data.spots.length === 0) {
    return (
      <div className="screen">
        <div className="empty-hero card">
          <Crab size={120} mood="wow" />
          <h1>Hi, I'm Crabby!</h1>
          <p>Your crabbing notebook that never gets soggy. Mark your favorite spots, log every pull, and I'll help you spot the patterns.</p>
          <div className="stack">
            <a className="btn btn-primary btn-lg" href="#/spot/new">
              📍 Mark my first spot
            </a>
            <button
              className="btn btn-lg"
              onClick={() => {
                actions.replaceAll(sampleData());
                toast('Sample notebook loaded 🦀');
              }}
            >
              👀 Explore with sample data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="home-hero">
        <Crab size={76} />
        <div>
          <h1>{greeting()}</h1>
          <p className="sub">{recent[0] ? `Last out ${fmtAgo(recent[0].at)}.` : 'No pulls logged yet.'}</p>
        </div>
        <a className="home-gear" href="#/settings" aria-label="Settings">
          ⚙️
        </a>
      </header>

      <div className="quick-actions">
        <a className="btn btn-primary btn-xl" href="#/log">
          <span className="btn-emoji">🦀</span> Log a pull
        </a>
        <a className="btn btn-sea btn-xl" href="#/spot/new">
          <span className="btn-emoji">📍</span> Mark a spot
        </a>
      </div>

      {(ready.length > 0 || busy.length > 0 || resting.length > 0) && (
        <a className="card alert-card" href="#/alerts">
          <div className="alert-card-icon">{ready.length ? '🌱' : busy.length ? '⚠️' : '😴'}</div>
          <div>
            {ready.length > 0 && (
              <p>
                <strong>{ready.map((s) => `#${s.number} ${s.name}`).join(', ')}</strong> {ready.length === 1 ? 'has' : 'have'} rested up — worth another try!
              </p>
            )}
            {busy.length > 0 && (
              <p>
                <strong>{busy.map((s) => `#${s.number}`).join(', ')}</strong> {busy.length === 1 ? 'has' : 'have'} been fished a lot lately.
              </p>
            )}
            {resting.length > 0 && (
              <p>
                {resting.length} spot{resting.length === 1 ? ' is' : 's are'} resting.
              </p>
            )}
          </div>
          <span className="chev" aria-hidden>›</span>
        </a>
      )}

      <div className="stats">
        <div className="stat">
          <strong>{seasonKeepers}</strong>
          <small>keepers in {year}</small>
        </div>
        <div className="stat">
          <strong>{season.length}</strong>
          <small>pulls in {year}</small>
        </div>
        <div className="stat">
          <strong>{data.spots.length}</strong>
          <small>saved spots</small>
        </div>
      </div>

      {lastDay.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Last time out</h2>
            <span className="muted">{fmtDay(lastDay[0].at)}</span>
          </div>
          <div className="list">
            {lastDay.map((p) => (
              <PullCard key={p.id} pull={p} spot={spotsById.get(p.spotId)} />
            ))}
          </div>
          <a className="link-more" href="#/logbook">
            Open the whole logbook ›
          </a>
        </section>
      )}
    </div>
  );
}
