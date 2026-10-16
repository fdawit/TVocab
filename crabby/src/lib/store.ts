import { useSyncExternalStore } from 'react';
import { nowLocal } from './dates';
import { DEFAULT_SETTINGS, type Data, type Pull, type Settings, type Spot } from './types';

const KEY = 'crabby:v1';

const empty = (): Data => ({ version: 1, spots: [], pulls: [], settings: { ...DEFAULT_SETTINGS } });

/** Fills in anything missing so older or hand-edited backups still load. */
export function normalize(raw: unknown): Data {
  const d = (raw ?? {}) as Partial<Data>;
  if (!Array.isArray(d.spots) || !Array.isArray(d.pulls)) throw new Error("That file doesn't look like a Crabby backup.");
  return {
    version: 1,
    spots: (d.spots as Partial<Spot>[]).map((s) => ({ notes: '', crabbedOutAt: null, createdAt: nowLocal(), ...s }) as Spot),
    pulls: (d.pulls as Partial<Pull>[]).map((p) => ({ notes: '', trapType: '', bait: '', overnight: false, experimental: false, ...p }) as Pull),
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : empty();
  } catch {
    return empty();
  }
}

let state: Data = load();
const listeners = new Set<() => void>();

function commit(next: Data) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    toast("Couldn't save to this device's storage!");
  }
  listeners.forEach((l) => l());
}

export function useData(): Data {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const getData = () => state;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Adds a value to a chip list (trap types / baits) if it's new. */
const remember = (list: string[], value: string) =>
  !value.trim() || list.some((v) => v.toLowerCase() === value.trim().toLowerCase()) ? list : [...list, value.trim()];

export const actions = {
  addSpot(input: Omit<Spot, 'id' | 'number' | 'createdAt' | 'crabbedOutAt'>): Spot {
    const number = Math.max(0, ...state.spots.map((s) => s.number)) + 1;
    const spot: Spot = { ...input, id: uid(), number, createdAt: nowLocal(), crabbedOutAt: null, name: input.name.trim() || `Spot ${number}` };
    commit({ ...state, spots: [...state.spots, spot] });
    return spot;
  },
  updateSpot(id: string, patch: Partial<Spot>) {
    commit({ ...state, spots: state.spots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },
  deleteSpot(id: string) {
    commit({ ...state, spots: state.spots.filter((s) => s.id !== id), pulls: state.pulls.filter((p) => p.spotId !== id) });
  },
  addPull(input: Omit<Pull, 'id'>): Pull {
    const pull: Pull = { ...input, id: uid() };
    commit({
      ...state,
      pulls: [...state.pulls, pull],
      settings: {
        ...state.settings,
        lastTrap: pull.trapType,
        lastBait: pull.bait,
        trapTypes: remember(state.settings.trapTypes, pull.trapType),
        baits: remember(state.settings.baits, pull.bait),
      },
    });
    return pull;
  },
  updatePull(id: string, patch: Partial<Pull>) {
    commit({
      ...state,
      pulls: state.pulls.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      settings: {
        ...state.settings,
        trapTypes: remember(state.settings.trapTypes, patch.trapType ?? ''),
        baits: remember(state.settings.baits, patch.bait ?? ''),
      },
    });
  },
  deletePull(id: string) {
    commit({ ...state, pulls: state.pulls.filter((p) => p.id !== id) });
  },
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },
  replaceAll(data: Data) {
    commit(data);
  },
  /** Clears spots and pulls. Settings stay unless `resetSettings`. */
  eraseAll(resetSettings = false) {
    commit({ ...empty(), settings: resetSettings ? { ...DEFAULT_SETTINGS } : state.settings });
  },
};

/* ---------- Tiny toast bus ---------- */

type ToastListener = (msg: string) => void;
const toastListeners = new Set<ToastListener>();
export const onToast = (l: ToastListener) => {
  toastListeners.add(l);
  return () => void toastListeners.delete(l);
};
export const toast = (msg: string) => toastListeners.forEach((l) => l(msg));
