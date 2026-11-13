import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import {
  AttendeeRow,
  findInFileDuplicates,
  parseAttendeeWorkbook,
  recipientKey,
} from '@/lib/certificates/xlsx-import';
import { generateBadgeToken } from '@/lib/badges/token';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteParams = { params: { courseId: string } };

type ParsedRow = AttendeeRow & {
  inFileDuplicate: boolean;
  alreadyRegistered: boolean;
};

// POST multipart/form-data — import the AMO Excel registration list as badge
// registrants for a course. Same file format as the certificate import.
//   file  File                  xlsx or csv
//   mode  'preview' | 'commit'
// Existing registrants (same email + first + last) are updated in place so
// their badge_token — and any badge already printed — keeps working.
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const mode = (form.get('mode') as string | null) || 'preview';
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!['preview', 'commit'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be preview or commit' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: course, error: courseErr } = await supabase
    .from('cert_courses')
    .select('id, course_id, name')
    .eq('id', params.courseId)
    .maybeSingle();
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  let parsed: AttendeeRow[];
  try {
    parsed = await parseAttendeeWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to parse file' }, { status: 400 });
  }

  const { data: existing, error: exErr } = await supabase
    .from('cert_registrants')
    .select('id, email, first_name, last_name, payment_status, payment_method')
    .eq('course_id', course.id);
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  const existingByKey = new Map<string, string>(
    (existing || []).map((r: any) => [recipientKey(r.email, r.first_name, r.last_name), r.id])
  );
  const existingById = new Map<string, any>((existing || []).map((r: any) => [r.id, r]));

  const inFile = findInFileDuplicates(parsed);
  const rows: ParsedRow[] = parsed.map((r, i) => ({
    ...r,
    inFileDuplicate: inFile.has(i),
    alreadyRegistered: existingByKey.has(recipientKey(r.email, r.first, r.last)),
  }));

  const summary = {
    total: rows.length,
    new: rows.filter((r) => !r.issues.length && !r.inFileDuplicate && !r.alreadyRegistered).length,
    alreadyRegistered: rows.filter((r) => r.alreadyRegistered).length,
    inFileDupes: rows.filter((r) => r.inFileDuplicate).length,
    missingFields: rows.filter((r) => r.issues.length > 0).length,
    missingTitle: rows.filter((r) => !r.title).length,
    balanceDue: rows.filter((r) => (r.balance_due ?? 0) > 0).length,
  };

  if (mode === 'preview') {
    return NextResponse.json({ ok: true, mode: 'preview', course, rows, summary });
  }

  const toInsert: any[] = [];
  const skipped: { row_number: number; reason: string }[] = [];
  let updated = 0;

  for (const r of rows) {
    if (r.issues.length) {
      skipped.push({ row_number: r.row_number, reason: r.issues.join('; ') });
      continue;
    }
    if (r.inFileDuplicate) {
      skipped.push({ row_number: r.row_number, reason: 'Same person appears earlier in this file' });
      continue;
    }
    // Balance Due from AMO: $0 (or less) = paid, more = payment due. A
    // payment already taken at the door (check/card) or marked by an admin is
    // never undone by a later re-import that still shows a balance.
    const existingId0 = existingByKey.get(recipientKey(r.email, r.first, r.last));
    const prev = existingId0 ? existingById.get(existingId0) : null;
    const paidElsewhere = prev?.payment_status === 'paid' && prev?.payment_method && prev.payment_method !== 'amo';
    const payment =
      r.balance_due === null
        ? {}
        : r.balance_due <= 0
          ? { balance_due: r.balance_due, payment_status: 'paid', payment_method: paidElsewhere ? prev.payment_method : 'amo' }
          : paidElsewhere
            ? { balance_due: r.balance_due }
            : { balance_due: r.balance_due, payment_status: 'due', payment_method: null };
    const fields = {
      ...payment,
      first_name: r.first,
      last_name: r.last,
      email: r.email,
      title: r.title,
      registrant_type: r.registrant_type,
      organization: r.organization,
      township: r.township,
      county: r.county,
    };
    const existingId = existingByKey.get(recipientKey(r.email, r.first, r.last));
    if (existingId) {
      const { error } = await supabase.from('cert_registrants').update(fields).eq('id', existingId);
      if (error) skipped.push({ row_number: r.row_number, reason: error.message });
      else updated += 1;
      continue;
    }
    toInsert.push({ ...fields, course_id: course.id, badge_token: generateBadgeToken() });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await supabase.from('cert_registrants').insert(toInsert).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted = data?.length ?? 0;
  }

  // Anyone AMO now shows as paid gets their held certificate released.
  const { data: paidWithCert } = await supabase
    .from('cert_registrants')
    .select('certificate_id')
    .eq('course_id', course.id)
    .eq('payment_status', 'paid')
    .not('certificate_id', 'is', null);
  const certIds = (paidWithCert || []).map((r: any) => r.certificate_id).filter(Boolean);
  if (certIds.length) {
    await supabase.from('certificates').update({ payment_hold: false }).in('id', certIds).eq('payment_hold', true);
  }

  return NextResponse.json({
    ok: true,
    mode: 'commit',
    course,
    written: { inserted_count: inserted, updated_count: updated, skipped_count: skipped.length },
    skipped,
  });
}
