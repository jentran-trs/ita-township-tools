import { NextResponse } from 'next/server';
import { PASSCODE_HEADER } from '@/lib/merger-map/auth';

// The merger map is pasted into the ITA website (AMO, a different origin) and
// calls these routes from the browser. Writes are authorized by the passcode
// header, not cookies, so a wildcard origin is safe here.
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': `Content-Type, ${PASSCODE_HEADER}`,
  'Access-Control-Max-Age': '86400',
};

export function withCors<T extends Response>(res: T): T {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
