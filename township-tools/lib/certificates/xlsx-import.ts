import ExcelJS from 'exceljs';
import { Readable } from 'stream';

export type AttendeeRow = {
  first: string;
  last: string;
  email: string;
  township: string | null;
  county: string | null;
  // Diagnostic
  row_number: number;
  issues: string[];
};

type ColumnIndex = {
  first: number;
  last: number;
  email: number;
  township: number;
  county: number;
  organization: number;
};

const HEADER_ALIASES: Record<keyof ColumnIndex, string[]> = {
  first: ['firstname', 'first', 'givenname', 'fname'],
  last: ['lastname', 'last', 'surname', 'familyname', 'lname'],
  email: ['email', 'emailaddress', 'mail', 'e-mail'],
  township: ['township', 'twp'],
  county: ['county'],
  // AMO exports combine township + county into one "Organization" column,
  // e.g. "Pleasant Township, Steuben County". Used only when there are no
  // dedicated township/county columns.
  organization: ['organization', 'org'],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[\s_\-\.]+/g, '')
    .trim();
}

function valueToString(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if ('text' in v && v.text) return String(v.text).trim();
    if ('result' in v && v.result !== undefined) return valueToString(v.result);
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join('').trim();
    if ('hyperlink' in v) return String(v.text || v.hyperlink || '').trim();
    return '';
  }
  return String(v).trim();
}

function findColumns(headerCells: any[]): { index: ColumnIndex; missing: string[] } {
  const idx: ColumnIndex = { first: -1, last: -1, email: -1, township: -1, county: -1, organization: -1 };
  for (let c = 0; c < headerCells.length; c++) {
    const norm = normalizeHeader(valueToString(headerCells[c]));
    if (!norm) continue;
    for (const key of Object.keys(HEADER_ALIASES) as (keyof ColumnIndex)[]) {
      if (idx[key] !== -1) continue;
      if (HEADER_ALIASES[key].includes(norm)) {
        idx[key] = c;
        break;
      }
    }
  }
  const missing: string[] = [];
  if (idx.first === -1) missing.push('First Name');
  if (idx.last === -1) missing.push('Last Name');
  if (idx.email === -1) missing.push('Email');
  return { index: idx, missing };
}

function parseRows(rows: any[][]): { headerRow: number; index: ColumnIndex; rows: any[][] } {
  // Find the first non-empty row that contains First/Last/Email-ish headers.
  for (let r = 0; r < rows.length; r++) {
    if (!rows[r] || !rows[r].length) continue;
    const probe = findColumns(rows[r]);
    if (probe.missing.length === 0) {
      return { headerRow: r, index: probe.index, rows: rows.slice(r + 1) };
    }
  }
  // Fall back to first row even if missing — caller will surface the error.
  const headerCells = rows[0] || [];
  const probe = findColumns(headerCells);
  return { headerRow: 0, index: probe.index, rows: rows.slice(1) };
}

function toCells(value: unknown): any[] {
  // ExcelJS row.values is 1-indexed (first element is undefined). Normalize.
  if (Array.isArray(value)) return value.slice(1);
  return [];
}

export async function parseAttendeeWorkbook(buffer: Buffer, filename: string): Promise<AttendeeRow[]> {
  const isCsv = /\.csv$/i.test(filename);
  const wb = new ExcelJS.Workbook();
  if (isCsv) {
    const stream = Readable.from([buffer.toString('utf-8')]);
    await wb.csv.read(stream);
  } else {
    // ExcelJS's TS declarations expect Node's Buffer<ArrayBuffer> shape;
    // cast away the variance since the runtime accepts any Buffer.
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  }

  const ws = wb.worksheets.find((s) => s.rowCount > 0) || wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in file');

  const raw: any[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    raw.push(toCells(row.values));
  });

  const { index, rows } = parseRows(raw);
  const missing: string[] = [];
  if (index.first === -1) missing.push('First Name');
  if (index.last === -1) missing.push('Last Name');
  if (index.email === -1) missing.push('Email');
  if (missing.length) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}. Add a header row with at minimum First Name, Last Name, Email.`);
  }

  const out: AttendeeRow[] = [];
  let rowNumber = 1;
  for (const r of rows) {
    rowNumber += 1;
    const first = valueToString(r[index.first]);
    const last = valueToString(r[index.last]);
    const email = valueToString(r[index.email]);
    let township = index.township >= 0 ? valueToString(r[index.township]) : '';
    let county = index.county >= 0 ? valueToString(r[index.county]) : '';

    // No dedicated township/county columns? Derive them from a combined
    // "Organization" column like "Pleasant Township, Steuben County".
    if (!township && !county && index.organization >= 0) {
      const org = valueToString(r[index.organization]);
      if (/township|county/i.test(org)) {
        const split = splitOrganization(org);
        township = split.township;
        county = split.county;
      }
    }

    // Skip wholly empty rows
    if (!first && !last && !email) continue;

    const issues: string[] = [];
    if (!first) issues.push('Missing first name');
    if (!last) issues.push('Missing last name');
    if (!email) issues.push('Missing email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('Invalid email format');

    out.push({
      first,
      last,
      email: email.toLowerCase().trim(),
      // Store the bare township name ("Oregon"); the certificate appends the
      // word "Township" when displaying.
      township: stripTownshipSuffix(township) || null,
      county: stripCountySuffix(county) || null,
      row_number: rowNumber,
      issues,
    });
  }

  return out;
}

function stripCountySuffix(v: string): string {
  // "Hancock County" → "Hancock"; pass through if no trailing County
  return v.replace(/\s+county\s*$/i, '').trim();
}

function stripTownshipSuffix(v: string): string {
  // "Oregon Township" → "Oregon"; pass through if no trailing Township
  return v.replace(/\s+township\s*$/i, '').trim();
}

// Split a combined "Township, County" organization string into its parts.
// "Pleasant Township, Steuben County" → { township: 'Pleasant Township',
// county: 'Steuben County' }. County suffix is stripped later by the caller.
function splitOrganization(org: string): { township: string; county: string } {
  const parts = org
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let township = '';
  let county = '';
  for (const part of parts) {
    if (!county && /\bcounty\s*$/i.test(part)) county = part;
    else if (!township) township = part;
  }
  return { township, county };
}

/**
 * Identify duplicates *within* the upload. A row is a duplicate only when
 * email + first + last all match (case-insensitive) — two people who share an
 * email but have different names produce two separate certificates.
 *
 * Returns the second+ occurrences only; the first occurrence is kept.
 */
export function findInFileDuplicates(rows: AttendeeRow[]): Set<number> {
  const seen = new Map<string, number>();
  const dupes = new Set<number>();
  rows.forEach((row, i) => {
    if (!row.email) return;
    const key = recipientKey(row.email, row.first, row.last);
    if (seen.has(key)) dupes.add(i);
    else seen.set(key, i);
  });
  return dupes;
}

/**
 * Composite identity key for an attendee row: lowercased email + lowercased
 * first + lowercased last. Used by import and reissue logic so that a shared
 * email with different names doesn't collide.
 */
export function recipientKey(email: string, first: string, last: string): string {
  return `${(email || '').toLowerCase().trim()}|${(first || '').toLowerCase().trim()}|${(last || '').toLowerCase().trim()}`;
}
