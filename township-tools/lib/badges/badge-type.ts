import { GOLD, NAVY } from '@/lib/certificates/theme';

// Colour of the bar at the bottom of a badge, from the AMO "Registrant Type".
// Anything not listed uses the attendee navy.
export function badgeTypeStyle(type: string | null | undefined): { label: string; bg: string; fg: string } {
  const label = (type || '').trim() || 'Attendee';
  const t = label.toLowerCase();
  if (/sponsor|vendor|exhibitor/.test(t)) return { label, bg: GOLD, fg: '#1f2937' };
  if (/speaker|presenter|panel/.test(t)) return { label, bg: '#7A1F2B', fg: '#ffffff' };
  if (/staff|volunteer|board|organizer/.test(t)) return { label, bg: '#4B5563', fg: '#ffffff' };
  return { label, bg: NAVY, fg: '#ffffff' };
}
