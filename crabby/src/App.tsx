import { useMemo } from 'react';
import { Nav } from './components/Nav';
import { Toaster } from './components/Toaster';
import { statusMap } from './lib/insights';
import { useRoute } from './lib/router';
import { useData } from './lib/store';
import { Alerts } from './screens/Alerts';
import { Home } from './screens/Home';
import { LogPull } from './screens/LogPull';
import { Logbook } from './screens/Logbook';
import { MapScreen } from './screens/MapScreen';
import { MarkSpot } from './screens/MarkSpot';
import { SettingsScreen } from './screens/Settings';
import { SpotDetail } from './screens/SpotDetail';

export default function App() {
  const route = useRoute();
  const data = useData();
  const alertCount = useMemo(
    () => [...statusMap(data).values()].filter((s) => s.kind === 'ready' || s.kind === 'busy').length,
    [data],
  );

  const [first, second, third] = route.path;
  let screen;
  let tab = first ?? 'home';
  if (first === 'log') screen = <LogPull key={route.params.toString()} params={route.params} />;
  else if (first === 'map') screen = <MapScreen params={route.params} />;
  else if (first === 'logbook') screen = <Logbook params={route.params} />;
  else if (first === 'alerts') screen = <Alerts />;
  else if (first === 'settings') screen = <SettingsScreen />;
  else if (first === 'spot' && second === 'new') screen = <MarkSpot key="new" params={route.params} />;
  else if (first === 'spot' && second && third === 'edit') screen = <MarkSpot key={second} editId={second} params={route.params} />;
  else if (first === 'spot' && second) {
    screen = <SpotDetail id={second} />;
    tab = 'map';
  } else {
    screen = <Home />;
    tab = 'home';
  }

  return (
    <div className={`app ${first === 'map' ? 'app-map' : ''}`}>
      <Nav tab={tab} alertCount={alertCount} />
      <main className="main">{screen}</main>
      <Toaster />
    </div>
  );
}
