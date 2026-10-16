import { addDays, daysBetween, parseLocal, toLocal } from './dates';
import type { Data, Pull, Settings, Spot } from './types';

/** Pulls grouped by spot, oldest first. */
export function pullsBySpot(pulls: Pull[]): Map<string, Pull[]> {
  const map = new Map<string, Pull[]>();
  for (const p of pulls) {
    const list = map.get(p.spotId);
    if (list) list.push(p);
    else map.set(p.spotId, [p]);
  }
  for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return map;
}

export type SpotSummary = {
  count: number;
  keepers: number;
  avg: number;
  last: Pull | null;
  bestBait: string | null;
  bestTrap: string | null;
};

/** Whichever value has the best average keepers (needs at least 2 pulls to count). */
function bestBy(pulls: Pull[], key: 'bait' | 'trapType'): string | null {
  const groups = new Map<string, number[]>();
  for (const p of pulls) {
    const k = p[key].trim();
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), p.keepers]);
  }
  let best: string | null = null;
  let bestAvg = -1;
  for (const [k, list] of groups) {
    if (list.length < 2) continue;
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    if (avg > bestAvg) [best, bestAvg] = [k, avg];
  }
  return best;
}

export function summarize(pulls: Pull[]): SpotSummary {
  const keepers = pulls.reduce((sum, p) => sum + p.keepers, 0);
  return {
    count: pulls.length,
    keepers,
    avg: pulls.length ? keepers / pulls.length : 0,
    last: pulls.at(-1) ?? null,
    bestBait: bestBy(pulls, 'bait'),
    bestTrap: bestBy(pulls, 'trapType'),
  };
}

/* ---------- Crabbed-out detection & change log ---------- */

type Wear = { heavy: boolean; out: boolean; count: number; peak: number };

/**
 * Looks at the pulls inside the "heavy" window ending at the latest pull.
 * Heavy = at least `heavyPulls` pulls in the window.
 * Crabbed out = heavy AND the latest catch is half (or less) of the window's best.
 */
export function wear(prefix: Pull[], s: Settings): Wear {
  const last = prefix.at(-1);
  if (!last) return { heavy: false, out: false, count: 0, peak: 0 };
  const window = prefix.filter((p) => daysBetween(p.at, last.at) < s.heavyWindowDays);
  const peak = Math.max(...window.map((p) => p.keepers));
  const heavy = window.length >= s.heavyPulls;
  return { heavy, out: heavy && last.keepers <= peak / 2, count: window.length, peak };
}

export type ChangeKind = 'crabbed-out' | 'flagged' | 'rested' | 'returned';

export type ChangeEvent = {
  at: string;
  spotId: string;
  kind: ChangeKind;
  text: string;
};

type Walk = { events: ChangeEvent[]; outSince: string | null; outReason: string };

/** Replays a spot's history to find when it got crabbed out, rested, and was fished again. */
function walkSpot(spot: Spot, pulls: Pull[], s: Settings, now: Date): Walk {
  const events: ChangeEvent[] = [];
  let outSince: string | null = null;
  let outReason = '';
  let flagPending = spot.crabbedOutAt !== null;
  const nowStr = toLocal(now);

  const applyFlag = () => {
    flagPending = false;
    if (outSince) return;
    outSince = spot.crabbedOutAt!;
    outReason = 'You marked it as crabbed out.';
    events.push({ at: outSince, spotId: spot.id, kind: 'flagged', text: 'Marked as crabbed out by hand.' });
  };

  pulls.forEach((p, i) => {
    if (flagPending && spot.crabbedOutAt! < p.at) applyFlag();

    const keepers = `${p.keepers} keeper${p.keepers === 1 ? '' : 's'}`;
    const gap = outSince ? daysBetween(outSince, p.at) : 0;
    if (outSince && gap >= s.restDays) {
      events.push({ at: addDays(outSince, s.restDays), spotId: spot.id, kind: 'rested', text: `Rested ${s.restDays} days — ready to try again.` });
      events.push({ at: p.at, spotId: spot.id, kind: 'returned', text: `Back after ${gap} days of rest: ${keepers}.` });
      outSince = null;
    }

    const w = wear(pulls.slice(0, i + 1), s);
    if (w.out) {
      // Still pulling a tired spot just restarts its rest clock.
      if (!outSince) {
        const reason = `${w.count} pulls in ${s.heavyWindowDays} days and the catch dropped from ${w.peak} to ${p.keepers}.`;
        events.push({ at: p.at, spotId: spot.id, kind: 'crabbed-out', text: `Looks crabbed out — ${reason}` });
        outReason = reason;
      }
      outSince = p.at;
    } else if (outSince) {
      events.push({ at: p.at, spotId: spot.id, kind: 'returned', text: `Fished again after only ${gap} days: ${keepers}.` });
      outSince = null;
    }
  });

  if (flagPending && spot.crabbedOutAt! <= nowStr) applyFlag();
  if (outSince && daysBetween(outSince, now) >= s.restDays) {
    events.push({ at: addDays(outSince, s.restDays), spotId: spot.id, kind: 'rested', text: `Rested ${s.restDays} days — ready to try again.` });
  }
  return { events, outSince, outReason };
}

