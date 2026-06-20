import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Organization (township) address. The parsed columns use AMO's exact headers
// so they map on re-import; the "(raw)" columns carry the exact stored text as
// a fallback for review.
const ORG_ADDRESS_COLUMNS = [
  { header: 'Organization Street Address', key: 'org_addr_line1' },
  { header: 'Organization Street Address 2', key: 'org_addr_line2' },
  { header: 'Organization Street City', key: 'org_addr_city' },
  { header: 'Organization Street State', key: 'org_addr_state' },
  { header: 'Organization Street Zip Code', key: 'org_addr_zip' },
  { header: 'Organization Street Country', key: 'org_addr_country' },
  { header: 'Organization Address (raw)', key: 'org_street_raw' },
  { header: 'Organization Mailing Address (raw)', key: 'org_mailing_raw' },
];

// Simple format: location context + the core contact fields.
const SIMPLE_COLUMNS = [
  { header: 'Individual AMO ID', key: 'amo_individual_id' },
  { header: 'Region', key: 'region' },
  { header: 'County', key: 'county' },
  { header: 'Organization Name', key: 'organization_name' },
  ...ORG_ADDRESS_COLUMNS,
  { header: 'First Name', key: 'first_name' },
  { header: 'Last Name', key: 'last_name' },
  { header: 'Email', key: 'email' },
  { header: 'Title', key: 'title' },
  { header: 'Phone Number', key: 'phone' },
];

// Detailed columns for full audit-style export.
const DETAILED_COLUMNS = [
  { header: 'Individual AMO ID', key: 'amo_individual_id' },
  { header: 'Region', key: 'region' },
  { header: 'County', key: 'county' },
  { header: 'Organization Name', key: 'organization_name' },
  ...ORG_ADDRESS_COLUMNS,
  { header: 'First Name', key: 'first_name' },
  { header: 'Last Name', key: 'last_name' },
  { header: 'Title', key: 'title' },
  { header: 'Email Address', key: 'email' },
  { header: 'Mobile Phone', key: 'phone' },
  { header: 'Email Status', key: 'email_status' },
  { header: 'Previous Email', key: 'previous_email' },
  { header: 'Previous Email Status', key: 'previous_email_status' },
  { header: 'Record Status', key: 'review_status' },
  { header: 'Reviewed By', key: 'reviewed_by_name' },
  { header: 'Reviewed At', key: 'reviewed_at' },
  { header: 'AMO Synced At', key: 'amo_updated_at' },
  { header: 'AMO Synced By', key: 'amo_updated_by' },
];

// Best-effort split of the portal's single free-text township address into
// AMO's structured fields. The data is inconsistent ("St, City, State, Zip" vs
// "St, City State Zip", state as "IN"/"Indiana", no country), so this is a
// convenience parse — the raw value is exported alongside for review.
function parseAddress(raw: string): {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
} {
  const out = { line1: '', line2: '', city: '', state: '', zip: '', country: '' };
  const s = (raw || '').trim();
  if (!s) return out;
  out.country = 'United States';

  let rest = s;
  const zipMatch = rest.match(/(\d{5}(?:-\d{4})?)\s*$/);
  if (zipMatch) {
    out.zip = zipMatch[1];
    rest = rest.slice(0, zipMatch.index).replace(/[,\s]+$/, '');
  }
  const parts = rest.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    out.state = parts[parts.length - 1];
    out.city = parts[parts.length - 2];
    out.line1 = parts.slice(0, parts.length - 2).join(', ');
  } else if (parts.length === 2) {
    const tail = parts[1].split(/\s+/);
    if (tail.length >= 2) {
      out.state = tail[tail.length - 1];
      out.city = tail.slice(0, -1).join(' ');
    } else {
      out.city = parts[1];
    }
    out.line1 = parts[0];
  } else if (parts.length === 1) {
    out.line1 = parts[0];
  }
  if (out.state && out.state.length <= 3) out.state = out.state.toUpperCase();
  return out;
}

