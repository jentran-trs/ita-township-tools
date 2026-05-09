import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — admin-triggered test send. Always sends regardless of activity.
export async function POST() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data: settings } = await supabase
    .from('cv_settings')
    .select('digest_recipient_email')
    .eq('id', 1)
    .maybeSingle();

  if (!settings?.digest_recipient_email) {
    return NextResponse.json({ skipped: 'no_recipient_email_set' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ACTIONS_OF_INTEREST = ['create', 'update', 'mark_for_removal', 'address_update'];
  const { data: rows } = await supabase
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

  const groups: Record<string, any[]> = {};
  for (const r of rows || []) {
    const reg = (r as any).cv_townships?.cv_counties?.cv_regions?.name || 'Unknown region';
    const cnt = (r as any).cv_townships?.cv_counties?.name || 'Unknown county';
    const twp = (r as any).cv_townships?.name || 'Unknown township';
    const key = `${reg} > ${cnt} County > ${twp}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const sections = (Object.entries(groups) as [string, any[]][])
    .map(([k, items]) => {
      const lines = items
        .map((it: any) => {
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

  const totalChanges = (rows || []).length;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;font-size:14px;line-height:1.5">
      <h2 style="margin:0 0 4px;font-size:18px">Township Contact Verification — weekly summary (test)</h2>
      <p style="margin:0 0 12px;color:#555">
        ${totalChanges} change${totalChanges === 1 ? '' : 's'} in the last 7 days.
      </p>
      ${totalChanges === 0 ? '<p style="color:#666">No changes in the last 7 days.</p>' : sections}
    </div>
  `;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.DIGEST_FROM_EMAIL || 'Township Tools <onboarding@resend.dev>';
  const result = await resend.emails.send({
    from: fromEmail,
    to: settings.digest_recipient_email,
    subject: `[TEST] Township contacts: ${totalChanges} change${totalChanges === 1 ? '' : 's'} this week`,
    html,
  });

  if ((result as any)?.error) {
    return NextResponse.json({ error: (result as any).error.message || 'Send failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: settings.digest_recipient_email, changes: totalChanges });
}
