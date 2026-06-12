import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUESTION = 1000;
const MAX_FIELD = 120;

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// POST — public. An attendee submits a question to a session's submit_code.
// Body: { submit_code, question, name, township?, county?, hp? }
//   hp is a honeypot: if a bot fills it, we pretend success and insert nothing.
// Identity/throttle is handled per-browser on the client (localStorage); IP is
// intentionally NOT used because convention attendees share one venue WiFi.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Honeypot: hidden field that only bots fill. Silently accept, insert nothing.
  if (typeof body?.hp === 'string' && body.hp.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const submitCode = clean(body?.submit_code, 40);
  const question = clean(body?.question, MAX_QUESTION);
  const name = clean(body?.name, MAX_FIELD);
  const township = clean(body?.township, MAX_FIELD) || null;
  const county = clean(body?.county, MAX_FIELD) || null;

  if (!submitCode) return NextResponse.json({ error: 'Missing session code' }, { status: 400 });
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: session, error: sErr } = await supabase
    .from('lqa_sessions')
    .select('id, status')
    .eq('submit_code', submitCode)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status === 'closed') {
    return NextResponse.json(
      { error: 'This Q&A session is closed and no longer accepting questions.' },
      { status: 423 }
    );
  }

  const { error: insErr } = await supabase.from('lqa_questions').insert({
    session_id: session.id,
    question,
    name,
    township,
    county,
    status: 'pending',
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Never echo the row — nothing is public until an organizer approves it.
  return NextResponse.json({ ok: true });
}
