import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CourseInput = {
  course_id: string;
  name: string;
  hours: number;
  method: 'in_person' | 'online' | 'hybrid';
  course_date: string;
  syllabus?: string | null;
  syllabus_file_url?: string | null;
  syllabus_file_name?: string | null;
  org_name?: string;
  logo_url?: string;
  signatures: Array<{
    signer_name: string;
    signer_title: string;
    signature_image_url: string;
    signer_organization?: string | null;
    display_order?: number;
  }>;
};

// GET — list all courses, sorted by course_date desc, with active_count and last_issued_at
export async function GET() {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cert_course_summary')
    .select('*')
    .order('course_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data || [] });
}

// POST — create a course + signature rows
export async function POST(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: CourseInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const error = validateCourseInput(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Insert the course (course_id uniqueness is enforced by the DB)
  const { data: course, error: courseErr } = await supabase
    .from('cert_courses')
    .insert({
      course_id: body.course_id.trim(),
      name: body.name.trim(),
      hours: body.hours,
      method: body.method,
      course_date: body.course_date,
      syllabus: body.syllabus?.trim() || null,
      syllabus_file_url: body.syllabus_file_url?.trim() || null,
      syllabus_file_name: body.syllabus_file_name?.trim() || null,
      org_name: body.org_name?.trim() || 'Indiana Township Association',
      logo_url: body.logo_url?.trim() || '/certificates/ita-logo.png',
    })
    .select()
    .single();

  if (courseErr) {
    if (courseErr.code === '23505') {
      return NextResponse.json(
        { error: `Course ID "${body.course_id}" already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: courseErr.message }, { status: 500 });
  }

  // Insert signatures
  const sigRows = body.signatures.map((s, idx) => ({
    course_id: course.id,
    signer_name: s.signer_name.trim(),
    signer_title: s.signer_title.trim(),
    signature_image_url: s.signature_image_url.trim(),
    signer_organization: s.signer_organization?.trim() || null,
    display_order: typeof s.display_order === 'number' ? s.display_order : idx,
  }));
  const { error: sigErr } = await supabase.from('cert_signatures').insert(sigRows);
  if (sigErr) {
    // Roll back the course since signatures are required
    await supabase.from('cert_courses').delete().eq('id', course.id);
    return NextResponse.json({ error: sigErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, course });
}

function validateCourseInput(b: any): string | null {
  if (!b || typeof b !== 'object') return 'Body must be an object';
  if (!b.course_id || typeof b.course_id !== 'string' || !b.course_id.trim()) {
    return 'course_id is required';
  }
  if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
    return 'name is required';
  }
  const hours = typeof b.hours === 'string' ? parseFloat(b.hours) : b.hours;
  if (!Number.isFinite(hours) || hours < 0) return 'hours must be a non-negative number';
  b.hours = hours;
  if (!['in_person', 'online', 'hybrid'].includes(b.method)) {
    return 'method must be in_person | online | hybrid';
  }
  if (!b.course_date || typeof b.course_date !== 'string') return 'course_date is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.course_date)) {
    return 'course_date must be YYYY-MM-DD';
  }
  if (!Array.isArray(b.signatures) || b.signatures.length !== 1) {
    return 'Exactly one signer is required';
  }
  for (const s of b.signatures) {
    if (!s.signer_name?.trim()) return 'Every signature requires signer_name';
    if (!s.signer_title?.trim()) return 'Every signature requires signer_title';
    if (!s.signature_image_url?.trim()) return 'Every signature requires signature_image_url';
  }
  return null;
}
