// Course dates are stored as YYYY-MM-DD. Build Dates in local time so we
// don't get a one-day shift from UTC parsing.
function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m
    ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Render a course's date or date range, e.g.
 *   "April 22, 2026"
 *   "April 22–24, 2026"
 *   "April 30 – May 2, 2026"
 *   "December 30, 2026 – January 2, 2027"
 * A missing or same-day end date renders as a single date.
 */
export function formatCourseDates(
  start: string | null | undefined,
  end?: string | null,
  month: 'long' | 'short' = 'long'
): string {
  if (!start) return '—';
  const s = parseDate(start);
  if (!s) return start;
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', opts);
  const full = (d: Date) => fmt(d, { year: 'numeric', month, day: 'numeric' });

  const e = end ? parseDate(end) : null;
  if (!e || e.getTime() <= s.getTime()) return full(s);

  if (s.getFullYear() !== e.getFullYear()) return `${full(s)} – ${full(e)}`;
  if (s.getMonth() !== e.getMonth()) {
    return `${fmt(s, { month, day: 'numeric' })} – ${fmt(e, { month, day: 'numeric' })}, ${e.getFullYear()}`;
  }
  return `${fmt(s, { month, day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
}
