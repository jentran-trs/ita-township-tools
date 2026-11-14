import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { assignBadgeNumbers, renumberBadges } from '@/lib/badges/badge-numbers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { mode: 'assign' | 'renumber' }
//   assign   — number anyone who doesn't have a badge number yet (next numbers).
//   renumber — start over in last-name order. Only before badges are printed.
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const body = await req.json().catch(() => ({}));
  const supabase = createServerSupabaseClient();
  if (body?.mode === 'renumber') await renumberBadges(supabase, params.courseId);
  else await assignBadgeNumbers(supabase, params.courseId);
  return NextResponse.json({ ok: true });
}