// AMO's "Organization" field format, e.g. "Vernon Township, Hancock County".
// Appends "Township"/"County" only when not already present.
function organizationName(township: string, county: string): string {
  const t = (township || '').trim();
  const c = (county || '').trim();
  const twp = t ? (/\btownship\s*$/i.test(t) ? t : `${t} Township`) : '';
  const cty = c ? (/\bcounty\s*$/i.test(c) ? c : `${c} County`) : '';
  return [twp, cty].filter(Boolean).join(', ');
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function loadContacts(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope');
  const id = url.searchParams.get('id');
  const format = (url.searchParams.get('format') || 'xlsx') as 'xlsx' | 'csv';
  const variant = (url.searchParams.get('variant') || 'simple') as 'simple' | 'detailed';
  const idsParam = url.searchParams.get('ids');

  let body: any = null;
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = null;
    }
  }
  const contactIds: string[] | null =
    body?.contactIds ??
    (idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : null);

  if (!contactIds && (!scope || !id)) {
    return { error: NextResponse.json({ error: 'Provide contactIds or scope+id' }, { status: 400 }) };
  }
  if (scope && !['region', 'county', 'township'].includes(scope)) {
    return { error: NextResponse.json({ error: 'Invalid scope' }, { status: 400 }) };
  }

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('cv_contacts')
    .select(
      `id, first_name, last_name, title, email, phone, email_status,
       previous_email, previous_email_status,
       review_status, reviewed_at, reviewed_by_name,
       amo_updated_at, amo_updated_by, amo_individual_id,
       cv_townships:township_id ( id, name, street_address, mailing_address,
         cv_counties:county_id ( id, name, cv_regions:region_id ( id, name ) )
       )`
    )
    .is('deleted_at', null);

  if (contactIds && contactIds.length > 0) {
    query = query.in('id', contactIds);
  } else if (scope === 'township') {
    query = query.eq('township_id', id!);
  } else if (scope === 'county') {
    const { data: ts } = await supabase.from('cv_townships').select('id').eq('county_id', id!);
    query = query.in('township_id', (ts || []).map((t: any) => t.id));
  } else if (scope === 'region') {
    const { data: cs } = await supabase.from('cv_counties').select('id').eq('region_id', id!);
    const countyIds = (cs || []).map((c: any) => c.id);
    const { data: ts } = await supabase.from('cv_townships').select('id').in('county_id', countyIds);
    query = query.in('township_id', (ts || []).map((t: any) => t.id));
  }

  const { data: contacts, error } = await query;
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  return { contacts, format, variant, scope, id, contactIds };
}

export async function GET(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const loaded = await loadContacts(req);
  if (loaded.error) return loaded.error;
  return buildResponse(loaded);
}

export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const loaded = await loadContacts(req);
  if (loaded.error) return loaded.error;
  return buildResponse(loaded);
}

async function buildResponse(loaded: any) {
  const { contacts, format, variant, scope, id, contactIds } = loaded;

  const rows = (contacts || []).map((c: any) => {
    const street = c.cv_townships?.street_address || '';
    const a = parseAddress(street);
    return {
    amo_individual_id: c.amo_individual_id || '',
    region: c.cv_townships?.cv_counties?.cv_regions?.name || '',
    county: c.cv_townships?.cv_counties?.name || '',
    township: c.cv_townships?.name || '',
    organization_name: organizationName(
      c.cv_townships?.name || '',
      c.cv_townships?.cv_counties?.name || ''
    ),
    org_addr_line1: a.line1,
    org_addr_line2: a.line2,
    org_addr_city: a.city,
    org_addr_state: a.state,
    org_addr_zip: a.zip,
    org_addr_country: a.country,
    org_street_raw: street,
    org_mailing_raw: c.cv_townships?.mailing_address || '',
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    title: c.title || '',
    email: c.email || '',
    phone: c.phone || '',
    email_status: c.email_status || '',
    previous_email: c.previous_email || '',
    previous_email_status: c.previous_email_status || '',
    review_status: c.review_status || '',
    reviewed_by_name: c.reviewed_by_name || '',
    reviewed_at: c.reviewed_at ? new Date(c.reviewed_at).toISOString() : '',
    amo_updated_at: c.amo_updated_at ? new Date(c.amo_updated_at).toISOString() : '',
    amo_updated_by: c.amo_updated_by || '',
    };
  });

  rows.sort((a: any, b: any) => {
    const k = (r: any) => `${r.region}|${r.county}|${r.township}|${r.last_name}|${r.first_name}`;
    return k(a).localeCompare(k(b));
  });

  const columns = variant === 'detailed' ? DETAILED_COLUMNS : SIMPLE_COLUMNS;

  const baseLabel = contactIds && contactIds.length
    ? `selected-${contactIds.length}`
    : `${scope}-${(id || '').slice(0, 8)}`;
  const filenameBase = `contacts-${baseLabel}-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'csv') {
    const header = columns.map((c) => c.header).join(',');
    const body = rows.map((r: any) => columns.map((c) => csvEscape(r[c.key])).join(',')).join('\n');
    const csv = `${header}\n${body}\n`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Contacts');
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  for (const row of rows) ws.addRow(row);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
