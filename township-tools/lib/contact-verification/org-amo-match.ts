import ExcelJS from 'exceljs';
import { orgName } from './amo-match';

// Match an AMO "Organization Report" export against cv_townships to assign each
// township's AMO Organization ID. Matching is by organization name —
// "<Township> Township, <County> County" — which is the format AMO stores and
// the format our own export builds. Shared with the bulk-assign API route.

export type OrgRow = { id: string; org: string };

export type CvTownship = {
  id: string;
  name: string | null;
  county?: string | null;
  amo_organization_id?: string | null;
};

// Lowercase, trim, and collapse internal whitespace so report-side typos like
// "Township,  County" (double space) still match.
const norm = (s: any) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const cell = (v: any) =>
  v && typeof v === 'object' ? (v.text ?? v.result ?? v.hyperlink ?? '') : v;

export async function parseOrgWorkbook(buffer: Buffer): Promise<OrgRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets.find((s) => s.rowCount > 1) || wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in the file.');

  const header = ((ws.getRow(1).values as any[]) || []).slice(1).map(cell);
  const col = (name: string) => header.findIndex((h) => norm(h) === norm(name));
  const colAny = (...names: string[]) => {
    for (const n of names) {
      const i = col(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const ci = {
    id: colAny('Organization AMO ID', 'Organization Association ID'),
    org: colAny('Organization Name'),
  };
  if (ci.id === -1) {
    throw new Error('Could not find an "Organization AMO ID" column. Use the AMO Organization Report export.');
  }
  if (ci.org === -1) {
    throw new Error('Could not find an "Organization Name" column. Use the AMO Organization Report export.');
  }

  const rows: OrgRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    const v = ((row.values as any[]) || []).slice(1).map(cell);
    const id = String(cell(v[ci.id]) ?? '').trim();
    const org = norm(v[ci.org]);
    if (!id || !org) return;
    rows.push({ id, org });
  });
  return rows;
}

export type OrgMatchResult = {
  matches: { townshipId: string; amoId: string; current: string | null }[];
  ambiguous: number;
  unmatched: number;
};

export function matchTownships(orgs: OrgRow[], townships: CvTownship[]): OrgMatchResult {
  // Group report rows by normalized organization name. A name appearing on more
  // than one row with conflicting IDs is ambiguous and left alone.
  const byOrg = new Map<string, OrgRow[]>();
  for (const o of orgs) {
    if (!byOrg.has(o.org)) byOrg.set(o.org, []);
    byOrg.get(o.org)!.push(o);
  }

  const matches: OrgMatchResult['matches'] = [];
  let ambiguous = 0;
  let unmatched = 0;

  for (const t of townships) {
    const key = norm(orgName(t.name, t.county));
    if (!key || !byOrg.has(key)) {
      unmatched++;
      continue;
    }
    const cands = byOrg.get(key)!;
    const ids = Array.from(new Set(cands.map((c) => c.id)));
    if (ids.length === 1) {
      matches.push({ townshipId: t.id, amoId: ids[0], current: t.amo_organization_id ?? null });
    } else {
      ambiguous++;
    }
  }

  return { matches, ambiguous, unmatched };
}
