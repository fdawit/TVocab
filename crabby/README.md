# 🦀 Crabby

A cute, simple crabbing notebook that replaces the spiral notebook and the tabletop map.
Phone-first for logging on the boat, roomy on a desktop for planning the night before.

## Run it

```bash
cd crabby
npm install
npm run dev        # http://localhost:5173
npm test           # pattern logic tests
npm run build      # static site in dist/ — host anywhere (Netlify, GitHub Pages, …)
```

GPS needs HTTPS (or localhost), so host the built site somewhere with HTTPS before using it on the phone.

## What's in it

| Screen | What it does |
| --- | --- |
| **Home** | Big "Log a pull" / "Mark a spot" buttons, alert summary, season totals, last day out. |
| **Log a pull** | Finds you by GPS and picks the spot you're at. Big keeper stepper, trap & bait chips (type a new one and it's remembered), Overnight soak 🌙 and Experimental drop 🧪 toggles. Remembers your last trap and bait. |
| **Mark a spot** | GPS fix, tap or drag on the map, or type coordinates from the boat's GPS. Warns if it's right on top of an existing spot. Spots get a number (#1, #2…) and a name. |
| **Map** | Numbered pins labelled with the last pull's date and keepers, colored by spot health. 🔥 Heatmap toggle (how often each spot is fished). ⭐ Early-season faves filter. |
| **Logbook** | Every pull, newest first, grouped by day. Search spot names, bait, traps, notes and dates ("june 2025", "saturday"). Filter by spot, overnight or experimental. Tap a pull to fix or delete it. |
| **Spot page** | Health status, totals, best bait & trap at that spot, early-season average, change log and full history. |
| **Alerts** | Spots that are 🌱 rested & ready, ⚠️ fished a lot lately, or 😴 resting (with a progress bar), plus a change log of when spots got crabbed out, rested, and were fished again. |
| **Settings** | Tune the alert rules and early-season months, edit trap/bait lists, download/restore a backup, sample data. |

### How "crabbed out" works

- **Fished a lot:** 4+ pulls at a spot within 30 days.
- **Crabbed out:** fished a lot *and* the latest catch is half (or less) of the best catch in that stretch. You can also mark a spot crabbed out by hand.
- **Resting → Ready:** after 60 days without a pull the spot is flagged "ready to try again". Pulling it again during the rest restarts the clock.

All three numbers are adjustable in Settings.

### Data

Everything is stored on the device (localStorage) — no account, works without signal once loaded.
Use **Settings → Download backup** now and then; **Restore** loads it on another phone or computer.

## Code map

- `src/lib/types.ts` — data model (`Spot`, `Pull`, `Settings`)
- `src/lib/store.ts` — storage and actions
- `src/lib/insights.ts` — spot health, change log, heatmap weights, early-season favorites
- `src/screens/` — one file per screen; `src/components/` — map, cards, form bits
- Map: Leaflet + react-leaflet with OpenStreetMap tiles (no API key), `leaflet.heat` for the heatmap
