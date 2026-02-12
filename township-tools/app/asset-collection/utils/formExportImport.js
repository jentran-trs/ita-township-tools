/**
 * Export/Import utilities for form progress transfer between users.
 * Images (File objects) cannot be serialized — they are stripped on export
 * and must be re-uploaded by the recipient.
 */

const FORM_VERSION = 1;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Recursively walk an object and set any value that looks like a File/Blob
 * (or the { file, preview } wrapper used by FileUpload) to null.
 */
export function stripFileObjects(formData) {
  if (formData === null || formData === undefined) return formData;
  if (typeof formData !== 'object') return formData;

  if (Array.isArray(formData)) {
    return formData.map(item => stripFileObjects(item));
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(formData)) {
    // FileUpload wrapper: { file: File, preview: string }
    if (
      value &&
      typeof value === 'object' &&
      value.file instanceof File
    ) {
      cleaned[key] = null;
      continue;
    }
    // Raw File / Blob
    if (value instanceof File || value instanceof Blob) {
      cleaned[key] = null;
      continue;
    }
    cleaned[key] = stripFileObjects(value);
  }
  return cleaned;
}

/**
 * Build the JSON envelope that gets downloaded.
 */
export function buildExportPayload(formData, source = 'asset-collection') {
  const stripped = stripFileObjects(formData);
  return {
    _townshipToolsExport: true,
    formVersion: FORM_VERSION,
    source,
    exportedAt: new Date().toISOString(),
    organizationName: stripped.cover?.organizationName || '',
    reportName: stripped.cover?.reportName || '',
    data: stripped,
  };
}

/**
 * Trigger a browser download of the payload as a .json file.
 */
export function downloadJsonFile(payload) {
  const org = (payload.organizationName || 'form')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const report = (payload.reportName || 'progress')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${org}-${report}-progress-${date}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File input as parsed JSON. Validates file type and size.
 * Returns the parsed object or throws a user-friendly error string.
 */
export async function readJsonFile(file) {
  if (!file) throw 'No file selected.';

  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    throw 'Please select a .json file exported from Township Tools.';
  }

  if (file.size > MAX_FILE_SIZE) {
    throw 'File is too large (max 5 MB).';
  }

  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw 'The file does not contain valid JSON.';
  }
}

/**
 * Validate the parsed payload structure.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, reason: 'File is empty or not a valid export.' };
  }

  if (!parsed._townshipToolsExport) {
    return { valid: false, reason: 'This file was not exported from Township Tools.' };
  }

  if (typeof parsed.formVersion !== 'number' || parsed.formVersion > FORM_VERSION) {
    return {
      valid: false,
      reason: `This export is from a newer version (v${parsed.formVersion}). Please update Township Tools first.`,
    };
  }

  const data = parsed.data;
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Export file is missing form data.' };
  }

  if (!data.cover || typeof data.cover !== 'object') {
    return { valid: false, reason: 'Export is missing cover information.' };
  }
  if (!data.footer || typeof data.footer !== 'object') {
    return { valid: false, reason: 'Export is missing footer information.' };
  }
  if (!Array.isArray(data.sections)) {
    return { valid: false, reason: 'Export is missing content sections.' };
  }

  return { valid: true };
}

/**
 * Merge imported data into a safe shape with defensive defaults.
 * Nullifies all file fields and resets confirmed to false.
 */
export function mergeImportedData(importedData) {
  const d = importedData;
  return {
    cover: {
      logo: null,
      organizationName: d.cover?.organizationName || '',
      reportName: d.cover?.reportName || '',
      tagline: d.cover?.tagline || '',
    },
    letter: {
      includeOpeningLetter: !!d.letter?.includeOpeningLetter,
      headshot: null,
      letterTitle: d.letter?.letterTitle || '',
      letterSubtitle: d.letter?.letterSubtitle || '',
      letterContent: d.letter?.letterContent || '',
      letterImage1: null,
      letterImage1Caption: d.letter?.letterImage1Caption || '',
      letterImage2: null,
      letterImage2Caption: d.letter?.letterImage2Caption || '',
    },
    footer: {
      department: d.footer?.department || '',
      streetAddress: d.footer?.streetAddress || '',
      cityStateZip: d.footer?.cityStateZip || '',
      phone: d.footer?.phone || '',
      email: d.footer?.email || '',
      website: d.footer?.website || '',
    },
    sections: Array.isArray(d.sections)
      ? d.sections.map(s => ({
          title: s?.title || '',
          content: s?.content || '',
          images: (s?.images || []).map(img => ({
            ...img,
            file: null,
          })),
          textBlocks: Array.isArray(s?.textBlocks) ? s.textBlocks : [],
          contentCards: Array.isArray(s?.contentCards) ? s.contentCards : [],
          stats: Array.isArray(s?.stats) ? s.stats : [],
          chartLink: s?.chartLink || '',
          chartCaption: s?.chartCaption || '',
          imageCaptions: s?.imageCaptions || '',
          designNotes: s?.designNotes || '',
        }))
      : [{ title: '', content: '', images: [], textBlocks: [], contentCards: [], stats: [], designNotes: '' }],
    review: {
      submitterName: d.review?.submitterName || '',
      submitterEmail: d.review?.submitterEmail || '',
      additionalNotes: d.review?.additionalNotes || '',
      confirmed: false,
    },
    currentStep: 1,
  };
}
