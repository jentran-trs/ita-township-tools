// Append "Township" to a typed township name unless it's already there.
// "Vernon" -> "Vernon Township"; "Vernon Township" -> "Vernon Township".
export function townshipLabel(township: string | null | undefined): string | null {
  const t = (township || '').trim();
  if (!t) return null;
  return /\btownship\s*$/i.test(t) ? t : `${t} Township`;
}