export type SpotStatus =
  | { kind: 'new'; label: string; detail: string }
  | { kind: 'fresh'; label: string; detail: string }
  | { kind: 'busy'; label: string; detail: string }
  | { kind: 'resting'; label: string; detail: string; daysLeft: number; progress: number; manual: boolean }
  | { kind: 'ready'; label: string; detail: string; manual: boolean };

export function spotStatus(spot: Spot, pulls: Pull[], s: Settings, now = new Date()): SpotStatus {
  const { outSince, outReason } = walkSpot(spot, pulls, s, now);
  if (outSince) {
    const rested = daysBetween(outSince, now);
    const manual = outSince === spot.crabbedOutAt;
    if (rested >= s.restDays) {
      return { kind: 'ready', label: 'Ready again', detail: `Rested ${rested} days. ${outReason}`, manual };
    }
    const daysLeft = s.restDays - rested;
    return {
      kind: 'resting',
      label: 'Resting',
      detail: `${outReason} Give it ${daysLeft} more day${daysLeft === 1 ? '' : 's'}.`,
      daysLeft,
      progress: Math.max(0, rested) / s.restDays,
      manual,
    };
  }
  const last = pulls.at(-1);
  if (!last) return { kind: 'new', label: 'Not fished yet', detail: 'No pulls logged here yet.' };
  const w = wear(pulls, s);
  if (w.heavy && daysBetween(last.at, now) < s.heavyWindowDays) {
    return { kind: 'busy', label: 'Fished a lot', detail: `${w.count} pulls in the last ${s.heavyWindowDays} days. Keep an eye on the catch.` };
  }
  return { kind: 'fresh', label: 'Good to go', detail: 'Nothing unusual here.' };
}

export function statusMap(data: Data, now = new Date()): Map<string, SpotStatus> {
  const bySpot = pullsBySpot(data.pulls);
  return new Map(data.spots.map((spot) => [spot.id, spotStatus(spot, bySpot.get(spot.id) ?? [], data.settings, now)]));
}

/** Every status change across all spots, newest first. */
export function changeLog(data: Data, now = new Date()): ChangeEvent[] {
  const bySpot = pullsBySpot(data.pulls);
  const nowStr = toLocal(now);
  return data.spots
    .flatMap((spot) => walkSpot(spot, bySpot.get(spot.id) ?? [], data.settings, now).events)
    .filter((e) => e.at <= nowStr)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/* ---------- Map helpers ---------- */

/**
 * [lat, lng, intensity 0..1] — intensity is how many times she's fished the spot,
 * square-rooted so a spot fished a handful of times still shows up next to the old favorite.
 */
export function heatPoints(data: Data): [number, number, number][] {
  const bySpot = pullsBySpot(data.pulls);
  const max = Math.max(1, ...data.spots.map((s) => bySpot.get(s.id)?.length ?? 0));
  return data.spots
    .map((s) => [s.lat, s.lng, Math.sqrt((bySpot.get(s.id)?.length ?? 0) / max)] as [number, number, number])
    .filter(([, , w]) => w > 0);
}

export type Favorite = { spot: Spot; rank: number; avg: number; count: number };

/** Best spots by average keepers, counting only pulls made in early-season months (any year). */
export function earlySeasonFavorites(data: Data, limit = 5): Favorite[] {
  const months = new Set(data.settings.earlySeasonMonths);
  const early = data.pulls.filter((p) => months.has(parseLocal(p.at).getMonth() + 1));
  const bySpot = pullsBySpot(early);
  return data.spots
    .filter((s) => bySpot.has(s.id))
    .map((spot) => {
      const list = bySpot.get(spot.id)!;
      return { spot, count: list.length, avg: list.reduce((a, p) => a + p.keepers, 0) / list.length };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, limit)
    .map((f, i) => ({ ...f, rank: i + 1 }));
}
