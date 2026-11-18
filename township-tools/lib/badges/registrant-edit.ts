import { recipientKey } from '@/lib/certificates/xlsx-import';

// Fix someone's badge details (name typo, title, township/county, company).
// Same rules as the admin Edit: marks the person hand-edited so a later AMO
// import keeps the fix, remembers how AMO knew them so the import still
// matches, and copies the change to an issued certificate.
//
// Substitute ("someone else is attending"): the registration becomes the
// person attending, and the original registrant's details are kept in
// `substituted_for` (v44) so we know whose registration it was.

export type DetailInput = {
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string | null;
  organization?: string | null;
  township?: string | null;
  county?: string | null;
};

export type OriginalRegistrant = {
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  township: string | null;
  county: string | null;
  organization: string | null;
};

/** "Sheri Bartoli" when someone else is attending on this registration. */
export function inPlaceOf(r: { substituted_for?: Partial<OriginalRegistrant> | null }): string | null {
  const s = r.substituted_for;
  if (!s) return null;
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || null;
}

const text = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Patch fields that record a substitute (the first original is always kept). */
export function substitutePatch(current: any, by: string): Record<string, any> {
  if (current.substituted_for) return { substituted_at: new Date().toISOString(), substituted_by: by };
  const original: OriginalRegistrant = {
    first_name: current.first_name,
    last_name: current.last_name,
    email: current.email || null,
    title: current.title ?? null,
    township: current.township ?? null,
    county: current.county ?? null,
    organization: current.organization ?? null,
  };
  return { substituted_for: original, substituted_at: new Date().toISOString(), substituted_by: by };
}

/** Patch fields that put the original registrant back (they're attending after all). */
export function undoSubstitutePatch(current: any): Record<string, any> | null {
  const s = current.substituted_for as OriginalRegistrant | null;
  if (!s) return null;
  return {
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email || current.email,
    title: s.title,
    township: s.township,
    county: s.county,
    organization: s.organization,
    substituted_for: null,
    substituted_at: null,
    substituted_by: null,
  };
}

/** Copy name/email/place changes to an issued certificate. */
export async function syncCertificate(supabase: any, certificateId: string | null, patch: Record<string, any>) {
  if (!certificateId) return;
  const cert: Record<string, any> = {};
  if ('first_name' in patch) cert.attendee_first = patch.first_name;
  if ('last_name' in patch) cert.attendee_last = patch.last_name;
  if ('email' in patch && patch.email) cert.attendee_email = patch.email;
  if ('township' in patch) cert.attendee_township = patch.township;
  if ('county' in patch) cert.attendee_county = patch.county;
  if (Object.keys(cert).length) await supabase.from('certificates').update(cert).eq('id', certificateId);
}

export async function editRegistrantDetails(
  supabase: any,
  current: any,
  input: DetailInput,
  opts: { substitute?: boolean; by?: string } = {}
): Promise<{ error?: string; registrant?: any; certificateUpdated?: boolean }> {
  const patch: Record<string, any> = {};
  for (const k of ['first_name', 'last_name'] as const) {
    if (k in input) {
      const v = text(input[k], 100);
      if (!v) return { error: 'First and last name are required' };
      patch[k] = v;
    }
  }
  if ('email' in input) {
    const email = text(input.email, 200).toLowerCase();
    if (email && !EMAIL.test(email)) return { error: 'That email address does not look right' };
    if (email) patch.email = email;
  }
  if ('title' in input) patch.title = text(input.title, 150) || null;
  if ('organization' in input) patch.organization = text(input.organization, 150) || null;
  // Stored bare ("Oregon", "Allen"); "Township"/"County" are added for display.
  if ('township' in input) patch.township = text(input.township, 100).replace(/\s+township\s*$/i, '') || null;
  if ('county' in input) patch.county = text(input.county, 100).replace(/\s+county\s*$/i, '') || null;
  if (!Object.keys(patch).length) return { error: 'Nothing to update' };

  if (opts.substitute) {
    if (!patch.first_name || !patch.last_name) return { error: "Enter the name of the person who's attending" };
    if (!patch.email) return { error: 'Email is required, so they can get their certificate' };
    const sameName =
      patch.first_name.toLowerCase() === String(current.first_name || '').toLowerCase() &&
      patch.last_name.toLowerCase() === String(current.last_name || '').toLowerCase();
    if (sameName) return { error: "That's the same name as the registration. Use Fix name for a spelling fix." };
    Object.assign(patch, substitutePatch(current, opts.by || 'Scanner'));
  }

  patch.edited_at = new Date().toISOString();
  if (!current.original_key && !current.is_walk_in) {
    patch.original_key = recipientKey(current.email, current.first_name, current.last_name);
  }

  const { data, error } = await supabase.from('cert_registrants').update(patch).eq('id', current.id).select('*').maybeSingle();
  if (error) return { error: error.message };
  await syncCertificate(supabase, current.certificate_id || null, patch);
  return { registrant: data, certificateUpdated: !!current.certificate_id };
}
