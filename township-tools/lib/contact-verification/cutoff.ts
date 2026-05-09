// Compute the "recent changes" cutoff used by the admin notification system.
//
// Behavior:
//   - If no verification_deadline is set, fall back to the admin's lastViewedAt.
//   - If deadline is set: the system goes silent until midnight ET on the
//     reopen date (deadline + 1 month). Townships can edit freely before then
//     and the admin won't see "X new" pills.
//   - After reopen, the cutoff is max(reopenISO, lastViewedAt) so changes
//     made before reopen never count, even if the admin hasn't visited.
export function getRecentChangesCutoff(
  verificationDeadline: string | null,
  lastViewedAt: string | null
): { cutoff: string; suppress: boolean; reopenISO: string | null } {
  if (!verificationDeadline) {
    return {
      cutoff: lastViewedAt || new Date(0).toISOString(),
      suppress: false,
      reopenISO: null,
    };
  }
  // Reopen = midnight ET on (deadline + 1 month). EDT offset is -04:00 (covers
  // most July→Aug deadlines). For winter deadlines this approximation is
  // off by one hour, which doesn't matter for day-granularity notifications.
  const d = new Date(verificationDeadline + 'T00:00:00-04:00');
  d.setMonth(d.getMonth() + 1);
  const reopenISO = d.toISOString();
  const nowISO = new Date().toISOString();
  if (nowISO < reopenISO) {
    return { cutoff: reopenISO, suppress: true, reopenISO };
  }
  const cutoff =
    lastViewedAt && lastViewedAt > reopenISO ? lastViewedAt : reopenISO;
  return { cutoff, suppress: false, reopenISO };
}
