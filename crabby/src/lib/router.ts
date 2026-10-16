import { useEffect, useState } from 'react';

export type Route = { path: string[]; params: URLSearchParams };

function parse(): Route {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  return { path: path.split('/').filter(Boolean), params: new URLSearchParams(query ?? '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function go(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#/${to.replace(/^\//, '')}`;
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

export function back(fallback = '') {
  if (history.length > 1) history.back();
  else go(fallback);
}
