const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DDTHH:mm" in local time. */
export function toLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const nowLocal = () => toLocal(new Date());

/** "YYYY-MM-DDTHH:mm" parses as local time. */
export const parseLocal = (s: string) => new Date(s);

export const dayKey = (s: string) => s.slice(0, 10);

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? parseLocal(from) : from;
  const b = typeof to === 'string' ? parseLocal(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / DAY);
}

export function addDays(s: string, days: number): string {
  return toLocal(new Date(parseLocal(s).getTime() + days * DAY));
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fmtShort(s: string): string {
  const d = parseLocal(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDay(s: string): string {
  return parseLocal(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtTime(s: string): string {
  return parseLocal(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function fmtAgo(s: string, now = new Date()): string {
  const d = daysBetween(s, now);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 45) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  const y = Math.round(d / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}

/** Words a search box should match for a date: "june 2025", "jun 3", "2025-06-03", "saturday". */
export function searchableDate(s: string): string {
  const d = parseLocal(s);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${s} ${LONG_MONTHS[d.getMonth()]} ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${weekday}`.toLowerCase();
}

export function monthRange(months: number[]): string {
  if (months.length === 0) return 'no months';
  const sorted = [...months].sort((a, b) => a - b);
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 1) return `${MONTHS[sorted[0] - 1]}–${MONTHS[sorted.at(-1)! - 1]}`;
  return sorted.map((m) => MONTHS[m - 1]).join(', ');
}
