import ExcelJS from 'exceljs';

// Match an AMO "Individual Report" export against cv_contacts to assign each
// contact's AMO Individual ID. Matching priority: unique email → email+name →
// name+organization. Shared with the bulk-assign API route.

export type AmoRow = { id: string; first: string; last: string; email: string; org: string };

export type CvContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  township?: string | null;
  county?: string | null;
  amo_individual_id?: string | null;
};

const norm = (s: any) => String(s ?? '').toLowerCase().trim();
const cell = (v: any) =>
  v && typeof v === 'object' ? (v.text ?? v.result ?? v.hyperlink ?? '') : v;

// AMO's "Organization" format, e.g. "Vernon Township, Hancock County".
export function orgName(township?: string | null, county?: string | null): string {
  const t = String(township || '').trim();
  const c = String(county || '').trim();
  const T = t ? (/\btownship\s*$/i.test(t) ? t : `${t} Township`) : '';
  const C = c ? (/\bcounty\s*$/i.test(c) ? c : `${c} County`) : '';
  return [T, C].filter(Boolean).join(', ');
}

export async function parseAmoWorkbook(buffer: Buffer): Promise<AmoRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets.find((s) => s.rowCount > 1) || wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in the file.');

  const header = ((ws.getRow(1).values as any[]) || []).slice(1).map(cell);
  const col = (name: string) => header.findIndex((h) => norm(h) === norm(name));
  const ci = {
    id: col('Individual AMO ID'),
    first: col('First Name'),
    last: col('Last Name'),
    email: col('Email Address'),
    org: col('Organization Name'),
  };
  if (ci.id === -1) {
    throw new Error('Could not find an "Individual AMO ID" column. Use the AMO Individual Report export.');
  }

  const rows: AmoRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    const v = ((row.values as any[]) || []).slice(1).map(cell);
    const id = String(cell(v[ci.id]) ?? '').trim();
    if (!id) return;
    rows.push({
      id,
      first: norm(v[ci.first]),
      last: norm(v[ci.last]),
      email: norm(v[ci.email]),
      org: norm(v[ci.org]),
    });
  });
  return rows;
}

export type MatchResult = {
  matches: { contactId: string; amoId: string; method: string; current: string | null }[];
  ambiguous: number;
  unmatched: number;
  counts: { email: number; emailName: number; nameOrg: number };
};

export function matchContacts(amo: AmoRow[], contacts: CvContact[]): MatchResult {
  const byEmail = new Map<string, AmoRow[]>();
  const byNameOrg = new Map<string, AmoRow[]>();
  for (const a of amo) {
    if (a.email) {
      if (!byEmail.has(a.email)) byEmail.set(a.email, []);
      byEmail.get(a.email)!.push(a);
    }
    const k = `${a.first}|${a.last}|${a.org}`;
    if (!byNameOrg.has(k)) byNameOrg.set(k, []);
    byNameOrg.get(k)!.push(a);
  }

  const matches: MatchResult['matches'] = [];
  let ambiguous = 0;
  let unmatched = 0;
  const counts = { email: 0, emailName: 0, nameOrg: 0 };

  for (const c of contacts) {
    const email = norm(c.email);
    const first = norm(c.first_name);
    const last = norm(c.last_name);
    const org = norm(orgName(c.township, c.county));
    let m: AmoRow | null = null;
    let method = '';

    if (email && byEmail.has(email)) {
      const cands = byEmail.get(email)!;
      if (cands.length === 1) {
        m = cands[0];
        method = 'email';
        counts.email++;
      } else {
        const byn = cands.filter((a) => a.last === last && a.first === first);
        if (byn.length === 1) {
          m = byn[0];
          method = 'email+name';
          counts.emailName++;
        } else {
          ambiguous++;
        }
      }
    }
    if (!m && byNameOrg.has(`${first}|${last}|${org}`)) {
      const cands = byNameOrg.get(`${first}|${last}|${org}`)!;
      if (cands.length === 1) {
        m = cands[0];
        method = 'name+org';
        counts.nameOrg++;
      } else if (!email) {
        ambiguous++;
      }
    }

    if (m && m.id) {
      matches.push({ contactId: c.id, amoId: m.id, method, current: c.amo_individual_id ?? null });
    } else if (!m) {
      unmatched++;
    }
  }

  return { matches, ambiguous, unmatched, counts };
}
