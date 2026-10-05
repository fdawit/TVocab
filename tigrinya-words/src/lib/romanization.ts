import type { Settings } from './types';

export function romanization(mode: Settings['romanization'], box: number): 'show' | 'tap' {
  if (mode === 'always') return 'show';
  if (mode === 'tap') return 'tap';
  return box < 4 ? 'show' : 'tap';
}
