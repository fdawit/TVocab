import { useMemo, useState } from 'react';
import { CrabMap, type MapSpot } from '../components/CrabMap';
import { SpotBadge, StatusPill } from '../components/ui';
import { fmtShort, monthRange } from '../lib/dates';
import { earlySeasonFavorites, heatPoints, pullsBySpot, statusMap } from '../lib/insights';
import { useData } from '../lib/store';

export function MapScreen({ params }: { params: URLSearchParams }) {
  const data = useData();
  const [heat, setHeat] = useState(params.get('heat') === '1');
  const [faves, setFaves] = useState(params.get('faves') === '1');
  const [selectedId, setSelectedId] = useState(params.get('spot') ?? undefined);

  const statuses = useMemo(() => statusMap(data), [data]);
  const bySpot = useMemo(() => pullsBySpot(data.pulls), [data.pulls]);
  const heatData = useMemo(() => heatPoints(data), [data]);
  const favorites = useMemo(() => earlySeasonFavorites(data), [data]);

  const items: MapSpot[] = useMemo(() => {
    if (faves) {
      return favorites.map((f) => ({
        spot: f.spot,
        status: statuses.get(f.spot.id)!,
        last: bySpot.get(f.spot.id)?.at(-1) ?? null,
        label: `⭐${f.rank} · avg ${f.avg.toFixed(1)}`,
      }));
    }
    return data.spots.map((spot) => ({ spot, status: statuses.get(spot.id)!, last: bySpot.get(spot.id)?.at(-1) ?? null }));
  }, [faves, favorites, data.spots, statuses, bySpot]);

  const list = faves ? items : [...items].sort((a, b) => a.spot.number - b.spot.number);

  return (
    <div className="map-screen">
      <div className="map-pane">
        <div className="map-toolbar">
          <button className={`chip chip-float ${heat ? 'on' : ''}`} onClick={() => setHeat((h) => !h)} aria-pressed={heat}>
            🔥 Heatmap
          </button>
          <button className={`chip chip-float ${faves ? 'on' : ''}`} onClick={() => setFaves((f) => !f)} aria-pressed={faves}>
            ⭐ Early-season faves
          </button>
        </div>
        <CrabMap items={items} heat={heat ? heatData : undefined} selectedId={selectedId} onSelect={setSelectedId} />
        {data.spots.length === 0 && (
          <div className="map-empty card">
            <p>No spots yet!</p>
            <a className="btn btn-primary" href="#/spot/new">
              📍 Mark a spot
            </a>
          </div>
        )}
        {heat && (
          <div className="heat-legend">
            <span>Fished less</span>
            <span className="heat-bar" />
            <span>Fished most</span>
          </div>
        )}
      </div>

      <aside className="map-list">
        <div className="section-head">
          <h2>{faves ? 'Early-season faves' : 'Spots'}</h2>
          <a className="btn btn-sm btn-sea" href="#/spot/new">
            + Spot
          </a>
        </div>
        {faves && (
          <p className="muted small">
            Best average catch in {monthRange(data.settings.earlySeasonMonths)}, across every year you've logged.{' '}
            <a href="#/settings">Change months</a>
          </p>
        )}
        {faves && favorites.length === 0 && <p className="card center">No early-season pulls logged yet.</p>}
        <div className="list">
          {list.map(({ spot, status, last }) => {
            const fav = favorites.find((f) => f.spot.id === spot.id);
            return (
              <div key={spot.id} className={`spot-row ${selectedId === spot.id ? 'on' : ''}`}>
                <button className="spot-row-btn" onClick={() => setSelectedId(spot.id)}>
                  <SpotBadge number={spot.number} kind={status.kind} />
                  <span className="spot-row-main">
                    <strong>{spot.name}</strong>
                    <small>
                      {faves && fav
                        ? `⭐ #${fav.rank} · avg ${fav.avg.toFixed(1)} keepers over ${fav.count} pulls`
                        : last
                          ? `Last: ${fmtShort(last.at)} · ${last.keepers} keepers · ${bySpot.get(spot.id)!.length} pulls`
                          : 'Not fished yet'}
                    </small>
                    <StatusPill status={status} />
                  </span>
                </button>
                <a className="chev" href={`#/spot/${spot.id}`} aria-label={`Open ${spot.name}`}>
                  ›
                </a>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
