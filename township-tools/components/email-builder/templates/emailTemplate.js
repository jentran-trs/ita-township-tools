import { escapeHtml, sanitizeHtmlForEmail, lightenColor, getContrastColor, generateCalendarLinks } from './shared';

const formatCalendarDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
};

const formatTimeRange = (startTime, endTime, timezone) => {
  if (!startTime) return '';
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m).padStart(2, '0')} ${period}`;
  };
  const base = endTime ? `${fmt(startTime)} – ${fmt(endTime)}` : fmt(startTime);
  return timezone ? `${base} ${timezone}` : base;
};

// ============================================================
//   ITA EMAIL TEMPLATE GENERATOR
//   Mirrors the 8-component ITA reference template:
//   1. Header (navy banner w/ icon + accent rule + subtitle)
//   2. Rich text section (greeting + paragraphs + headings + lists)
//   3. Button (maroon rounded CTA w/ Outlook VML fallback)
//   4. Highlighted card (light gray bg + colored left border)
//   5. Navy callout (white text on navy, bulletproof for Outlook)
//   6. Two-column layout (icon/image + text)
//   7. Divider (orange accent rule)
//   8. Footer (sign-off + light-gray contact block)
//
//   Color theme is driven by `colors`:
//     colors.primary  = navy  (#2e5f7f) — brand, headings, links
//     colors.accent   = maroon (#8B0000) — primary CTA, warnings
//     colors.gold     = orange (#f0ad4e) — accent rules, bullets
// ============================================================

const FONT_STACK = `'Instrument Sans', Arial, Helvetica, sans-serif`;

// Wrap arbitrary rich-text HTML so paragraph + heading + link styles match
// the ITA aesthetic in any email client.
const styleRichText = (html, colors) => {
  if (!html) return '';
  let clean = sanitizeHtmlForEmail(html);
  // Inject inline styles on tags that come out of the WYSIWYG editor unstyled.
  // We do these as string replacements so we don't need a DOM parser server-side.
  const c = colors;
  clean = clean
    .replace(/<p(\s|>)/gi, `<p style="margin: 0 0 14px 0; font-family: ${FONT_STACK}; font-size: 17px; color: #333333; line-height: 1.7;"$1`)
    .replace(/<h1(\s|>)/gi, `<h1 style="margin: 22px 0 12px 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: bold; color: ${c.primary}; line-height: 1.3;"$1`)
    .replace(/<h2(\s|>)/gi, `<h2 style="margin: 20px 0 12px 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: bold; color: ${c.primary}; line-height: 1.3;"$1`)
    .replace(/<h3(\s|>)/gi, `<h3 style="margin: 18px 0 10px 0; font-family: ${FONT_STACK}; font-size: 20px; font-weight: bold; color: ${c.primary}; line-height: 1.3;"$1`)
    .replace(/<h4(\s|>)/gi, `<h4 style="margin: 16px 0 8px 0; font-family: ${FONT_STACK}; font-size: 18px; font-weight: bold; color: ${c.primary}; line-height: 1.3;"$1`)
    .replace(/<strong(\s|>)/gi, `<strong style="color: ${c.primary};"$1`)
    .replace(/<b(\s|>)/gi, `<b style="color: ${c.primary};"$1`)
    .replace(/<a(\s)/gi, `<a style="color: ${c.primary}; font-weight: bold; text-decoration: underline;" $1`)
    .replace(/<ul(\s|>)/gi, `<ul style="margin: 8px 0 14px 0; padding-left: 22px; font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.9;"$1`)
    .replace(/<ol(\s|>)/gi, `<ol style="margin: 8px 0 14px 0; padding-left: 22px; font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.9;"$1`)
    .replace(/<li(\s|>)/gi, `<li style="margin-bottom: 4px;"$1`);
  return clean;
};

// Generic card with a 4px left border. Used for highlighted / importantNotice / alertBox.
const renderCard = ({ heading, contentHtml, borderColor, colors }) => `
        <tr>
          <td style="padding: 0 40px 25px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f9f9; border-left: 4px solid ${borderColor};">
              <tr>
                <td bgcolor="#f9f9f9" style="background-color: #f9f9f9; padding: 22px 28px;">
                  ${heading ? `<p style="margin: 0 0 8px 0; font-family: ${FONT_STACK}; font-size: 18px; font-weight: bold; color: ${colors.primary};">${escapeHtml(heading)}</p>` : ''}
                  <div style="font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.7;">
                    ${contentHtml}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

