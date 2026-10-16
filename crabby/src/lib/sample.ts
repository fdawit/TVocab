import { DEFAULT_SETTINGS, type Data, type Pull, type Spot } from './types';
import { toLocal } from './dates';

/** A couple of seasons of made-up crabbing on Puget Sound, so every screen has something to show. */
export function sampleData(now = new Date()): Data {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const created = toLocal(new Date(lastYear, 4, 1, 8, 0));

  const spot = (number: number, name: string, lat: number, lng: number, notes: string): Spot => ({
    id: `sample-${number}`,
    number,
    name,
    lat,
    lng,
    notes,
    createdAt: created,
    crabbedOutAt: null,
  });

  const spots = [
    spot(1, 'Cove Rock', 47.6912, -122.4521, 'Sandy bottom, 40 ft. Watch the kelp on the north side.'),
    spot(2, 'Red Buoy Drop', 47.6788, -122.4459, 'Right off the red buoy. Strong current at max ebb.'),
    spot(3, 'Eelgrass Flats', 47.6655, -122.4603, 'Shallow — great early in the season.'),
    spot(4, 'Ferry Lane Edge', 47.6521, -122.4488, 'Stay clear of the ferry route!'),
    spot(5, "Grandpa's Hole", 47.6402, -122.4637, 'The old family spot. Deep, 70 ft.'),
    spot(6, 'Point No Point-ish', 47.7034, -122.4389, 'Tried once on a whim.'),
    spot(7, 'Lighthouse Shelf', 47.6283, -122.4551, ''),
  ];

  const pulls: Pull[] = [];
  const traps = ['Ring', 'Box', 'Folding'];
  const add = (spotNo: number, date: Date, keepers: number, extra: Partial<Pull> = {}) => {
    const at = toLocal(date);
    if (at > toLocal(now)) return;
    pulls.push({
      id: `sample-p${pulls.length + 1}`,
      spotId: `sample-${spotNo}`,
      at,
      keepers: Math.max(0, Math.round(keepers)),
      trapType: pick(traps),
      bait: pick(['Chicken', 'Chicken', 'Herring', 'Turkey leg']),
      overnight: rand() < 0.35,
      experimental: false,
      notes: '',
      ...extra,
    });
  };

  for (const year of [lastYear, thisYear]) {
    // A steady weekend routine from May through September.
    for (let week = 0; week < 20; week++) {
      const day = new Date(year, 4, 3 + week * 7, 7 + Math.floor(rand() * 4), Math.floor(rand() * 60));
      const early = week < 9;
      add(1, day, (early ? 9 : 6) + rand() * 5);
      if (week % 2 === 0) add(3, new Date(day.getTime() + 40 * 60_000), (early ? 13 : 4) + rand() * 4, { bait: 'Herring' });
      if (week % 3 === 0) add(5, new Date(day.getTime() + 90 * 60_000), 7 + rand() * 6, { trapType: 'Ring' });
      if (week % 4 === 1) add(7, new Date(day.getTime() + 70 * 60_000), 3 + rand() * 4);
    }
  }

  // Red Buoy Drop got hammered last July and crabbed out — it has rested since.
  [16, 15, 11, 7, 4].forEach((k, i) => add(2, new Date(lastYear, 6, 2 + i * 4, 6, 30), k, { overnight: true, trapType: 'Box', bait: 'Turkey leg' }));
  // ...and Ferry Lane Edge got hammered this summer, so it's resting now.
  const ferryStart = new Date(now.getTime() - 34 * 86_400_000);
  [14, 12, 9, 6, 3].forEach((k, i) =>
    add(4, new Date(ferryStart.getTime() + i * 3 * 86_400_000), k, { overnight: i % 2 === 0, trapType: 'Folding', bait: 'Chicken' }),
  );

  // A couple of experimental drops.
  add(6, new Date(lastYear, 7, 18, 9, 15), 2, { experimental: true, bait: 'Canned cat food', notes: 'Cat food washed out fast. Try a bait cage.' });
  add(6, new Date(thisYear, 5, 21, 9, 5), 8, { experimental: true, bait: 'Turkey leg', overnight: true, notes: 'Overnight with the turkey leg — not bad!' });

  // Busy lately: Cove Rock a few times in the last couple of weeks.
  [10, 9, 11, 10].forEach((k, i) => add(1, new Date(now.getTime() - (12 - i * 3) * 86_400_000), k));

  return {
    version: 1,
    spots,
    pulls: pulls.sort((a, b) => a.at.localeCompare(b.at)),
    settings: { ...DEFAULT_SETTINGS, baits: [...DEFAULT_SETTINGS.baits, 'Canned cat food'], lastTrap: 'Ring', lastBait: 'Chicken' },
  };
}

export const isSampleData = (d: Data) => d.spots.some((s) => s.id.startsWith('sample-'));
