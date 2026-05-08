import ExcelJS from 'exceljs';

const MISSING = 'missing information';

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanCell(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if (value.text) return cleanCell(value.text);
    if (value.richText) return value.richText.map((r) => r.text).join('').trim() || null;
    if (value.result !== undefined) return cleanCell(value.result);
    if (value.hyperlink) return cleanCell(value.text || value.hyperlink);
    return null;
  }
  const s = String(value).trim();
  if (!s) return null;
  if (s.toLowerCase() === MISSING) return null;
  return s;
}

function rowIsBlank(row) {
  return row.every((cell) => cleanCell(cell) === null);
}

function getRowValues(ws, rowIdx, maxCol = 7) {
  const out = [];
  for (let c = 1; c <= maxCol; c += 1) {
    out.push(ws.getCell(rowIdx, c).value);
  }
  return out;
}

function isContactHeaderRow(row) {
  const cells = row.map((c) => (cleanCell(c) || '').toLowerCase());
  return (
    cells[0] === 'first name' &&
    cells[1] === 'last name' &&
    cells[2] === 'title' &&
    cells[3].includes('email')
  );
}

function isTownshipBanner(value) {
  const cleaned = cleanCell(value);
  if (!cleaned) return false;
  return /township/i.test(cleaned) && /county/i.test(cleaned);
}

function parseTownshipName(banner) {
  const cleaned = cleanCell(banner) || '';
  const match = cleaned.match(/^(.+?\s+Township)\b/i);
  if (match) return match[1].replace(/\s+/g, ' ').trim();
  return cleaned;
}

function isInstructionsSheet(ws) {
  const name = (ws.name || '').toLowerCase();
  if (name.includes('instruction') || name.includes('readme') || name.includes('cover')) return true;
  return false;
}

/**
 * Parse one township section starting at the banner row.
 * Returns { township, nextRow }.
 */
function parseTownshipSection(ws, startRow, countyName) {
  const bannerRow = getRowValues(ws, startRow);
  const townshipName = parseTownshipName(bannerRow[0]) || `${countyName} Township`;

  let streetAddress = null;
  let mailingAddress = null;
  let headerRow = null;

  for (let i = startRow + 1; i <= startRow + 6 && i <= ws.rowCount; i += 1) {
    const r = getRowValues(ws, i);
    const labelA = (cleanCell(r[0]) || '').toLowerCase();
    if (labelA.startsWith('street address')) {
      streetAddress = cleanCell(r[1]);
    } else if (labelA.startsWith('mailing address')) {
      mailingAddress = cleanCell(r[1]);
    } else if (isContactHeaderRow(r)) {
      headerRow = i;
      break;
    }
  }

  const contacts = [];
  let nextRow = ws.rowCount + 1;

  if (headerRow) {
    let blankStreak = 0;
    for (let i = headerRow + 1; i <= ws.rowCount; i += 1) {
      const r = getRowValues(ws, i);
      if (isTownshipBanner(r[0])) {
        nextRow = i;
        break;
      }
      if (rowIsBlank(r)) {
        blankStreak += 1;
        if (blankStreak >= 2) {
          nextRow = i + 1;
          break;
        }
        continue;
      }
      blankStreak = 0;
      if (isContactHeaderRow(r)) continue;
      const firstName = cleanCell(r[0]);
      const lastName = cleanCell(r[1]);
      const title = cleanCell(r[2]);
      const email = cleanCell(r[3]);
      const phone = cleanCell(r[4]);
      const emailStatus = cleanCell(r[5]);
      if (!firstName && !lastName && !email && !title) continue;
      contacts.push({
        first_name: firstName,
        last_name: lastName,
        title,
        email,
        phone,
        email_status: emailStatus,
      });
    }
  }

  return {
    township: {
      name: townshipName,
      slug: slugify(townshipName),
      street_address: streetAddress,
      mailing_address: mailingAddress,
      contacts,
    },
    nextRow,
  };
}

function findTownshipBannerRows(ws) {
  const banners = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const v = row.getCell(1).value;
    if (isTownshipBanner(v)) banners.push(rowNumber);
  });
  return banners;
}

/**
 * Parse a full region xlsx buffer.
 * Returns { counties: [{ name, slug, townships: [...] }] }.
 */
export async function parseRegionWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const counties = [];
  wb.eachSheet((ws) => {
    if (isInstructionsSheet(ws)) return;
    const countyName = ws.name.trim();
    if (!countyName) return;

    const banners = findTownshipBannerRows(ws);
    if (banners.length === 0) return;

    const townships = [];
    for (let i = 0; i < banners.length; i += 1) {
      const startRow = banners[i];
      const { township } = parseTownshipSection(ws, startRow, countyName);
      const existing = townships.find((t) => t.slug === township.slug);
      if (existing) {
        existing.contacts.push(...township.contacts);
        if (!existing.street_address && township.street_address) existing.street_address = township.street_address;
        if (!existing.mailing_address && township.mailing_address) existing.mailing_address = township.mailing_address;
      } else {
        townships.push(township);
      }
    }

    counties.push({
      name: countyName,
      slug: slugify(countyName),
      townships,
    });
  });

  return { counties };
}
