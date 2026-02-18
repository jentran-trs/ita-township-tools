import { escapeHtml, sanitizeHtmlForEmail, lightenColor, getContrastColor } from './shared';

const renderSection = (section, colors) => {
  const { type, data } = section;
  const c = colors;

  switch (type) {
    case 'header':
      return `
        <tr>
          <td style="background-color: ${c.primary}; padding: 30px 40px; text-align: center;">
            ${data.title ? `<h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, sans-serif;">${escapeHtml(data.title)}</h1>` : ''}
            ${data.subtitle ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: ${lightenColor(c.primary, 0.6)}; font-family: Arial, sans-serif;">${escapeHtml(data.subtitle)}</p>` : ''}
          </td>
        </tr>`;

    case 'greeting': {
      const greetingText = data.greeting || data.text || '';
      const signOffs = data.signOffs || [];
      const hasSignOff = data.signOffLine || signOffs.some(s => s.name);
      return `
        <tr>
          <td style="padding: 15px 40px 5px 40px;">
            ${greetingText ? `<p style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: ${c.accent}; font-family: Arial, sans-serif;">${escapeHtml(greetingText)}</p>` : ''}
            ${data.content ? `<div style="font-size: 16px; line-height: 1.6; color: #333333; font-family: Arial, sans-serif; margin-bottom: ${hasSignOff ? '16px' : '0'};">${sanitizeHtmlForEmail(data.content)}</div>` : ''}
            ${data.signOffLine ? `<p style="margin: 0 0 8px 0; font-size: 16px; color: #333333; font-family: Arial, sans-serif;">${escapeHtml(data.signOffLine)}</p>` : ''}
            ${signOffs.filter(s => s.name).map(s => `
              <p style="margin: 0; font-size: 16px; font-family: Arial, sans-serif;">
                <strong style="color: #333333;">${escapeHtml(s.name)}</strong>${s.title ? `<span style="color: #666666;">, ${escapeHtml(s.title)}</span>` : ''}
              </p>`).join('')}
            ${data.org ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: ${c.primary}; font-style: italic; font-family: Arial, sans-serif;">${escapeHtml(data.org)}</p>` : ''}
          </td>
        </tr>`;
    }

    case 'image': {
      if (!data.url) return '';
      const imgWidth = data.width || 100;
      const shape = data.shape || 'rectangle';
      const align = data.align || 'center';
      const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
      const borderRadius = shape === 'circle' ? '50%' : '0';
      const sizeStyle = shape === 'circle' || shape === 'square'
        ? `width: ${imgWidth}%; max-width: ${imgWidth === 100 ? '600' : Math.round(600 * imgWidth / 100)}px; aspect-ratio: 1 / 1; object-fit: cover;`
        : `width: ${imgWidth}%; max-width: ${imgWidth === 100 ? '600' : Math.round(600 * imgWidth / 100)}px; height: auto;`;
      const imgTag = `<img src="${escapeHtml(data.url)}" alt="${escapeHtml(data.alt || '')}" style="${sizeStyle} border-radius: ${borderRadius}; display: inline-block;" />`;
      const content = data.linkUrl
        ? `<a href="${escapeHtml(data.linkUrl)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`
        : imgTag;
      return `
        <tr>
          <td style="padding: 10px 40px; text-align: ${textAlign};">
            ${content}
          </td>
        </tr>`;
    }

    case 'contentBody':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <div style="font-size: 16px; line-height: 1.6; color: #333333; font-family: Arial, sans-serif;">
              ${sanitizeHtmlForEmail(data.content)}
            </div>
          </td>
        </tr>`;

    case 'highlighted':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="border-left: 4px solid ${c.accent}; padding: 15px 20px; background-color: ${lightenColor(c.accent, 0.95)};">
                  ${data.heading ? `<h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: ${c.accent}; font-family: Arial, sans-serif;">${escapeHtml(data.heading)}</h3>` : ''}
                  <div style="font-size: 16px; line-height: 1.6; color: #333333; font-family: Arial, sans-serif;">
                    ${sanitizeHtmlForEmail(data.content)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case 'importantNotice':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="border-left: 4px solid ${c.gold}; padding: 15px 20px; background-color: #fffbeb;">
                  ${data.heading ? `<h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #92400e; font-family: Arial, sans-serif;">&#9888; ${escapeHtml(data.heading)}</h3>` : ''}
                  <div style="font-size: 14px; line-height: 1.6; color: #78350f; font-family: Arial, sans-serif;">
                    ${sanitizeHtmlForEmail(data.content)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case 'alertBox':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="border-left: 4px solid ${c.accent}; padding: 15px 20px; background-color: #fef2f2;">
                  ${data.heading ? `<h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #991b1b; font-family: Arial, sans-serif;">&#9888; ${escapeHtml(data.heading)}</h3>` : ''}
                  <div style="font-size: 14px; line-height: 1.6; color: #7f1d1d; font-family: Arial, sans-serif;">
                    ${sanitizeHtmlForEmail(data.content)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case 'ctaButton': {
      const buttons = data.buttons || (data.buttonText ? [{ text: data.buttonText, url: data.url || '' }] : []);
      const renderedButtons = buttons.filter(b => b.text).map(btn => `
              <!--[if mso]><td style="padding: 0 4px;" valign="top"><![endif]-->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="display: inline-block; vertical-align: top; margin: 4px;">
                <tr>
                  <td style="background-color: ${c.gold}; border-radius: 6px; padding: 14px 32px;">
                    <a href="${escapeHtml(btn.url || '#')}" style="color: ${getContrastColor(c.gold)}; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block;">${escapeHtml(btn.text)}</a>
                  </td>
                </tr>
              </table>
              <!--[if mso]></td><![endif]-->`).join('');
      return `
        <tr>
          <td style="padding: 10px 40px; text-align: center;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><![endif]-->
            ${renderedButtons}
            <!--[if mso]></tr></table><![endif]-->
            ${data.helperText ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #888888; font-family: Arial, sans-serif;">${escapeHtml(data.helperText)}</p>` : ''}
          </td>
        </tr>`;
    }

    case 'meetingDetails':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <div style="background-color: #f9f9f9; border-top: 4px solid ${c.gold}; padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px;">
                          <p style="margin: 0 0 25px 0; font-family: 'Instrument Sans', Arial, sans-serif; font-size: 22px; font-weight: 700; color: ${c.primary}; text-align: center;">Meeting Details</p>
                          ${data.date ? `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="font-family: 'Instrument Sans', Arial, sans-serif; padding-bottom: 16px; border-bottom: 1px solid #e0e0e0;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;">Date</p>
                                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333333;">${escapeHtml(data.date)}</p>
                              </td>
                            </tr>
                          </table>` : ''}
                          ${data.time ? `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                            <tr>
                              <td style="font-family: 'Instrument Sans', Arial, sans-serif; padding-bottom: 16px; border-bottom: 1px solid #e0e0e0;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;">Time</p>
                                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333333;">${escapeHtml(data.time)}</p>
                              </td>
                            </tr>
                          </table>` : ''}
                          ${data.format ? `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                            <tr>
                              <td style="font-family: 'Instrument Sans', Arial, sans-serif; padding-bottom: 16px; border-bottom: 1px solid #e0e0e0;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;">Format</p>
                                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333333;">${escapeHtml(data.format)}</p>
                              </td>
                            </tr>
                          </table>` : ''}
                          ${data.meetingId || data.passcode ? `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                            ${data.meetingId ? `
                            <tr>
                              <td style="font-family: 'Instrument Sans', Arial, sans-serif; padding-bottom: 8px;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;">Meeting ID</p>
                                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333333;">${escapeHtml(data.meetingId)}</p>
                              </td>
                            </tr>` : ''}
                            ${data.passcode ? `
                            <tr>
                              <td style="font-family: 'Instrument Sans', Arial, sans-serif; padding-top: 8px;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; text-transform: uppercase; letter-spacing: 1px;">Passcode</p>
                                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333333;">${escapeHtml(data.passcode)}</p>
                              </td>
                            </tr>` : ''}
                          </table>` : ''}
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${data.meetingUrl ? `
        <tr>
          <td style="padding: 8px 40px 8px 40px; text-align: center;">
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color: ${c.accent}; padding: 18px 50px;">
                  <a href="${escapeHtml(data.meetingUrl)}" style="color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; font-family: 'Instrument Sans', Arial, sans-serif; display: inline-block;">${escapeHtml(data.buttonText || 'JOIN MEETING')}</a>
                </td>
              </tr>
            </table>
            <p style="margin: 14px 0 0 0; font-family: 'Instrument Sans', Arial, sans-serif; font-size: 14px; color: #888888; line-height: 1.5;">Or copy this link into your browser:<br>
            <a href="${escapeHtml(data.meetingUrl)}" style="color: ${c.primary}; text-decoration: underline; font-size: 13px; word-break: break-all;">${escapeHtml(data.meetingUrl)}</a></p>
          </td>
        </tr>` : ''}`;

    case 'twoColumn':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" width="48%" style="padding-right: 2%;">
                  ${data.leftHeading ? `<h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${c.primary}; font-family: Arial, sans-serif;">${escapeHtml(data.leftHeading)}</h3>` : ''}
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #555555; font-family: Arial, sans-serif;">${escapeHtml(data.leftText)}</p>
                </td>
                <td valign="top" width="48%" style="padding-left: 2%;">
                  ${data.rightHeading ? `<h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${c.primary}; font-family: Arial, sans-serif;">${escapeHtml(data.rightHeading)}</h3>` : ''}
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #555555; font-family: Arial, sans-serif;">${escapeHtml(data.rightText)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case 'resourceLinks': {
      const links = data.links || [];
      return `
        <tr>
          <td style="padding: 8px 40px;">
            ${data.heading ? `<h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${c.primary}; font-family: Arial, sans-serif;">${escapeHtml(data.heading)}</h3>` : ''}
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${links.filter(l => l.text).map(link => `
              <tr>
                <td style="padding: 6px 0;">
                  <a href="${escapeHtml(link.url || '#')}" style="color: ${c.gold}; text-decoration: none; font-size: 15px; font-weight: 600; font-family: Arial, sans-serif;">&#8594; ${escapeHtml(link.text)}</a>
                </td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>`;
    }

    case 'list': {
      const items = (data.items || []).filter(item => item);
      const tag = data.listType === 'numbered' ? 'ol' : 'ul';
      return `
        <tr>
          <td style="padding: 8px 40px;">
            ${data.heading ? `<h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: ${c.primary}; font-family: Arial, sans-serif;">${escapeHtml(data.heading)}</h3>` : ''}
            <${tag} style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6; color: #333333; font-family: Arial, sans-serif;">
              ${items.map(item => `<li style="margin-bottom: 6px;">${escapeHtml(item)}</li>`).join('')}
            </${tag}>
          </td>
        </tr>`;
    }

    case 'closing':
      return `
        <tr>
          <td style="padding: 8px 40px;">
            <div style="font-size: 16px; line-height: 1.6; color: #333333; font-family: Arial, sans-serif;">
              ${sanitizeHtmlForEmail(data.content)}
            </div>
          </td>
        </tr>`;

    case 'signature':
      return `
        <tr>
          <td style="padding: 8px 40px 15px 40px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left: 3px solid ${c.gold}; padding-left: 15px;">
                  ${data.name ? `<p style="margin: 0; font-size: 16px; font-weight: bold; color: #333333; font-family: Arial, sans-serif;">${escapeHtml(data.name)}</p>` : ''}
                  ${data.title ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: #666666; font-family: Arial, sans-serif;">${escapeHtml(data.title)}</p>` : ''}
                  ${data.org ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: ${c.primary}; font-weight: 600; font-family: Arial, sans-serif;">${escapeHtml(data.org)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case 'footer':
      return `
        <tr>
          <td style="background-color: ${c.primary}; padding: 25px 40px; text-align: center;">
            ${data.orgName ? `<p style="margin: 0; font-size: 14px; font-weight: bold; color: #ffffff; font-family: Arial, sans-serif;">${escapeHtml(data.orgName)}</p>` : ''}
            ${data.website ? `<p style="margin: 6px 0 0 0;"><a href="${escapeHtml(data.website)}" style="color: ${c.gold}; text-decoration: none; font-size: 13px; font-family: Arial, sans-serif;">${escapeHtml(data.website)}</a></p>` : ''}
            ${data.tagline ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: ${lightenColor(c.primary, 0.5)}; font-family: Arial, sans-serif;">${escapeHtml(data.tagline)}</p>` : ''}
          </td>
        </tr>`;

    default:
      return '';
  }
};

export const generateEmailHtml = (sections, colors, logo, logoWidth = 120) => {
  const sectionHtml = sections.map(s => renderSection(s, colors)).join('');

  const logoHtml = logo ? `
    <tr>
      <td style="background-color: ${colors.primary}; padding: 20px 40px 0 40px; text-align: center;">
        <img src="${logo}" alt="Logo" width="${logoWidth}" style="display: inline-block; max-width: ${logoWidth}px; height: auto;" />
      </td>
    </tr>` : '';

  // Check if first section is header - if so, merge logo into header
  const firstSection = sections[0];
  let bodyHtml;
  if (logo && firstSection?.type === 'header') {
    const headerWithLogo = `
      <tr>
        <td style="background-color: ${colors.primary}; padding: 25px 40px; text-align: center;">
          <img src="${logo}" alt="Logo" width="${logoWidth}" style="display: inline-block; max-width: ${logoWidth}px; height: auto; margin-bottom: 15px;" />
          ${firstSection.data.title ? `<h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, sans-serif;">${escapeHtml(firstSection.data.title)}</h1>` : ''}
          ${firstSection.data.subtitle ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: ${lightenColor(colors.primary, 0.6)}; font-family: Arial, sans-serif;">${escapeHtml(firstSection.data.subtitle)}</p>` : ''}
        </td>
      </tr>`;
    const spacer = `<tr><td style="padding: 0; font-size: 0; line-height: 0; height: 16px;">&nbsp;</td></tr>`;
    bodyHtml = headerWithLogo + spacer + sections.slice(1).map(s => renderSection(s, colors)).join('');
  } else {
    const spacer = `<tr><td style="padding: 0; font-size: 0; line-height: 0; height: 16px;">&nbsp;</td></tr>`;
    const firstSectionHtml = renderSection(sections[0], colors);
    const restHtml = sections.slice(1).map(s => renderSection(s, colors)).join('');
    bodyHtml = logoHtml + firstSectionHtml + spacer + restHtml;
  }

  // Decorative divider before footer
  const footerIndex = sections.findIndex(s => s.type === 'footer');
  if (footerIndex > 0) {
    const beforeFooter = `
      <tr>
        <td style="padding: 5px 40px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="border-bottom: 2px solid ${colors.gold}; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>`;
    // Insert divider before footer in the HTML
    const parts = bodyHtml.split(renderSection(sections[footerIndex], colors));
    if (parts.length === 2) {
      bodyHtml = parts[0] + beforeFooter + renderSection(sections[footerIndex], colors) + parts[1];
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width: 700px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
