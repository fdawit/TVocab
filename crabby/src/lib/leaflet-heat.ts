// leaflet.heat is an old plugin that attaches itself to a global `L`.
// Importing this module first makes Leaflet global, then loads the plugin.
import L from 'leaflet';

(window as unknown as { L: typeof L }).L = L;