const renderSection = (section, colors) => {
  const { type, data } = section;
  const c = colors;

  switch (type) {
    // ---------- 1. HEADER ----------
    case 'header': {
      const icon = data.icon || '&#9733;'; // star by default
      return `
        <tr>
          <td bgcolor="${c.primary}" style="background-color: ${c.primary}; padding: 35px 40px; text-align: center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align: center; padding-bottom: 12px;">
                  <span style="font-size: 42px; color: ${c.gold};">${icon}</span>
                </td>
              </tr>
              ${data.title ? `
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center; line-height: 1.3; letter-spacing: -0.5px;">
                  ${escapeHtml(data.title)}
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding-top: 15px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    <tr>
                      <td style="width: 60px; height: 3px; background-color: ${c.gold}; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${data.subtitle ? `
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 16px; color: #ffffff; text-align: center; padding-top: 15px; font-weight: 500;">
                  ${escapeHtml(data.subtitle)}
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>`;
    }

    // ---------- 2. GREETING (top of the rich-text body) ----------
    case 'greeting': {
      const greetingText = data.greeting || data.text || '';
      const signOffs = data.signOffs || [];
      const hasSignOff = data.signOffLine || signOffs.some(s => s.name);
      return `
        <tr>
          <td style="padding: 35px 40px 10px 40px;">
            ${greetingText ? `<p style="margin: 0 0 18px 0; font-family: ${FONT_STACK}; font-size: 18px; font-weight: bold; color: ${c.primary}; line-height: 1.6;">${escapeHtml(greetingText)}</p>` : ''}
            ${data.content ? `<div>${styleRichText(data.content, c)}</div>` : ''}
            ${data.signOffLine ? `<p style="margin: 16px 0 6px 0; font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.7;">${escapeHtml(data.signOffLine)}</p>` : ''}
            ${signOffs.filter(s => s.name).map(s => `
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px;">
                <strong style="color: ${c.primary};">${escapeHtml(s.name)}</strong>${s.title ? `<span style="color: #666666;">, ${escapeHtml(s.title)}</span>` : ''}
              </p>`).join('')}
            ${data.org ? `<p style="margin: 4px 0 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: ${c.primary}; font-style: italic;">${escapeHtml(data.org)}</p>` : ''}
          </td>
        </tr>`;
    }

    // ---------- IMAGE ----------
    case 'image': {
      if (!data.url) return '';
      const imgWidth = data.width || 100;
      const shape = data.shape || 'rectangle';
      const align = data.align || 'center';
      const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
      const borderRadius = shape === 'circle' ? '50%' : shape === 'rounded' ? '8px' : '0';
      const sizeStyle = shape === 'circle' || shape === 'square'
        ? `width: ${imgWidth}%; max-width: ${imgWidth === 100 ? '560' : Math.round(560 * imgWidth / 100)}px; aspect-ratio: 1 / 1; object-fit: cover;`
        : `width: ${imgWidth}%; max-width: ${imgWidth === 100 ? '560' : Math.round(560 * imgWidth / 100)}px; height: auto;`;
      const imgTag = `<img src="${escapeHtml(data.url)}" alt="${escapeHtml(data.alt || '')}" style="${sizeStyle} border-radius: ${borderRadius}; display: inline-block;" />`;
      const content = data.linkUrl
        ? `<a href="${escapeHtml(data.linkUrl)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`
        : imgTag;
      return `
        <tr>
          <td style="padding: 0 40px 25px 40px; text-align: ${textAlign};">
            ${content}
          </td>
        </tr>`;
    }

    // ---------- 2 (cont). RICH TEXT BODY ----------
    case 'contentBody':
      return `
        <tr>
          <td style="padding: 35px 40px 10px 40px;">
            <div>${styleRichText(data.content, c)}</div>
          </td>
        </tr>`;

    // ---------- 4. HIGHLIGHTED CARD (orange left border — neutral grouped detail) ----------
    case 'highlighted':
      return renderCard({
        heading: data.heading,
        contentHtml: styleRichText(data.content, c),
        borderColor: c.gold,
        colors: c,
      });

    // ---------- IMPORTANT NOTICE (navy left border — important info) ----------
    case 'importantNotice':
      return renderCard({
        heading: data.heading,
        contentHtml: styleRichText(data.content, c),
        borderColor: c.primary,
        colors: c,
      });

    // ---------- ALERT BOX (maroon left border — warnings / deadlines) ----------
    case 'alertBox':
      return renderCard({
        heading: data.heading,
        contentHtml: styleRichText(data.content, c),
        borderColor: c.accent,
        colors: c,
      });

    // ---------- 3. BUTTON (maroon CTA w/ Outlook VML) ----------
    case 'ctaButton': {
      const buttons = data.buttons || (data.buttonText ? [{ text: data.buttonText, url: data.url || '' }] : []);
      const renderedButtons = buttons.filter(b => b.text).map(btn => {
        const href = escapeHtml(btn.url || '#');
        const label = escapeHtml(btn.text);
        return `
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="14%" stroke="f" fillcolor="${c.accent}">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">${label}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${href}" style="display: inline-block; margin: 6px 6px; padding: 18px 40px; background-color: ${c.accent}; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; font-family: ${FONT_STACK}; letter-spacing: 0.3px; border-radius: 8px; min-width: 200px; text-align: center;">${label}</a>
              <!--<![endif]-->`;
      }).join('');
      return `
        <tr>
          <td style="padding: 5px 40px 30px 40px; text-align: center;">
            ${renderedButtons}
            ${data.helperText ? `<p style="margin: 14px 0 0 0; font-family: ${FONT_STACK}; font-size: 13px; color: #888888;">${escapeHtml(data.helperText)}</p>` : ''}
          </td>
        </tr>`;
    }

    // ---------- MEETING DETAILS (structured card + auto calendar links) ----------
    case 'meetingDetails': {
      // Prefer auto-formatted date/time from calendarDate/startTime/endTime;
      // fall back to user-entered display strings.
      const dateLabel = data.date || formatCalendarDate(data.calendarDate);
      const timeLabel = data.time || formatTimeRange(data.startTime, data.endTime, data.timezone);
      const cal = (data.calendarDate && data.startTime)
        ? generateCalendarLinks({
            title: data.title || 'Meeting',
            calendarDate: data.calendarDate,
            startTime: data.startTime,
            endTime: data.endTime,
            description: data.description,
            location: data.location,
            recurrence: data.recurrence,
          })
        : null;
      const labelStyle = `font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;`;
      const valueStyle = `font-family: ${FONT_STACK}; font-size: 17px; font-weight: 700; color: #333333;`;
      const field = (label, value) => value ? `
                  <p style="margin: 0 0 2px 0; ${labelStyle}">${label}</p>
                  <p style="margin: 0 0 14px 0; ${valueStyle}">${escapeHtml(value)}</p>` : '';
      return `
        <tr>
          <td style="padding: 0 40px 20px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f9f9; border-left: 4px solid ${c.gold};">
              <tr>
                <td bgcolor="#f9f9f9" style="background-color: #f9f9f9; padding: 24px 28px;">
                  <p style="margin: 0 0 18px 0; font-family: ${FONT_STACK}; font-size: 20px; font-weight: bold; color: ${c.primary};">Meeting Details</p>
                  ${field('Event', data.title)}
                  ${field('Date', dateLabel)}
                  ${field('Time', timeLabel)}
                  ${field('Location', data.location)}
                  ${field('Format', data.format)}
                  ${field('Meeting ID', data.meetingId)}
                  ${field('Passcode', data.passcode)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${cal ? `
        <tr>
          <td style="padding: 0 40px 15px 40px; text-align: center; white-space: nowrap;">
            <p style="margin: 0 0 10px 0; font-family: ${FONT_STACK}; font-size: 13px; color: #666666; white-space: normal;">Add to your calendar:</p>
            <a href="${escapeHtml(cal.google)}" style="display: inline-block; padding: 10px 16px; background-color: ${c.gold}; color: #1a1a1a; text-decoration: none; font-weight: bold; font-size: 13px; font-family: ${FONT_STACK}; border-radius: 6px; margin: 0 3px;">+ Google</a>&nbsp;<a href="${escapeHtml(cal.outlook)}" style="display: inline-block; padding: 10px 16px; background-color: ${c.gold}; color: #1a1a1a; text-decoration: none; font-weight: bold; font-size: 13px; font-family: ${FONT_STACK}; border-radius: 6px; margin: 0 3px;">+ Outlook</a>&nbsp;<a href="${escapeHtml(cal.ics)}" download="event.ics" style="display: inline-block; padding: 10px 16px; background-color: ${c.gold}; color: #1a1a1a; text-decoration: none; font-weight: bold; font-size: 13px; font-family: ${FONT_STACK}; border-radius: 6px; margin: 0 3px;">+ Apple</a>
          </td>
        </tr>` : ''}
        ${data.meetingUrl ? `
        <tr>
          <td style="padding: 5px 40px 25px 40px; text-align: center;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(data.meetingUrl)}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="14%" stroke="f" fillcolor="${c.accent}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">${escapeHtml(data.buttonText || 'JOIN MEETING')}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${escapeHtml(data.meetingUrl)}" style="display: inline-block; padding: 18px 40px; background-color: ${c.accent}; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; font-family: ${FONT_STACK}; letter-spacing: 0.3px; border-radius: 8px; min-width: 200px;">${escapeHtml(data.buttonText || 'JOIN MEETING')}</a>
            <!--<![endif]-->
            <p style="margin: 14px 0 0 0; font-family: ${FONT_STACK}; font-size: 13px; color: #888888; line-height: 1.5;">Or copy this link into your browser:<br>
            <a href="${escapeHtml(data.meetingUrl)}" style="color: ${c.primary}; text-decoration: underline; font-size: 13px; word-break: break-all;">${escapeHtml(data.meetingUrl)}</a></p>
          </td>
        </tr>` : ''}`;
    }

    // ---------- 6. TWO-COLUMN LAYOUT ----------
    case 'twoColumn':
      return `
        <tr>
          <td style="padding: 0 40px 25px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td valign="top" width="48%" style="padding-right: 2%;">
                  ${data.leftHeading ? `<p style="margin: 0 0 6px 0; font-family: ${FONT_STACK}; font-size: 18px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.leftHeading)}</p>` : ''}
                  <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px; line-height: 1.7; color: #333333; white-space: pre-line;">${escapeHtml(data.leftText)}</p>
                </td>
                <td valign="top" width="48%" style="padding-left: 2%;">
                  ${data.rightHeading ? `<p style="margin: 0 0 6px 0; font-family: ${FONT_STACK}; font-size: 18px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.rightHeading)}</p>` : ''}
                  <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px; line-height: 1.7; color: #333333; white-space: pre-line;">${escapeHtml(data.rightText)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    // ---------- RESOURCE LINKS (arrow list w/ orange accents) ----------
    case 'resourceLinks': {
      const links = data.links || [];
      return `
        <tr>
          <td style="padding: 0 40px 25px 40px;">
            ${data.heading ? `<p style="margin: 0 0 12px 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.heading)}</p>` : ''}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              ${links.filter(l => l.text).map(link => `
              <tr>
                <td style="padding: 6px 0; font-family: ${FONT_STACK};">
                  <span style="color: ${c.gold}; font-weight: bold; font-size: 16px;">&#8594;</span>&nbsp;&nbsp;<a href="${escapeHtml(link.url || '#')}" style="color: ${c.primary}; text-decoration: underline; font-size: 16px; font-weight: 600;">${escapeHtml(link.text)}</a>
                </td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>`;
    }

    // ---------- LIST (orange bullet dots, navy bold first phrase, em-dash detail) ----------
    case 'list': {
      const items = (data.items || []).filter(item => item);
      const isNumbered = data.listType === 'numbered';
      const rows = items.map((item, idx) => {
        // Split on the first em-dash, en-dash, or " - " so the leading phrase
        // can render in navy bold per the ITA bullet style.
        const match = String(item).match(/^(.+?)\s+(?:—|–|-)\s+(.+)$/);
        const lead = match ? match[1] : item;
        const detail = match ? match[2] : '';
        const marker = isNumbered
          ? `<span style="color: ${c.gold}; font-weight: bold;">${idx + 1}.</span>`
          : `<span style="color: ${c.gold}; font-weight: bold;">&#8226;</span>`;
        return `${marker}&nbsp;&nbsp;<strong style="color: ${c.primary};">${escapeHtml(lead)}</strong>${detail ? ` &mdash; ${escapeHtml(detail)}` : ''}<br>`;
      }).join('');
      return `
        <tr>
          <td style="padding: 0 40px 25px 40px;">
            ${data.heading ? `<p style="margin: 0 0 12px 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.heading)}</p>` : ''}
            <div style="font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.9;">
              ${rows}
            </div>
          </td>
        </tr>`;
    }

    // ---------- 7. DIVIDER (orange accent rule) ----------
    case 'divider':
      return `
        <tr>
          <td style="padding: 5px 40px 20px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="border-top: 2px solid ${c.gold}; font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>`;

    // ---------- 5. NAVY CALLOUT (white text on navy — top-priority message) ----------
    case 'highlightBanner': {
      const heading = data.heading || '';
      const text = data.text || '';
      const buttonText = data.buttonText || '';
      const buttonUrl = data.buttonUrl || '';
      return `
        <tr>
          <td style="padding: 0 40px 25px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td bgcolor="${c.primary}" style="background-color: ${c.primary}; padding: 28px 30px;">
                  ${heading ? `<p style="margin: 0 0 12px 0; font-family: ${FONT_STACK}; font-size: 20px; font-weight: bold; color: #ffffff;">${escapeHtml(heading)}</p>` : ''}
                  ${text ? `<p style="margin: 0 0 ${buttonText ? '18px' : '0'} 0; font-family: ${FONT_STACK}; font-size: 16px; color: #ffffff; line-height: 1.7;">${escapeHtml(text)}</p>` : ''}
                  ${buttonText ? `
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(buttonUrl || '#')}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="${c.gold}">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(buttonText)}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${escapeHtml(buttonUrl || '#')}" style="display: inline-block; padding: 14px 32px; background-color: ${c.gold}; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: ${FONT_STACK}; border-radius: 6px;">${escapeHtml(buttonText)}</a>
                  <!--<![endif]-->` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }

    // ---------- CLOSING (paragraphs + optional signature block) ----------
    case 'closing': {
      const hasSignOff = data.signOff || data.name;
      return `
        <tr>
          <td style="padding: 0 40px 10px 40px;">
            <div>${styleRichText(data.content, c)}</div>
            ${hasSignOff ? `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 18px;">
              <tr>
                <td>
                  ${data.signOff ? `<p style="margin: 0 0 10px 0; font-family: ${FONT_STACK}; font-size: 16px; color: #333333;">${escapeHtml(data.signOff)}</p>` : ''}
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="border-left: 3px solid ${c.gold}; padding-left: 15px;">
                        ${data.name ? `<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.name)}</p>` : ''}
                        ${data.title ? `<p style="margin: 2px 0 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: #666666;">${escapeHtml(data.title)}</p>` : ''}
                        ${data.org ? `<p style="margin: 2px 0 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: ${c.primary}; font-weight: 600;">${escapeHtml(data.org)}</p>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>` : ''}
          </td>
        </tr>`;
    }

    // ---------- SIGNATURE ----------
    case 'signature':
      return `
        <tr>
          <td style="padding: 0 40px 15px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="border-left: 3px solid ${c.gold}; padding-left: 15px;">
                  ${data.name ? `<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px; font-weight: bold; color: ${c.primary};">${escapeHtml(data.name)}</p>` : ''}
                  ${data.title ? `<p style="margin: 2px 0 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: #666666;">${escapeHtml(data.title)}</p>` : ''}
                  ${data.org ? `<p style="margin: 2px 0 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: ${c.primary}; font-weight: 600;">${escapeHtml(data.org)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    // ---------- 8. FOOTER (sign-off + light-gray contact block) ----------
    case 'footer': {
      const orgName = data.orgName || '';
      const website = data.website || '';
      const tagline = data.tagline || '';
      const phone = data.phone || '';
      const websiteHost = website.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `
        <tr>
          <td style="padding: 25px 40px 10px 40px;">
            <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 16px; color: #333333; line-height: 1.7;">Best,</p>
            ${orgName ? `<p style="margin: 15px 0 0 0; font-family: ${FONT_STACK}; font-size: 16px; line-height: 1.7;"><strong style="color: ${c.primary};">${escapeHtml(orgName)}</strong></p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 40px 30px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td bgcolor="#f9f9f9" style="background-color: #f9f9f9; padding: 15px 20px; text-align: center;">
                  <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #666666; line-height: 1.6;">
                    ${tagline ? `${escapeHtml(tagline)}<br>` : ''}
                    ${phone || website ? `For questions, contact us${phone ? ` at <strong style="color: ${c.primary};">${escapeHtml(phone)}</strong>` : ''}${phone && website ? ' or ' : website ? ' at ' : ''}${website ? `visit <a href="${escapeHtml(website)}" style="color: ${c.primary}; text-decoration: underline;">${escapeHtml(websiteHost)}</a>` : ''}` : ''}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }

    default:
      return '';
  }
};

export const generateEmailHtml = (sections, colors, logo, logoHeight = 90) => {
  // Logo: if a header section exists, merge logo above the icon. Otherwise
  // render a logo-only navy strip before the first section.
  const firstSection = sections[0];
  let bodyHtml = '';

  if (logo && firstSection?.type === 'header') {
    const data = firstSection.data || {};
    const icon = data.icon || '&#9733;';
    bodyHtml += `
        <tr>
          <td bgcolor="${colors.primary}" style="background-color: ${colors.primary}; padding: 30px 40px 35px 40px; text-align: center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align: center; padding-bottom: 18px;">
                  <img src="${logo}" alt="Logo" height="${logoHeight}" style="display: inline-block; height: ${logoHeight}px; width: auto;" />
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-bottom: 12px;">
                  <span style="font-size: 42px; color: ${colors.gold};">${icon}</span>
                </td>
              </tr>
              ${data.title ? `
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center; line-height: 1.3; letter-spacing: -0.5px;">
                  ${escapeHtml(data.title)}
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding-top: 15px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    <tr>
                      <td style="width: 60px; height: 3px; background-color: ${colors.gold}; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${data.subtitle ? `
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 16px; color: #ffffff; text-align: center; padding-top: 15px; font-weight: 500;">
                  ${escapeHtml(data.subtitle)}
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>`;
    bodyHtml += sections.slice(1).map(s => renderSection(s, colors)).join('');
  } else {
    if (logo) {
      bodyHtml += `
        <tr>
          <td bgcolor="${colors.primary}" style="background-color: ${colors.primary}; padding: 25px 40px 15px 40px; text-align: center;">
            <img src="${logo}" alt="Logo" height="${logoHeight}" style="display: inline-block; height: ${logoHeight}px; width: auto;" />
          </td>
        </tr>`;
    }
    bodyHtml += sections.map(s => renderSection(s, colors)).join('');
  }

  // Insert an orange-rule divider directly before the footer section.
  const footerIndex = sections.findIndex(s => s.type === 'footer');
  if (footerIndex > 0) {
    const footerHtml = renderSection(sections[footerIndex], colors);
    const dividerHtml = `
        <tr>
          <td style="padding: 0 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="border-top: 2px solid ${colors.gold}; font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>`;
    const parts = bodyHtml.split(footerHtml);
    if (parts.length === 2) {
      bodyHtml = parts[0] + dividerHtml + footerHtml + parts[1];
    }
  }

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #e8e8e8; font-family: ${FONT_STACK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e8e8e8;">
    <tr>
      <td style="padding: 30px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" align="center" style="max-width: 640px; background-color: #ffffff;">
          ${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
