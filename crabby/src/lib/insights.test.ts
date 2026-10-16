import { describe, expect, it } from 'vitest';
import { changeLog, earlySeasonFavorites, heatPoints, spotStatus } from './insights';
import { nearestSpot } from './geo';
import { sampleData } from './sample';
import { DEFAULT_SETTINGS, type Data, type Pull, type Spot } from './types';

const spot = (id: string, extra: Partial<Spot> = {}): Spot => ({
  id,
  number: Number(id.replace(/\D/g, '')) || 1,
  name: id,
  lat: 47.6,
  lng: -122.4,
  notes: '',
  createdAt: '2025-01-01T00:00',
  crabbedOutAt: null,
  ...extra,
});

let n = 0;
const pull = (spotId: string, at: string, keepers: number): Pull => ({
  id: `p${n++}`,
  spotId,
  at,
  keepers,
  trapType: 'Ring',
  bait: 'Chicken',
  overnight: false,
  experimental: false,
  notes: '',
});

const s = DEFAULT_SETTINGS; // 4 pulls in 30 days = heavy, rest 60 days
const hammered = (spotId: string) => [
  pull(spotId, '2025-07-01T08:00', 16),
  pull(spotId, '2025-07-05T08:00', 12),
  pull(spotId, '2025-07-09T08:00', 9),
  pull(spotId, '2025-07-13T08:00', 6),
];

describe('spotStatus', () => {
  it('is "new" with no pulls and "fresh" with a few spread-out pulls', () => {
    expect(spotStatus(spot('a'), [], s).kind).toBe('new');
    const pulls = [pull('a', '2025-05-01T08:00', 10), pull('a', '2025-06-15T08:00', 3)];
    expect(spotStatus(spot('a'), pulls, s, new Date('2025-06-16T08:00')).kind).toBe('fresh');
  });

  it('flags a spot fished a lot recently as busy while the catch holds up', () => {
    const pulls = ['01', '04', '07', '10'].map((d) => pull('a', `2025-07-${d}T08:00`, 10));
    expect(spotStatus(spot('a'), pulls, s, new Date('2025-07-12T08:00')).kind).toBe('busy');
    // ...and stops nagging once the window has passed.
    expect(spotStatus(spot('a'), pulls, s, new Date('2025-08-20T08:00')).kind).toBe('fresh');
  });

  it('calls it crabbed out when heavy fishing halves the catch, then ready after the rest', () => {
    const pulls = hammered('a');
    const resting = spotStatus(spot('a'), pulls, s, new Date('2025-07-20T08:00'));
    expect(resting.kind).toBe('resting');
    if (resting.kind === 'resting') expect(resting.daysLeft).toBe(53);
    expect(spotStatus(spot('a'), pulls, s, new Date('2025-09-12T08:00')).kind).toBe('ready');
  });

  it('restarts the rest clock if she keeps pulling a tired spot', () => {
    const pulls = [...hammered('a'), pull('a', '2025-07-25T08:00', 2)];
    const st = spotStatus(spot('a'), pulls, s, new Date('2025-09-12T08:00'));
    expect(st.kind).toBe('resting');
  });

  it('honours a hand-set crabbed-out flag until a new pull happens', () => {
    const a = spot('a', { crabbedOutAt: '2025-06-02T09:00' });
    const pulls = [pull('a', '2025-06-01T08:00', 3)];
    const st = spotStatus(a, pulls, s, new Date('2025-06-10T08:00'));
    expect(st.kind).toBe('resting');
    if (st.kind === 'resting') expect(st.manual).toBe(true);
    expect(spotStatus(a, [...pulls, pull('a', '2025-06-12T08:00', 9)], s, new Date('2025-06-13T08:00')).kind).toBe('fresh');
  });
});

describe('changeLog', () => {
  it('records crabbed out → rested → back again', () => {
    const data: Data = { version: 1, spots: [spot('a')], pulls: [...hammered('a'), pull('a', '2025-10-01T08:00', 11)], settings: s };
    const kinds = changeLog(data, new Date('2025-10-02T08:00')).map((e) => e.kind);
    expect(kinds).toEqual(['returned', 'rested', 'crabbed-out']);
  });
});

describe('map helpers', () => {
  it('weights the heatmap by how often a spot was fished', () => {
    const data: Data = {
      version: 1,
      spots: [spot('a'), spot('b'), spot('c')],
      pulls: [pull('a', '2025-05-01T08:00', 1), pull('a', '2025-05-02T08:00', 1), pull('b', '2025-05-01T08:00', 1)],
      settings: s,
    };
    expect(heatPoints(data).map((p) => p[2])).toEqual([1, Math.sqrt(0.5)]);
  });

  it('ranks early-season favourites by average keepers in those months only', () => {
    const data: Data = {
      version: 1,
      spots: [spot('a1'), spot('b2')],
      pulls: [
        pull('a1', '2024-05-10T08:00', 4),
        pull('a1', '2025-08-10T08:00', 30), // not early season
        pull('b2', '2025-06-10T08:00', 12),
      ],
      settings: s,
    };
    expect(earlySeasonFavorites(data).map((f) => [f.spot.id, f.rank, f.avg])).toEqual([
      ['b2', 1, 12],
      ['a1', 2, 4],
    ]);
  });

  it('finds the nearest saved spot', () => {
    const near = nearestSpot([spot('a1', { lat: 47.6, lng: -122.4 }), spot('b2', { lat: 47.7, lng: -122.4 })], 47.601, -122.4);
    expect(near?.spot.id).toBe('a1');
    expect(near?.meters).toBeGreaterThan(100);
    expect(near?.meters).toBeLessThan(120);
  });
});

describe('sample data', () => {
  it('shows off every kind of alert', () => {
    const data = sampleData(new Date('2026-10-16T12:00'));
    const now = new Date('2026-10-16T12:00');
    const kinds = new Set(data.spots.map((sp) => spotStatus(sp, data.pulls.filter((p) => p.spotId === sp.id).sort((a, b) => a.at.localeCompare(b.at)), data.settings, now).kind));
    expect(kinds).toContain('ready');
    expect(kinds).toContain('resting');
    expect(kinds).toContain('busy');
  });
});
