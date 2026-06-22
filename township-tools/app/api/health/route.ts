import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight liveness/health probe for uptime monitoring (UptimeRobot, etc.).
// Unlike /api/verify/locations (a ~180KB JSON payload that runs the full DB
// query on every hit), this returns a tiny body and does only a HEAD-count
// ping against cv_regions to confirm the database is reachable. Monitor THIS
// endpoint instead of locations: cheap, fast, and unambiguous (plain 200/503).
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('cv_regions')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json(
        { ok: false, db: 'error', message: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: true, db: 'ok' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || 'health check failed' },
      { status: 503 }
    );
  }
}
