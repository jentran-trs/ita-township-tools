// Portal lock window: from midnight ET the day AFTER the deadline until
// midnight ET on the reopen date (deadline + 1 month). During this window
// all public mutation endpoints reject writes — the portal is read-only.
//
// Example: deadline = "2026-07-15"
//   - closeStart = 2026-07-16 00:00 ET
//   - reopen    = 2026-08-15 00:00 ET
//   - locked when now ∈ [closeStart, reopen)
//
// Uses EDT offset (-04:00) since most deadline-to-reopen windows fall in
// summer. For winter deadlines this can be off by an hour, which is fine
// for day-granularity behavior.
export type PortalOverride = 'auto' | 'open' | 'closed';

// `override` is the superadmin's manual switch (v27). 'closed'/'open' win
// outright; 'auto' (the default) falls back to the deadline-window logic below.
export function isPortalLocked(
  deadline: string | null,
  override: PortalOverride | string | null = 'auto'
): boolean {
  if (override === 'closed') return true;
  if (override === 'open') return false;
  if (!deadline) return false;
  const closeStart = new Date(`${deadline}T00:00:00-04:00`);
  closeStart.setDate(closeStart.getDate() + 1);
  const reopen = new Date(`${deadline}T00:00:00-04:00`);
  reopen.setMonth(reopen.getMonth() + 1);
  const now = new Date();
  return now >= closeStart && now < reopen;
}

export function getPortalLockBounds(deadline: string | null): {
  closeStart: string | null;
  reopen: string | null;
} {
  if (!deadline) return { closeStart: null, reopen: null };
  const closeStart = new Date(`${deadline}T00:00:00-04:00`);
  closeStart.setDate(closeStart.getDate() + 1);
  const reopen = new Date(`${deadline}T00:00:00-04:00`);
  reopen.setMonth(reopen.getMonth() + 1);
  return { closeStart: closeStart.toISOString(), reopen: reopen.toISOString() };
}
