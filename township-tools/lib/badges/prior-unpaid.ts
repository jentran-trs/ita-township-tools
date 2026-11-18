// People who still owe for an EARLIER badge event. When they register for a
// later event they're flagged so the check-in team collects at the door
// (check-in without collecting is still allowed; the flag stays).
//
// "Still owes" = their registration at the earlier event has
// payment_status 'due'. A match is the same email (preferred) or the same
// first + last name, case-insensitive.

export type PriorDebt = {
  registrant_id: string; // their registration at the earlier event
  course_id: string;
  course_name: string;
  course_date: string;
  balance_due: number | null;
  matched_by: 'email' | 'name';
};

type Person = { id: string; email?: string | null; first_name: string; last_name: string };

const emailKey = (e?: string | null) => (e || '').trim().toLowerCase();
const nameKey = (f: string, l: string) => `${(f || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${(l || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;

/** Map of this event's registrant id → what they still owe from earlier events. */
export async function loadPriorUnpaid(
  supabase: any,
  course: { id: string; course_date: string },
  people: Person[]
): Promise<Map<string, PriorDebt[]>> {
  const out = new Map<string, PriorDebt[]>();
  if (!people.length) return out;

  const { data: earlier } = await supabase
    .from('cert_courses')
    .select('id, name, course_date')
    .eq('badge_checkin_enabled', true)
    .lt('course_date', course.course_date)
    .neq('id', course.id);
  if (!earlier?.length) return out;
  const courseById = new Map<string, any>(earlier.map((c: any) => [c.id, c]));

  const { data: owing } = await supabase
    .from('cert_registrants')
    .select('id, course_id, email, first_name, last_name, balance_due')
    .in('course_id', earlier.map((c: any) => c.id))
    .eq('payment_status', 'due');
  if (!owing?.length) return out;

  const byEmail = new Map<string, any[]>();
  const byName = new Map<string, any[]>();
  for (const r of owing) {
    const e = emailKey(r.email);
    if (e) byEmail.set(e, [...(byEmail.get(e) || []), r]);
    const n = nameKey(r.first_name, r.last_name);
    byName.set(n, [...(byName.get(n) || []), r]);
  }

  for (const p of people) {
    const found = new Map<string, PriorDebt>();
    const add = (r: any, how: 'email' | 'name') => {
      if (found.has(r.id)) return;
      const c = courseById.get(r.course_id);
      found.set(r.id, {
        registrant_id: r.id,
        course_id: r.course_id,
        course_name: c?.name || 'an earlier event',
        course_date: c?.course_date || '',
        balance_due: r.balance_due != null ? Number(r.balance_due) : null,
        matched_by: how,
      });
    };
    const e = emailKey(p.email);
    if (e) (byEmail.get(e) || []).forEach((r) => add(r, 'email'));
    (byName.get(nameKey(p.first_name, p.last_name)) || []).forEach((r) => add(r, 'name'));
    if (found.size) {
      out.set(p.id, Array.from(found.values()).sort((a, b) => a.course_date.localeCompare(b.course_date)));
    }
  }
  return out;
}

/** "$100 from 2026 Public Safety Day" lines, for display. */
export function priorDebtLabel(d: { balance_due: number | null; course_name: string }) {
  return `${d.balance_due ? `$${Number(d.balance_due).toFixed(2)} ` : ''}from ${d.course_name}`;
}
