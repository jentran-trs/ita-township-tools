// Format: ITA-YYYY_NNN where NNN is incremented in steps of 100 within each year.
// First course of a year starts at 100, second at 200, etc.

const COURSE_ID_PATTERN = /^ITA-(\d{4})_(\d+)$/;

export function parseCourseId(courseId: string): { year: number; ordinal: number } | null {
  const m = COURSE_ID_PATTERN.exec(courseId);
  if (!m) return null;
  return { year: parseInt(m[1], 10), ordinal: parseInt(m[2], 10) };
}

export function nextOrdinal(year: number, existingIds: string[]): number {
  let highest = 0;
  for (const id of existingIds) {
    const parsed = parseCourseId(id);
    if (!parsed || parsed.year !== year) continue;
    if (parsed.ordinal > highest) highest = parsed.ordinal;
  }
  if (highest === 0) return 100;
  return highest + 100;
}

export function suggestCourseId(courseDate: string, existingIds: string[]): string {
  const year = courseDateYear(courseDate);
  const ordinal = nextOrdinal(year, existingIds);
  return `ITA-${year}_${ordinal}`;
}

function courseDateYear(courseDate: string): number {
  const m = /^(\d{4})/.exec(courseDate);
  if (m) return parseInt(m[1], 10);
  const d = new Date(courseDate);
  if (!Number.isNaN(d.getTime())) return d.getFullYear();
  return new Date().getFullYear();
}
