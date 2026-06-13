// Append "Township" to a typed township name unless it's already there.
// "Vernon" -> "Vernon Township"; "Vernon Township" -> "Vernon Township".
export function townshipLabel(township: string | null | undefined): string | null {
  const t = (township || '').trim();
  if (!t) return null;
  return /\btownship\s*$/i.test(t) ? t : `${t} Township`;
}

// Effective state of a session's submission portal:
//   archived — manually closed (status = 'closed')
//   closed   — still 'open' but the scheduled close time has passed
//   open     — accepting questions
export type PortalState = 'open' | 'closed' | 'archived';
export function portalState(
  s: { status?: string | null; submit_closes_at?: string | null },
  now: number
): PortalState {
  if (s.status !== 'open') return 'archived';
  if (s.submit_closes_at && now > new Date(s.submit_closes_at).getTime()) return 'closed';
  return 'open';
}
