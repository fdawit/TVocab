import '../lib/leaflet-heat';
import 'leaflet.heat';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { fmtShort } from '../lib/dates';
import { getPosition } from '../lib/geo';
import type { SpotStatus } from '../lib/insights';
import type { Pull, Spot } from '../lib/types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function BaseTiles() {
  return <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />;
}

/** Somewhere sensible to look at before any spots exist (Puget Sound). */
export const DEFAULT_CENTER: [number, number] = [47.66, -122.45];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pinIcon(spot: Spot, kind: SpotStatus['kind'], label: string, selected: boolean) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin s-${kind} ${selected ? 'selected' : ''}"><span>${spot.number}</span></div>${
      label ? `<div class="pin-label">${esc(label)}</div>` : ''
    }`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 40,
      blur: 22,
      minOpacity: 0.55,
      max: 1,
      gradient: { 0.15: '#3FB8E8', 0.4: '#7BE495', 0.65: '#FFD23F', 0.85: '#FF7A3D', 1: '#E8344E' },
    }).addTo(map);
    return () => void layer.remove();
  }, [map, points]);
  return null;
}

/** Fits the map to the spots once (or to her GPS position if there are none), then follows the selected spot. */
function Camera({ spots, selected }: { spots: Spot[]; selected?: Spot }) {
  const map = useMap();
  const key = spots.map((s) => s.id).join();
  useEffect(() => {
    if (spots.length === 1) map.setView([spots[0].lat, spots[0].lng], 14);
    else if (spots.length > 1) map.fitBounds(L.latLngBounds(spots.map((s) => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 15 });
    else getPosition().then((p) => map.setView([p.lat, p.lng], 13), () => {});
  }, [map, key]);
  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [map, selected]);
  return null;
}

export type MapSpot = { spot: Spot; status: SpotStatus; last: Pull | null; label?: string };

export function CrabMap({
  items,
  heat,
  selectedId,
  onSelect,
}: {
  items: MapSpot[];
  heat?: [number, number, number][];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const spots = useMemo(() => items.map((i) => i.spot), [items]);
  const selected = spots.find((s) => s.id === selectedId);
  return (
    <MapContainer className="map" center={DEFAULT_CENTER} zoom={12} scrollWheelZoom>
      <BaseTiles />
      {heat && <HeatLayer points={heat} />}
      <Camera spots={spots} selected={selected} />
      {items.map(({ spot, status, last, label }) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={pinIcon(spot, status.kind, label ?? (last ? `${fmtShort(last.at)} · ${last.keepers} 🦀` : 'new'), spot.id === selectedId)}
          eventHandlers={{ click: () => onSelect?.(spot.id) }}
        >
          <Popup>
            <div className="popup">
              <strong>
                #{spot.number} {spot.name}
              </strong>
              <div>{last ? `Last pull ${fmtShort(last.at)}: ${last.keepers} keepers` : 'Not fished yet'}</div>
              <div className="popup-status">{status.label}</div>
              <div className="popup-actions">
                <a className="btn btn-sm btn-primary" href={`#/log?spot=${spot.id}`}>
                  Log pull
                </a>
                <a className="btn btn-sm" href={`#/spot/${spot.id}`}>
                  Details
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().pad(-0.2).contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [map, lat, lng]);
  return null;
}

/** Small map for placing a spot: tap the map or drag the pin. Other spots show faded for reference. */
export function PickMap({ lat, lng, others, onPick }: { lat: number | null; lng: number | null; others: Spot[]; onPick: (lat: number, lng: number) => void }) {
  const has = lat !== null && lng !== null;
  const center: [number, number] = has ? [lat, lng] : others[0] ? [others[0].lat, others[0].lng] : DEFAULT_CENTER;
  const newIcon = useMemo(() => L.divIcon({ className: 'pin-wrap', html: '<div class="pin pin-new"><span>★</span></div>', iconSize: [40, 40], iconAnchor: [20, 20] }), []);
  return (
    <MapContainer className="map map-small" center={center} zoom={has ? 14 : 12}>
      <BaseTiles />
      <ClickToPlace onPick={onPick} />
      {others.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={pinIcon(s, 'resting', '', false)} interactive={false} opacity={0.55} />
      ))}
      {has && (
        <>
          <Recenter lat={lat} lng={lng} />
          <Marker
            position={[lat, lng]}
            icon={newIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                onPick(p.lat, p.lng);
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
