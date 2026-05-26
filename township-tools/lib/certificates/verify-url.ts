function publicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function buildVerifyUrl(credentialId: string): string {
  return `${publicBaseUrl()}/certificates/verify/${encodeURIComponent(credentialId)}`;
}

export function buildVerifyUrlFromRequest(host: string | null, credentialId: string): string {
  if (!host) return buildVerifyUrl(credentialId);
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/certificates/verify/${encodeURIComponent(credentialId)}`;
}
