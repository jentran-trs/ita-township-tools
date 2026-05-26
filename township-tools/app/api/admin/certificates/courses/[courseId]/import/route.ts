import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';
import {
  AttendeeRow,
  findInFileDuplicates,
  parseAttendeeWorkbook,
  recipientKey,
} from '../../../../../../../lib/certificates/xlsx-import';
import {
  buildCredentialId,
  generateUniqueCredentialId,
} from '../../../../../../../lib/certificates/credential-id';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteParams = { params: { courseId: string } };

type ParsedRow = AttendeeRow & {
  // Server-set diagnostics
  inFileDuplicate: boolean;
  alreadyIssued: boolean;
};

// POST  multipart/form-data
//   file       File          xlsx or csv
//   mode       'preview' | 'commit'
//   dupePolicy 'skip' | 'reissue'      what to do with rows whose email is already issued for this course
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const mode = (form.get('mode') as string | null) || 'preview';
  const dupePolicy = (form.get('dupePolicy') as string | null) || 'skip';

  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!['preview', 'commit'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be preview or commit' }, { status: 400 });
  }
  if (!['skip', 'reissue'].includes(dupePolicy)) {
    return NextResponse.json({ error: 'dupePolicy must be skip or reissue' }, { status: 400 });
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
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parseAttendeeWorkbook(buffer, file.name);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to parse file' }, { status: 400 });
  }

  const inFile = findInFileDuplicates(parsed);

  // Cross-course check: existing certificates for THIS course that match the
  // composite identity (email + first + last). Two people sharing an email
  // with different names are NOT treated as duplicates.
  const emails = Array.from(new Set(parsed.map((r) => r.email).filter(Boolean)));
  let alreadyIssuedKeys = new Set<string>();
  if (emails.length) {
    const { data: existing, error: exErr } = await supabase
      .from('certificates')
      .select('attendee_email, attendee_first, attendee_last, status')
      .eq('course_id', course.id)
      .in('attendee_email', emails)
      .neq('status', 'reissued');
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    alreadyIssuedKeys = new Set(
      (existing || []).map((r: any) =>
        recipientKey(r.attendee_email, r.attendee_first, r.attendee_last)
      )
    );
  }

  const rows: ParsedRow[] = parsed.map((r, i) => ({
    ...r,
    inFileDuplicate: inFile.has(i),
    alreadyIssued: r.email ? alreadyIssuedKeys.has(recipientKey(r.email, r.first, r.last)) : false,
  }));

  const summary = summarize(rows);

  if (mode === 'preview') {
    return NextResponse.json({ ok: true, mode: 'preview', course, rows, summary });
  }

  // Commit mode: insert credential rows. Honor dupePolicy:
  //   skip    → ignore rows that are already-issued
  //   reissue → mark existing active row(s) reissued, then insert a new row
  const inserted: any[] = [];
  const skipped: any[] = [];
  const reissuedOld: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.issues.length) {
      skipped.push({ row_number: r.row_number, reason: r.issues.join('; ') });
      continue;
    }
    if (r.inFileDuplicate) {
      skipped.push({ row_number: r.row_number, reason: 'Same person appears earlier in this file' });
      continue;
    }
    if (r.alreadyIssued) {
      if (dupePolicy === 'skip') {
        skipped.push({
          row_number: r.row_number,
          reason: 'Already has a certificate for this course; left as-is',
        });
        continue;
      }
      // Mark active certs for the SAME identity (email + first + last) in
      // this course as reissued. We refuse to touch certificates that share
      // the email but belong to a different person.
      const { data: olds } = await supabase
        .from('certificates')
        .select('id, attendee_first, attendee_last')
        .eq('course_id', course.id)
        .eq('attendee_email', r.email)
        .eq('status', 'active');
      const matching = (olds || []).filter(
        (o: any) =>
          recipientKey(r.email, o.attendee_first, o.attendee_last) ===
          recipientKey(r.email, r.first, r.last)
      );
      if (matching.length) {
        const ids = matching.map((o: any) => o.id);
        await supabase.from('certificates').update({ status: 'reissued' }).in('id', ids);
        reissuedOld.push(...ids);
      }
    }

    // Generate a unique credential id (retry on rare collision)
    let credentialId: string;
    try {
      credentialId = await generateUniqueCredentialId(course.course_id, async (candidate) => {
        const { data } = await supabase
          .from('certificates')
          .select('id')
          .eq('credential_id', candidate)
          .maybeSingle();
        return !!data;
      });
    } catch {
      credentialId = buildCredentialId(course.course_id);
    }

    const { data: newRow, error: insErr } = await supabase
      .from('certificates')
      .insert({
        credential_id: credentialId,
        course_id: course.id,
        attendee_first: r.first,
        attendee_last: r.last,
        attendee_email: r.email,
        attendee_township: r.township,
        attendee_county: r.county,
        status: 'active',
      })
      .select()
      .single();
    if (insErr) {
      skipped.push({ row_number: r.row_number, reason: insErr.message });
      continue;
    }
    inserted.push(newRow);
  }

  return NextResponse.json({
    ok: true,
    mode: 'commit',
    course,
    written: { inserted_count: inserted.length, skipped_count: skipped.length, reissued_count: reissuedOld.length },
    inserted: inserted.map((r) => ({ id: r.id, credential_id: r.credential_id, email: r.attendee_email })),
    skipped,
  });
}

function summarize(rows: ParsedRow[]) {
  const total = rows.length;
  const valid = rows.filter((r) => r.issues.length === 0 && !r.inFileDuplicate && !r.alreadyIssued).length;
  const inFileDupes = rows.filter((r) => r.inFileDuplicate).length;
  const alreadyIssued = rows.filter((r) => r.alreadyIssued).length;
  const missingFields = rows.filter((r) => r.issues.length > 0).length;
  return { total, valid, inFileDupes, alreadyIssued, missingFields };
}
