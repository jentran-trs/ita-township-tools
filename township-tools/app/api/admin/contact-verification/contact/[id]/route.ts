import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'title',
  'email',
  'phone',
  'email_status',
] as const;

// PATCH — superadmin edit. Lets the admin overwrite any contact field
// (including email_status) and optionally preserve the "Needs review" flag so
// the township still has to confirm. Bypasses portal lock.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const contactId = params.id;
  const body = await req.json().catch(() => ({}));
  const changes: Record<string, any> = body?.changes || {};
  const keepUnreviewed = body?.keepUnreviewed !== false; // default true

  const supabase = createServerSupabaseClient();

  const { data: existing, error: exErr } = await supabase
    .from('cv_contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Resolve admin identity so the audit log credits the right person.
  let adminDisplay = 'Admin';
  let adminEmail: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(authData.userId);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    adminEmail = user.emailAddresses?.[0]?.emailAddress || null;
    adminDisplay = fullName || adminEmail || 'Admin';
  } catch {}
  const adminTaggedName = `${adminDisplay} (admin)`;

  const update: Record<string, any> = {};
  let dataChanged = false;
  for (const k of EDITABLE_FIELDS) {
    if (k in changes) {
      const v = changes[k];
      const next = v === '' || v === undefined ? null : v;
      update[k] = next;
      if ((existing[k] ?? null) !== (next ?? null)) dataChanged = true;
    }
  }

  // Any change to the contact's data invalidates the previous AMO sync.
  if (dataChanged && existing.amo_updated_at) {
    update.amo_updated_at = null;
    update.amo_updated_by = null;
  }

  // Snapshot the original values on first edit so a future "Undo" can restore
  // them — same behavior as the user-facing PATCH path.
  if (!existing.original_values && existing.review_status !== 'newly_added') {
    update.original_values = {
      first_name: existing.first_name,
      last_name: existing.last_name,
      title: existing.title,
      email: existing.email,
      phone: existing.phone,
      email_status: existing.email_status,
    };
  }

  // Capture the email-only snapshot for the "Previously: …" UI hint when the
  // email is being changed. Don't auto-overwrite email_status here — admin
  // sets it explicitly via the form.
  if ('email' in changes) {
    const newEmail = (changes.email || '').toString().toLowerCase().trim();
    const oldEmail = (existing.email || '').toLowerCase().trim();
    if (newEmail !== oldEmail && !existing.previous_email) {
      update.previous_email = existing.email;
      update.previous_email_status = existing.email_status;
    }
  }

  if (keepUnreviewed) {
    update.review_status = 'unreviewed';
    update.reviewed_at = null;
    update.reviewed_by_name = null;
    update.reviewed_by_email = null;
  } else {
    update.review_status = existing.review_status === 'newly_added' ? 'newly_added' : 'updated';
    update.reviewed_at = new Date().toISOString();
    update.reviewed_by_name = adminTaggedName;
    update.reviewed_by_email = adminEmail;
  }

  const { data: updated, error: upErr } = await supabase
    .from('cv_contacts')
    .update(update)
    .eq('id', contactId)
    .select()
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: existing.township_id,
    contact_id: contactId,
    action: 'admin_edit',
    before: existing,
    after: updated,
    reviewer_name: adminTaggedName,
    reviewer_email: adminEmail,
  });

  // Reopen the township if it was already marked completed — mirrors the
  // user-facing flow so the dashboard reflects the new pending work.
  const { data: t } = await supabase
    .from('cv_townships')
    .select('status')
    .eq('id', existing.township_id)
    .maybeSingle();
  if (t && t.status !== 'in_progress') {
    await supabase
      .from('cv_townships')
      .update({ status: 'in_progress' })
      .eq('id', existing.township_id);
  }

  return NextResponse.json({ contact: updated });
}
