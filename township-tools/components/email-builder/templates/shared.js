// Shared utilities for email template generation

export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Sanitize rich text HTML for email compatibility
// Strips non-email-safe elements but keeps basic formatting
export const sanitizeHtmlForEmail = (html) => {
  if (!html) return '';
  // Remove script/style tags entirely
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove class attributes (not useful in email)
  clean = clean.replace(/\s+class="[^"]*"/g, '');
  // Remove data- attributes
  clean = clean.replace(/\s+data-[a-z-]+="[^"]*"/g, '');
  // Remove contenteditable
  clean = clean.replace(/\s+contenteditable="[^"]*"/g, '');
  // Convert div to p where sensible
  clean = clean.replace(/<div>/gi, '<p>').replace(/<\/div>/gi, '</p>');
  // Clean up empty paragraphs with just br
  clean = clean.replace(/<p><br\s*\/?><\/p>/gi, '');
  return clean;
};

// Lighten a hex color
export const lightenColor = (hex, amount = 0.9) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
};

// Generate calendar links for an event
// calendarDate: "2026-03-15", startTime: "10:00", endTime: "11:00"
export const generateCalendarLinks = (ev) => {
  if (!ev.calendarDate || !ev.startTime) return null;

  const dateStr = ev.calendarDate.replace(/-/g, '');
  const start = ev.startTime.replace(':', '') + '00';
  const end = ev.endTime ? ev.endTime.replace(':', '') + '00' : (parseInt(ev.startTime) + 1 + '').padStart(2, '0') + '0000';
  const title = encodeURIComponent(ev.title || 'Event');
  const desc = encodeURIComponent(ev.description || '');
  const location = encodeURIComponent(ev.location || '');

  // Recurrence rule
  let rrule = '';
  let googleRecur = '';
  if (ev.recurrence === 'weekly') {
    rrule = 'RRULE:FREQ=WEEKLY';
    googleRecur = '&recur=RRULE:FREQ%3DWEEKLY';
  } else if (ev.recurrence === 'biweekly') {
    rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
    googleRecur = '&recur=RRULE:FREQ%3DWEEKLY%3BINTERVAL%3D2';
  } else if (ev.recurrence === 'monthly') {
    rrule = 'RRULE:FREQ=MONTHLY';
    googleRecur = '&recur=RRULE:FREQ%3DMONTHLY';
  }

  // Google Calendar
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${start}/${dateStr}T${end}&details=${desc}&location=${location}${googleRecur}`;

  // Outlook.com (web)
  const outlookStart = `${ev.calendarDate}T${ev.startTime}:00`;
  const outlookEnd = ev.endTime ? `${ev.calendarDate}T${ev.endTime}:00` : `${ev.calendarDate}T${String(parseInt(ev.startTime) + 1).padStart(2, '0')}:${ev.startTime.split(':')[1]}:00`;
  const outlook = `https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${desc}&location=${location}`;

  // Apple Calendar / ICS download (data URI)
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Township Tools//Email Builder//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dateStr}T${start}`,
    `DTEND:${dateStr}T${end}`,
    `SUMMARY:${ev.title || 'Event'}`,
    ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}` : '',
    ev.location ? `LOCATION:${ev.location}` : '',
    rrule ? rrule : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines)}`;

  return { google, outlook, ics: icsDataUri };
};

// Get a readable text color (black or white) for a background
export const getContrastColor = (hex) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};
