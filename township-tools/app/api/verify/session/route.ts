import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';

function getClientIp(req: Request) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const reviewerName = (body.reviewerName || '').toString().trim() || null;
  const reviewerEmail = (body.reviewerEmail || '').toString().trim() || null;
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || null;

  const { data, error } = await supabase
    .from('cv_reviewer_sessions')
    .insert({
      reviewer_name: reviewerName,
      reviewer_email: reviewerEmail,
      ip,
      user_agent: ua,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessionId: data.id });
}
