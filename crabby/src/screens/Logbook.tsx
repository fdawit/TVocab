import { useMemo, useState } from 'react';
import { PullCard } from '../components/PullCard';
import { PageHeader } from '../components/ui';
import { dayKey, fmtDay, searchableDate } from '../lib/dates';
import { useData } from '../lib/store';

type Filter = 'all' | 'overnight' | 'experimental';

export function Logbook({ params }: { params: URLSearchParams }) {
  const data = useData();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [spotId, setSpotId] = useState(params.get('spot') ?? '');
  const spotsById = useMemo(() => new Map(data.spots.map((s) => [s.id, s])), [data.spots]);

  const days = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = data.pulls
      .filter((p) => (filter === 'overnight' ? p.overnight : filter === 'experimental' ? p.experimental : true))
      .filter((p) => !spotId || p.spotId === spotId)
      .filter((p) => {
        if (!words.length) return true;
        const spot = spotsById.get(p.spotId);
        const hay = [
          spot ? `#${spot.number} ${spot.name}` : '',
          p.trapType,
          p.bait,
          p.notes,
          p.overnight ? 'overnight' : '',
          p.experimental ? 'experimental' : '',
          searchableDate(p.at),
        ]
          .join(' ')
          .toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => b.at.localeCompare(a.at));

    const groups: { key: string; pulls: typeof matches }[] = [];
    for (const p of matches) {
      const key = dayKey(p.at);
      if (groups.at(-1)?.key === key) groups.at(-1)!.pulls.push(p);
      else groups.push({ key, pulls: [p] });
    }
    return groups;
  }, [data.pulls, q, filter, spotId, spotsById]);

  const total = days.reduce((a, d) => a + d.pulls.length, 0);

  return (
    <div className="screen">
      <PageHeader title="Logbook" sub={`${data.pulls.length} pulls written down. No soggy pages!`} />

      <div className="search">
        <span aria-hidden>🔍</span>
        <input type="search" placeholder="Search spots, bait, notes, “june 2025”…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the logbook" />
      </div>
      <div className="chips filter-row">
        {(
          [
            ['all', 'All'],
            ['overnight', '🌙 Overnight'],
            ['experimental', '🧪 Experimental'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>
            {label}
          </button>
        ))}
        <select className="chip chip-select" value={spotId} onChange={(e) => setSpotId(e.target.value)} aria-label="Filter by spot">
          <option value="">📍 Every spot</option>
          {[...data.spots]
            .sort((a, b) => a.number - b.number)
            .map((s) => (
              <option key={s.id} value={s.id}>
                #{s.number} {s.name}
              </option>
            ))}
        </select>
      </div>

      {(q || filter !== 'all' || spotId) && (
        <p className="muted small">
          {total} pull{total === 1 ? '' : 's'} found ·{' '}
          <button
            className="linklike"
            onClick={() => {
              setQ('');
              setFilter('all');
              setSpotId('');
            }}
          >
            clear
          </button>
        </p>
      )}

      {days.length === 0 && <div className="card center">{data.pulls.length ? 'Nothing matches that search.' : 'No pulls logged yet. Go get some crabs! 🦀'}</div>}

      {days.map((day) => {
        const keepers = day.pulls.reduce((a, p) => a + p.keepers, 0);
        return (
          <section key={day.key} className="day">
            <div className="day-head">
              <h2>{fmtDay(day.pulls[0].at)}</h2>
              <span className="day-total">
                {keepers} 🦀 · {day.pulls.length} pull{day.pulls.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="list">
              {day.pulls.map((p) => (
                <PullCard key={p.id} pull={p} spot={spotsById.get(p.spotId)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
