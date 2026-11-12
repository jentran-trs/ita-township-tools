// On-phone storage for the badge scanner. Everything the door needs lives in
// localStorage so scanning keeps working with no signal; the queue uploads
// when the connection comes back.

export type RosterPerson = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  township: string | null;
  county: string | null;
  badge_token: string;
  is_walk_in: boolean;
};

export type ScanRecord = {
  client_scan_id: string;
  registrant_id: string;
  direction: 'in' | 'out';
  scanned_at: string;
  scan_date: string;
  source?: 'scan' | 'name_search';
  device_label?: string;
};

export type WalkInRecord = {
  id: string;
  badge_token: string;
  first_name: string;
  last_name: string;
  email?: string;
  title?: string;
  township?: string;
  county?: string;
};

export type ScannerState = {
  event: { id: string; name: string; days: string[]; start_time: string | null; end_time: string | null } | null;
  roster: RosterPerson[];
  scans: ScanRecord[]; // server scans + everything recorded on this phone
  pendingScans: ScanRecord[];
  pendingWalkIns: WalkInRecord[];
  deviceLabel: string;
  lastSyncAt: string | null;
};

const key = (courseId: string) => `tt_scanner_${courseId}`;

export function emptyState(): ScannerState {
  return { event: null, roster: [], scans: [], pendingScans: [], pendingWalkIns: [], deviceLabel: '', lastSyncAt: null };
}

export function loadState(courseId: string): ScannerState {
  try {
    const raw = localStorage.getItem(key(courseId));
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch {}
  return emptyState();
}

export function saveState(courseId: string, s: ScannerState) {
  try {
    localStorage.setItem(key(courseId), JSON.stringify(s));
  } catch {
    // Storage full or blocked: scanning still works for this page session.
  }
}

/** Merge a fresh server roster without losing anything not yet uploaded. */
export function mergeServer(
  s: ScannerState,
  server: { event: ScannerState['event']; registrants: RosterPerson[]; scans: Omit<ScanRecord, 'source' | 'device_label'>[] }
): ScannerState {
  const pendingIds = new Set(s.pendingScans.map((x) => x.client_scan_id));
  const serverIds = new Set(server.scans.map((x) => x.client_scan_id));
  const roster = [...server.registrants];
  const rosterIds = new Set(roster.map((r) => r.id));
  for (const w of s.pendingWalkIns) {
    if (!rosterIds.has(w.id)) {
      roster.push({
        id: w.id,
        first_name: w.first_name,
        last_name: w.last_name,
        title: w.title || null,
        township: w.township || null,
        county: w.county || null,
        badge_token: w.badge_token,
        is_walk_in: true,
      });
    }
  }
  return {
    ...s,
    event: server.event,
    roster,
    scans: [...server.scans, ...s.scans.filter((x) => pendingIds.has(x.client_scan_id) && !serverIds.has(x.client_scan_id))],
    lastSyncAt: new Date().toISOString(),
  };
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for very old browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Same format as server-generated badge tokens (lib/badges/token.ts). */
export function randomBadgeToken(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let out = 'ITA1-';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] & 31];
  return out;
}
