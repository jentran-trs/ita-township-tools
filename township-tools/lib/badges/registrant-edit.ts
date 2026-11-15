import { recipientKey } from '@/lib/certificates/xlsx-import';

// Fix someone's badge details (name typo, title, township/county, company).
// Same rules as the admin Edit: marks the person hand-edited so a later AMO
// import keeps the fix, remembers how AMO knew them so the import still
// matches, and copies the change to an issued certificate.

export type DetailInput = {
  first_name?: string;
  last_name?: string;
  title?: string | null;
  organization?: string | null;
  township?: string | null;
  county?: string | null;
};

const text = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export async function editRegistrantDetails(
  supabase: any,
  current: any,
  input: DetailInput
): Promise<{ error?: string; registrant?: any; certificateUpdated?: boolean }> {
  const patch: Record<string, any> = {};
  for (const k of ['first_name', 'last_name'] as const) {
    if (k in input) {
      const v = text(input[k], 100);
      if (!v) return { error: 'First and last name are required' };
      patch[k] = v;
    }
  }
  if ('title' in input) patch.title = text(input.title, 150) || null;
  if ('organization' in input) patch.organization = text(input.organization, 150) || null;
  // Stored bare ("Oregon", "Allen"); "Township"/"County" are added for display.
  if ('township' in input) patch.township = text(input.township, 100).replace(/\s+township\s*$/i, '') || null;
  if ('county' in input) patch.county = text(input.county, 100).replace(/\s+county\s*$/i, '') || null;
  if (!Object.keys(patch).length) return { error: 'Nothing to update' };

  patch.edited_at = new Date().toISOString();
  if (!current.original_key && !current.is_walk_in) {
    patch.original_key = recipientKey(current.email, current.first_name, current.last_name);
  }

  const { data, error } = await supabase.from('cert_registrants').update(patch).eq('id', current.id).select('*').maybeSingle();
  if (error) return { error: error.message };

  if (current.certificate_id) {
    const cert: Record<string, any> = {};
    if ('first_name' in patch) cert.attendee_first = patch.first_name;
    if ('last_name' in patch) cert.attendee_last = patch.last_name;
    if ('township' in patch) cert.attendee_township = patch.township;
    if ('county' in patch) cert.attendee_county = patch.county;
    if (Object.keys(cert).length) await supabase.from('certificates').update(cert).eq('id', current.certificate_id);
  }
  return { registrant: data, certificateUpdated: !!current.certificate_id };
}
