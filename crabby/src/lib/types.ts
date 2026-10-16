/** A saved crabbing location. `number` is the friendly ID shown on map pins. */
export type Spot = {
  id: string;
  number: number;
  name: string;
  lat: number;
  lng: number;
  notes: string;
  createdAt: string;
  /** Set when she marks the spot "crabbed out" by hand. Local datetime. */
  crabbedOutAt: string | null;
};

/** One pull of the traps at a spot. */
export type Pull = {
  id: string;
  spotId: string;
  /** Local datetime, "YYYY-MM-DDTHH:mm" (same shape as <input type="datetime-local">). */
  at: string;
  keepers: number;
  trapType: string;
  bait: string;
  overnight: boolean;
  experimental: boolean;
  notes: string;
};

export type Settings = {
  /** Days a crabbed-out spot should rest before Crabby suggests it again. */
  restDays: number;
  /** This many pulls inside `heavyWindowDays` counts as "heavily fished". */
  heavyPulls: number;
  heavyWindowDays: number;
  /** Months (1-12) that count as early season. */
  earlySeasonMonths: number[];
  trapTypes: string[];
  baits: string[];
  lastTrap: string;
  lastBait: string;
};

export type Data = {
  version: 1;
  spots: Spot[];
  pulls: Pull[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  restDays: 60,
  heavyPulls: 4,
  heavyWindowDays: 30,
  earlySeasonMonths: [5, 6],
  trapTypes: ['Ring', 'Box', 'Folding'],
  baits: ['Chicken', 'Herring', 'Turkey leg'],
  lastTrap: 'Ring',
  lastBait: 'Chicken',
};
