import { eventDays } from '@/lib/badges/attendance';

/**
 * Validate a course's hours per day (cert_courses.day_hours, v38).
 * Only multi-day courses keep them; single-day courses always get null.
 * Returns { value } to store, or { error }.
 */
export function cleanDayHours(
  raw: unknown,
  start: string,
  end: string | null | undefined
): { value: Record<string, number> | null; error?: string } {
  const days = eventDays(start, end && end !== start ? end : null);
  if (raw == null || days.length < 2) return { value: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { value: null, error: 'Hours per day are invalid' };
  const out: Record<string, number> = {};
  for (const d of days) {
    const v = (raw as any)[d];
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    if (v === undefined || v === '' || v === null || !Number.isFinite(n) || n < 0 || n > 24) {
      return { value: null, error: 'Enter the hours (0–24) for every day of the course' };
    }
    out[d] = Math.round(n * 100) / 100;
  }
  return { value: out };
}

/** Total of the hours per day. */
export function dayHoursTotal(dayHours: Record<string, number>): number {
  return Math.round(Object.values(dayHours).reduce((a, b) => a + b, 0) * 100) / 100;
}
