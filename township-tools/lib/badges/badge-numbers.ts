// Badge numbers (v39) so the check-in table can find a pre-printed badge fast.
//
// - Pre-registered people get badge_number 1, 2, 3… in last-name order the
//   first time badges are loaded for printing. Anyone added later gets the
//   next numbers (in last-name order among themselves), at the end, so the
//   numbers already printed never move.
// - Walk-ins never get a badge_number; they get walkin_number 1, 2, 3… in the
//   order they were added ("Walk-in #2").

type Supa = any;

/** Give every pre-registered person without a number the next numbers. */
export async function assignBadgeNumbers(supabase: Supa, courseId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: rows } = await supabase
      .from('cert_registrants')
      .select('id, badge_number, is_walk_in, last_name, first_name')
      .eq('course_id', courseId)
      .eq('is_walk_in', false)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });
    const list = rows || [];
    const todo = list.filter((r: any) => r.badge_number == null);
    if (!todo.length) return;
    let next = list.reduce((m: number, r: any) => Math.max(m, r.badge_number || 0), 0);
    let clash = false;
    for (const r of todo) {
      next += 1;
      const { error } = await supabase
        .from('cert_registrants')
        .update({ badge_number: next })
        .eq('id', r.id)
        .is('badge_number', null);
      // Another print page numbered at the same moment: start over.
      if (error) {
        clash = true;
        break;
      }
    }
    if (!clash) return;
  }
}

/** Number walk-ins that don't have one yet, in the order they were added. */
export async function assignWalkInNumbers(supabase: Supa, courseId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: rows } = await supabase
      .from('cert_registrants')
      .select('id, walkin_number, created_at')
      .eq('course_id', courseId)
      .eq('is_walk_in', true)
      .order('created_at', { ascending: true });
    const list = rows || [];
    const todo = list.filter((r: any) => r.walkin_number == null);
    if (!todo.length) return;
    let next = list.reduce((m: number, r: any) => Math.max(m, r.walkin_number || 0), 0);
    let clash = false;
    for (const r of todo) {
      next += 1;
      const { error } = await supabase
        .from('cert_registrants')
        .update({ walkin_number: next })
        .eq('id', r.id)
        .is('walkin_number', null);
      if (error) {
        clash = true;
        break;
      }
    }
    if (!clash) return;
  }
}

/**
 * Start the numbers over in last-name order. Only for before the badges are
 * printed (e.g. the print page was opened early, then more people imported).
 */
export async function renumberBadges(supabase: Supa, courseId: string): Promise<void> {
  await supabase.from('cert_registrants').update({ badge_number: null }).eq('course_id', courseId).eq('is_walk_in', false);
  await assignBadgeNumbers(supabase, courseId);
}

/** "#47", "Walk-in #2", or '' when not numbered yet. */
export function badgeNumberLabel(r: { badge_number?: number | null; walkin_number?: number | null; is_walk_in?: boolean }): string {
  if (r.is_walk_in) return r.walkin_number ? `Walk-in #${r.walkin_number}` : '';
  return r.badge_number ? `#${r.badge_number}` : '';
}
