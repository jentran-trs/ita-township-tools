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

  // select('*') so this keeps working even before the v22 window columns exist.
  const { data: session, error: sErr } = await supabase
    .from('lqa_sessions')
    .select('*')
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

  // Optional submission window.
  const now = Date.now();
  if (session.submit_opens_at && now < new Date(session.submit_opens_at).getTime()) {
    return NextResponse.json(
      { error: 'Question submissions for this session haven’t opened yet.' },
      { status: 423 }
    );
  }
  if (session.submit_closes_at && now > new Date(session.submit_closes_at).getTime()) {
    return NextResponse.json(
      { error: 'Question submissions for this session have closed.' },
      { status: 423 }
    );
  }

  // No approval step — questions go straight onto the screencast board.
  const { error: insErr } = await supabase.from('lqa_questions').insert({
    session_id: session.id,
    question,
    name,
    township,
    county,
    status: 'approved',
    approved_at: new Date().toISOString(),
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
