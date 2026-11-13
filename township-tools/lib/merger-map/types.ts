export type MeetingStatus = 'scheduled' | 'pending';

export type CountyMeeting = {
  county: string;
  status: MeetingStatus;
  contact_name: string | null;
  contact_email?: string | null;
  meeting_date: string | null; // YYYY-MM-DD
  meeting_time: string | null; // HH:MM[:SS], Eastern
  location: string | null;
  notes: string | null;
};

export type MapSettings = {
  title: string;
  intro: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export const DEFAULT_SETTINGS: MapSettings = {
  title: 'Township Merger Meetings',
  intro: null,
  contact_name: null,
  contact_email: null,
  contact_phone: null,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Dates are stored as plain calendar dates, so format them without going
// through the viewer's time zone.
export function formatDate(d: string | null): string | null {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return null;
  const dow = DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${dow}, ${MONTHS[m - 1]} ${day}, ${y}`;
}

export function formatTime(t: string | null): string | null {
  if (!t) return null;
  const [h, min] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${suffix} ET`;
}

// Today's date in Indiana (Eastern), as YYYY-MM-DD.
export function todayEastern(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isPast(m: CountyMeeting, today: string): boolean {
  return m.status === 'scheduled' && !!m.meeting_date && m.meeting_date < today;
}

// Scheduled meetings in date order (undated last), used for the numbered
// badges on the map and the list under it.
export function scheduledInOrder(meetings: CountyMeeting[]): CountyMeeting[] {
  return meetings
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => {
      const ka = `${a.meeting_date ?? '9999-12-31'} ${a.meeting_time ?? '99:99'}`;
      const kb = `${b.meeting_date ?? '9999-12-31'} ${b.meeting_time ?? '99:99'}`;
      return ka.localeCompare(kb) || a.county.localeCompare(b.county);
    });
}
