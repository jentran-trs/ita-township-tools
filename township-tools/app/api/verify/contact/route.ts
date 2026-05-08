import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';

type Reviewer = {
  sessionId?: string | null;
  reviewerName?: string | null;
  reviewerEmail?: string | null;
};

async function logAndStampTownship(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  args: {
    townshipId: string;
    contactId: string | null;
    action: string;
    before: any;
    after: any;
    reviewer: Reviewer;
    isCompletion?: boolean;
  }
) {
  await supabase.from('cv_audit_log').insert({
    township_id: args.townshipId,
    contact_id: args.contactId,
    action: args.action,
    before: args.before,
    after: args.after,
    session_id: args.reviewer.sessionId || null,
    reviewer_name: args.reviewer.reviewerName || null,
    reviewer_email: args.reviewer.reviewerEmail || null,
  });

  if (!args.isCompletion) {
    const { data: t } = await supabase
      .from('cv_townships')
      .select('status')
      .eq('id', args.townshipId)
      .maybeSingle();
    if (t && t.status !== 'in_progress') {
      await supabase.from('cv_townships').update({ status: 'in_progress' }).eq('id', args.townshipId);
    }
  }
}

function reviewerFields(reviewer: Reviewer) {
  return {
    reviewed_at: new Date().toISOString(),
    reviewed_by_name: reviewer.reviewerName || null,
    reviewed_by_email: reviewer.reviewerEmail || null,
  };
}

// CREATE — add a new contact
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json();
  const { townshipId, reviewer, contact } = body;
  if (!townshipId || !contact) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data, error } = await supabase
    .from('cv_contacts')
    .insert({
      township_id: townshipId,
      first_name: contact.first_name || null,
      last_name: contact.last_name || null,
      title: contact.title || null,
      email: contact.email || null,
      phone: contact.phone || null,
      email_status: contact.email_status || null,
      review_status: 'newly_added',
      ...reviewerFields(reviewer || {}),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAndStampTownship(supabase, {
    townshipId,
    contactId: data.id,
    action: 'create',
    before: null,
    after: data,
    reviewer: reviewer || {},
  });

  return NextResponse.json({ contact: data });
}

// UPDATE — edit fields, mark "no change", mark for removal, or undo a review
export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json();
  const { contactId, reviewer, changes, markNoChange, markUnreviewed, markForRemoval, markSkipped } = body;
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });

  const { data: existing, error: exErr } = await supabase
    .from('cv_contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, any> = {};
  if (markUnreviewed) {
    update.review_status = 'unreviewed';
    update.reviewed_at = null;
    update.reviewed_by_name = null;
    update.reviewed_by_email = null;
    // Restore from the original-values snapshot if we have one (set on first edit).
    if (existing.original_values && typeof existing.original_values === 'object') {
      const o = existing.original_values as Record<string, any>;
      for (const k of ['first_name', 'last_name', 'title', 'email', 'phone', 'email_status']) {
        if (k in o) update[k] = o[k];
      }
      update.original_values = null;
    }
    // Always clear the email-only snapshot too (legacy + display layer).
    update.previous_email = null;
    update.previous_email_status = null;
  } else {
    Object.assign(update, reviewerFields(reviewer || {}));
    if (markForRemoval) {
      update.review_status = 'needs_removal';
    } else if (markSkipped) {
      update.review_status = 'skipped';
    } else if (markNoChange) {
      update.review_status = 'no_change';
    } else if (changes) {
      const newEmail = 'email' in changes ? (changes.email || null) : existing.email;
      const oldEmail = existing.email;
      const emailChanged =
        'email' in changes &&
        (newEmail || '').toLowerCase().trim() !== (oldEmail || '').toLowerCase().trim();

      // Snapshot every editable field the first time this contact is edited so Undo
      // can restore them all. (Newly-added contacts have no "original" — skip.)
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

      // Keep the email-only snapshot for the "Previously: ..." UI indicator
      if (emailChanged && !existing.previous_email) {
        update.previous_email = oldEmail;
        update.previous_email_status = existing.email_status;
      }

      for (const k of ['first_name', 'last_name', 'title', 'email', 'phone']) {
        if (k in changes) update[k] = changes[k] || null;
      }
      update.review_status = existing.review_status === 'newly_added' ? 'newly_added' : 'updated';
    }
  }

  const { data, error } = await supabase
    .from('cv_contacts')
    .update(update)
    .eq('id', contactId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAndStampTownship(supabase, {
    townshipId: existing.township_id,
    contactId,
    action: markUnreviewed
      ? 'undo_review'
      : markForRemoval
      ? 'mark_for_removal'
      : markSkipped
      ? 'skipped'
      : markNoChange
      ? 'no_change'
      : 'update',
    before: existing,
    after: data,
    reviewer: reviewer || {},
  });

  return NextResponse.json({ contact: data });
}

// DELETE — soft-delete (remove from list)
export async function DELETE(req: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(req.url);
  const contactId = url.searchParams.get('contactId');
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });
  const reviewerName = url.searchParams.get('reviewerName');
  const reviewerEmail = url.searchParams.get('reviewerEmail');
  const sessionId = url.searchParams.get('sessionId');
  const reviewer: Reviewer = { reviewerName, reviewerEmail, sessionId };

  const { data: existing, error: exErr } = await supabase
    .from('cv_contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('cv_contacts')
    .update({
      deleted_at: new Date().toISOString(),
      ...reviewerFields(reviewer),
    })
    .eq('id', contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAndStampTownship(supabase, {
    townshipId: existing.township_id,
    contactId,
    action: 'delete',
    before: existing,
    after: null,
    reviewer,
  });

  return NextResponse.json({ ok: true });
}
