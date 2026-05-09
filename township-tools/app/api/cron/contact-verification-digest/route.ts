import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabaseClient } from '../../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Allow either that
// or a manual call carrying the secret in `?secret=` for admin previews.
function authorize(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === expected) return true;
  return false;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildDigest(supabase: ReturnType<typeof createServerSupabaseClient>) {
  // Weekly window: previous 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Only the actions admin cares about: contact additions, updates, removals,
  // and address changes. Skip no-ops (no_change, skipped, undo, mark_completed,
  // session_finished, address_confirm).
  const ACTIONS_OF_INTEREST = ['create', 'update', 'mark_for_removal', 'address_update'];
  const { data: rows, error } = await supabase
    .from('cv_audit_log')
    .select(
      `id, action, created_at, reviewer_name, reviewer_email, before, after, township_id,
       cv_townships:township_id ( name,
         cv_counties:county_id ( name, cv_regions:region_id ( name ) )
       )`
    )
    .gte('created_at', since)
    .in('action', ACTIONS_OF_INTEREST)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const groups: Record<string, any[]> = {};
  for (const r of rows || []) {
    const reg = (r as any).cv_townships?.cv_counties?.cv_regions?.name || 'Unknown region';
    const cnt = (r as any).cv_townships?.cv_counties?.name || 'Unknown county';
    const twp = (r as any).cv_townships?.name || 'Unknown township';
    const key = `${reg} > ${cnt} County > ${twp}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const totalChanges = (rows || []).length;
  const reviewers = new Set<string>();
  for (const r of rows || []) {
    if (r.reviewer_name || r.reviewer_email) {
      reviewers.add(r.reviewer_name || r.reviewer_email!);
    }
  }

  return { rows, groups, totalChanges, reviewers, since };
}

function renderEmail({ groups, totalChanges, reviewers, since }: any) {
  const sections = Object.entries(groups)
    .map(([k, items]: [string, any[]]) => {
      const lines = items
        .map((it) => {
          const who = it.reviewer_name || it.reviewer_email || '(anonymous)';
          const what = String(it.action).replace(/_/g, ' ');
          const name =
            (it.after?.first_name || it.before?.first_name || '') +
            ' ' +
            (it.after?.last_name || it.before?.last_name || '');
          const when = new Date(it.created_at).toLocaleString();
          return `<li><strong>${escapeHtml(what)}</strong> ${escapeHtml(name.trim() ? '· ' + name.trim() : '')} <span style="color:#666">by ${escapeHtml(who)} at ${escapeHtml(when)}</span></li>`;
        })
        .join('');
      return `<h3 style="margin:18px 0 6px;font-size:14px">${escapeHtml(k)}</h3><ul style="margin:0;padding-left:18px">${lines}</ul>`;
    })
    .join('');

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;font-size:14px;line-height:1.5">
      <h2 style="margin:0 0 4px;font-size:18px">Township Contact Verification — weekly summary</h2>
      <p style="margin:0 0 12px;color:#555">
        ${totalChanges} change${totalChanges === 1 ? '' : 's'} in the last 7 days from
        ${reviewers.size} reviewer${reviewers.size === 1 ? '' : 's'} since ${escapeHtml(new Date(since).toLocaleDateString())}.
      </p>
      ${totalChanges === 0 ? '<p style="color:#666">No changes this week.</p>' : sections}
    </div>
  `;
}

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data: settings } = await supabase
    .from('cv_settings')
    .select('digest_enabled, digest_recipient_email, digest_last_sent_at')
    .eq('id', 1)
    .maybeSingle();

  if (!settings?.digest_enabled) return NextResponse.json({ skipped: 'digest_not_enabled' });
  if (!settings.digest_recipient_email) return NextResponse.json({ skipped: 'no_recipient_email' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const { totalChanges, groups, reviewers, since } = await buildDigest(supabase);

  // Skip weeks with no activity (cleaner inbox)
  if (totalChanges === 0) return NextResponse.json({ skipped: 'no_activity' });

  const html = renderEmail({ groups, totalChanges, reviewers, since });
  const fromEmail = process.env.DIGEST_FROM_EMAIL || 'Township Tools <onboarding@resend.dev>';

  const resend = new Resend(apiKey);
  const subject = `Township contacts: ${totalChanges} change${totalChanges === 1 ? '' : 's'} this week`;
  const result = await resend.emails.send({
    from: fromEmail,
    to: settings.digest_recipient_email,
    subject,
    html,
  });

  if ((result as any)?.error) {
    return NextResponse.json({ error: (result as any).error }, { status: 500 });
  }

  await supabase
    .from('cv_settings')
    .update({ digest_last_sent_at: new Date().toISOString() })
    .eq('id', 1);

  return NextResponse.json({ ok: true, sent: settings.digest_recipient_email, changes: totalChanges });
}
