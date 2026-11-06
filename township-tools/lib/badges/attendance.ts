// Attendance rules for badge check-in/check-out. Shared by the scanner API,
// the admin review page, and certificate issuing so they can never disagree.
//
// Rule (agreed scope): a registrant ATTENDED when, for every day from
// course_date through course_end_date inclusive, they have at least one
// non-voided check-in AND at least one non-voided check-out.

export const EVENT_TIME_ZONE = 'America/New_York';

export type ScanLike = {
  scan_date: string; // YYYY-MM-DD (Eastern)
  direction: 'in' | 'out';
  scanned_at: string;
  voided_at?: string | null;
};

export type DayAttendance = {
  date: string;
  checkIn: string | null; // earliest check-in
  checkOut: string | null; // latest check-out
  complete: boolean;
};

export type AttendanceResult = {
  days: DayAttendance[];
  attended: boolean;
  // Days with a scan but missing its pair — what Jen reviews.
  incompleteDays: string[];
  // True when there is at least one scan on any day.
  anyScan: boolean;
};

/** Every event day as YYYY-MM-DD, start through end inclusive. */
export function eventDays(start: string, end?: string | null): string[] {
  const days: string[] = [];
  const s = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
  const e = end
    ? Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10))
    : s;
  for (let t = s; t <= Math.max(s, e); t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
    if (days.length > 60) break; // guard against a typo'd end date
  }
  return days;
}

/** The Eastern-time calendar day (YYYY-MM-DD) for an instant. */
export function easternDate(at: Date | string = new Date()): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  // en-CA formats as YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: EVENT_TIME_ZONE });
}

/** "9:05 AM" in Eastern time. */
export function easternTime(at: string | Date): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  return d.toLocaleTimeString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function computeAttendance(
  days: string[],
  scans: ScanLike[]
): AttendanceResult {
  const live = scans.filter((s) => !s.voided_at);
  const result: DayAttendance[] = days.map((date) => {
    const today = live.filter((s) => s.scan_date === date);
    const ins = today.filter((s) => s.direction === 'in').map((s) => s.scanned_at).sort();
    const outs = today.filter((s) => s.direction === 'out').map((s) => s.scanned_at).sort();
    const checkIn = ins[0] ?? null;
    const checkOut = outs.length ? outs[outs.length - 1] : null;
    return { date, checkIn, checkOut, complete: !!checkIn && !!checkOut };
  });
  return {
    days: result,
    attended: result.length > 0 && result.every((d) => d.complete),
    incompleteDays: result.filter((d) => !d.complete && (d.checkIn || d.checkOut)).map((d) => d.date),
    anyScan: live.length > 0,
  };
}

/** "9:00 AM – 4:00 PM" from Postgres TIME strings ("09:00:00"). */
export function formatEventTimes(start?: string | null, end?: string | null): string | null {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  if (!start) return null;
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}
