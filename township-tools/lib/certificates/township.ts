// Display a township name with the word "Township" appended, unless it's
// already there. "Oregon" -> "Oregon Township"; "Oregon Township" stays put.
// Township is stored as the bare name; this is the canonical display form.
export function townshipLabel(township: string | null | undefined): string | null {
  const t = (township || '').trim();
  if (!t) return null;
  return /\btownship\s*$/i.test(t) ? t : `${t} Township`;
}
