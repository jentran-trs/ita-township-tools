// Display a township name with the word "Township" appended, but only when
// it's a bare township name. "Oregon" -> "Oregon Township"; "Oregon Township"
// stays put. Township is stored as the bare name; this is the canonical
// display form.
//
// AMO's Township/Organization fields often hold full names instead
// ("Wayne Township Fire Department", "Indiana Township Association",
// "Cass County Fire District/Eel", "Penn Township Trustee"); those are shown
// exactly as entered, never with another "Township" tacked on.
const NOT_A_BARE_NAME =
  /\b(township|twp|townships|county|co|association|assoc|fire|department|dept|district|territory|trustee|rescue|ems|police|library|office|inc|llc|company|corp|corporation|city|town|school|board|services?)\b|[\/&,()\d]/i;

export function townshipLabel(township: string | null | undefined): string | null {
  const t = (township || '').trim();
  if (!t) return null;
  return NOT_A_BARE_NAME.test(t) ? t : `${t} Township`;
}

/**
 * Organization to show as an extra line on badges/labels when the person also
 * has a township or county (otherwise the organization is already the place
 * line). Skipped when it just repeats the township.
 */
export function extraOrganization(p: { township?: string | null; county?: string | null; organization?: string | null }): string | null {
  const org = (p.organization || '').trim();
  if (!org || !(p.township || p.county)) return null;
  const twp = (p.township || '').trim().toLowerCase();
  const o = org.toLowerCase();
  if (twp && (o === twp || o === `${twp} township` || o === townshipLabel(p.township)?.toLowerCase())) return null;
  return org;
}
