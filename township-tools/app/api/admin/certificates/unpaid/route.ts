import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — every registration still unpaid (payment_status 'due'), at every event,
// newest event first. Cancelled registrations aren't debts. The page groups
// them by person (email, else first + last name).
export async function GET() {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const supabase = createServerSupabaseClient();

  const { data: regs, error } = await supabase
    .from('cert_registrants')
    .select('id, course_id, first_name, last_name, email, title, township, county, organization, balance_due, is_walk_in')
    .eq('payment_status', 'due')
    .is('cancelled_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = regs || [];
  if (!list.length) return NextResponse.json({ rows: [] });

  const courseIds = Array.from(new Set(list.map((r: any) => r.course_id)));
  const { data: courses } = await supabase.from('cert_courses').select('id, name, course_date').in('id', courseIds);
  const courseById = new Map<string, any>((courses || []).map((c: any) => [c.id, c]));

  // Did they come? (any scan that wasn't undone)
  const came = new Set<string>();
  const ids = list.map((r: any) => r.id);
  for (let i = 0; i < ids.length; i += 500) {
    const { data: scans } = await supabase
      .from('cert_attendance_scans')
      .select('registrant_id')
      .in('registrant_id', ids.slice(i, i + 500))
      .is('voided_at', null);
    (scans || []).forEach((s: any) => came.add(s.registrant_id));
  }

  const rows = list
    .map((r: any) => {
      const c = courseById.get(r.course_id);
      return {
        registrant_id: r.id,
        course_id: r.course_id,
        course_name: c?.name || 'Event',
        course_date: c?.course_date || '',
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email || '',
        title: r.title,
        township: r.township,
        county: r.county,
        organization: r.organization,
        balance_due: r.balance_due != null ? Number(r.balance_due) : null,
        is_walk_in: r.is_walk_in,
        attended: came.has(r.id),
      };
    })
    .sort((a: any, b: any) => b.course_date.localeCompare(a.course_date) || a.last_name.localeCompare(b.last_name));
  return NextResponse.json({ rows });
}
