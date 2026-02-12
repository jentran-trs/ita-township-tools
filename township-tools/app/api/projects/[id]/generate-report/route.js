import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to safely get auth data (returns null if Clerk not configured)
async function getAuthData() {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    return await auth();
  } catch (error) {
    console.log('Clerk auth not available:', error.message);
    return null;
  }
}
import { Vibrant } from 'node-vibrant/node';

const DEFAULT_THEME_COLORS = {
  primary: '#2B3E50',
  primaryDark: '#1a2633',
  accent: '#C1272D',
  gold: '#D4B896',
};

// Helper to convert RGB to hex
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Calculate brightness of a color (0-255)
const getBrightness = (r, g, b) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

// Calculate saturation (0-1)
const getSaturation = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
};

// Color distance (Euclidean in RGB space)
const getColorDistance = (c1, c2) => {
  return Math.sqrt(
    (c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2
  );
};

// Extract colors from logo URL using node-vibrant
async function extractColorsFromLogo(logoUrl) {
  if (!logoUrl) return DEFAULT_THEME_COLORS;

  try {
    const palette = await Vibrant.from(logoUrl).getPalette();

    // Helper to convert a swatch to our internal format
    const toColor = (swatch) => {
      if (!swatch) return null;
      return {
        r: swatch.r, g: swatch.g, b: swatch.b,
        hex: swatch.hex,
        brightness: getBrightness(swatch.r, swatch.g, swatch.b),
        saturation: getSaturation(swatch.r, swatch.g, swatch.b),
        population: swatch.population,
      };
    };

    const swatches = {
      Vibrant: toColor(palette.Vibrant),
      DarkVibrant: toColor(palette.DarkVibrant),
      LightVibrant: toColor(palette.LightVibrant),
      Muted: toColor(palette.Muted),
      DarkMuted: toColor(palette.DarkMuted),
      LightMuted: toColor(palette.LightMuted),
    };

    const all = Object.values(swatches).filter(Boolean);
    if (all.length < 2) return DEFAULT_THEME_COLORS;

    const MIN_DISTANCE = 40;

    // --- PRIMARY: dark, brand-like color ---
    // Prefer DarkVibrant (dark + colorful), fallback to DarkMuted, then darkest overall
    const primaryColor =
      swatches.DarkVibrant ||
      swatches.DarkMuted ||
      [...all].sort((a, b) => a.brightness - b.brightness)[0];

    // --- ACCENT: most vibrant/saturated color, distinct from primary ---
    // Prefer Vibrant, fallback to Muted, then most saturated that's distinct from primary
    const accentCandidates = [
      swatches.Vibrant,
      swatches.Muted,
      ...[...all].sort((a, b) => b.saturation - a.saturation),
    ].filter(Boolean);

    const accentColor = accentCandidates.find(
      c => c !== primaryColor && getColorDistance(c, primaryColor) > MIN_DISTANCE
    ) || accentCandidates.find(c => c !== primaryColor) || primaryColor;

    // --- GOLD/HIGHLIGHT: bright accent color, distinct from primary & accent ---
    // Prefer LightVibrant (bright + colorful), fallback to LightMuted, then brightest distinct
    const goldCandidates = [
      swatches.LightVibrant,
      swatches.LightMuted,
      ...[...all].sort((a, b) => b.brightness - a.brightness),
    ].filter(Boolean);

    const goldColor = goldCandidates.find(
      c => c !== primaryColor && c !== accentColor &&
           getColorDistance(c, primaryColor) > MIN_DISTANCE &&
           getColorDistance(c, accentColor) > MIN_DISTANCE
    ) || goldCandidates.find(
      c => c !== primaryColor && c !== accentColor
    ) || { r: 212, g: 184, b: 150, hex: '#d4b896' }; // warm gold fallback

    const primary = primaryColor.hex;
    const primaryDark = rgbToHex(
      Math.max(0, primaryColor.r - 20),
      Math.max(0, primaryColor.g - 20),
      Math.max(0, primaryColor.b - 20)
    );
    const accent = accentColor.hex;
    const gold = goldColor.hex;

    console.log('Extracted colors from logo:', { primary, primaryDark, accent, gold });
    console.log('Palette swatches:', Object.fromEntries(
      Object.entries(swatches).map(([k, v]) => [k, v ? v.hex : null])
    ));

    return { primary, primaryDark, accent, gold };
  } catch (error) {
    console.error('Error extracting colors from logo:', error);
    return DEFAULT_THEME_COLORS;
  }
}

// POST - Generate report data from project submissions
export async function POST(request, { params }) {
  try {
    const authData = await getAuthData();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Use orgId from auth, fallback to query param (allow without when auth not available)
    const orgId = authData?.orgId || searchParams.get('orgId');

    const supabase = createServerSupabaseClient();

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all submissions with sections and stats
    const { data: submissions, error: submissionsError } = await supabase
      .from('report_submissions')
      .select(`
        *,
        report_sections(
          *,
          report_section_stats(*)
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Aggregate data from all submissions
    // Use the first submission's cover/footer data, or project defaults
    const primarySubmission = submissions?.[0];

    // Extract theme colors from logo
    const logoUrl = primarySubmission?.logo_url || null;
    const themeColors = await extractColorsFromLogo(logoUrl);

    // Build report structure for Report Builder
    const reportData = {
      // Brand settings
      logo: logoUrl,
      themeColors,

      // Sections array for Report Builder
      sections: [],
    };

    // Add Banner section
    // BannerSection expects: title (org name in gold), subtitle (report name in white), tagline (motto in gold)
    reportData.sections.push({
      type: 'banner',
      title: primarySubmission?.organization_name || project.organization_name,  // Organization name in gold
      subtitle: primarySubmission?.report_name || project.name,  // Report name in white
      tagline: primarySubmission?.tagline || '',  // Tagline/motto in gold
    });

    // Helper to convert plain text to HTML paragraphs (preserving line breaks)
    const textToHtml = (text) => {
      if (!text) return '';
      // Split by double newlines (paragraph breaks)
      const paragraphs = text.split(/\n\n+/);
      return paragraphs
        .map(p => {
          // Convert single newlines within paragraphs to <br>, preserve all content
          const withBreaks = p.replace(/\n/g, '<br>');
          return withBreaks ? `<p>${withBreaks}</p>` : '';
        })
        .filter(p => p)
        .join('');
    };

    // Add Opening Letter if any submission has one
    const letterSubmission = submissions?.find(s => s.include_opening_letter);
    if (letterSubmission) {
      reportData.sections.push({
        type: 'letter',
        heading: letterSubmission.letter_title || 'A Message from Leadership',
        subheading: letterSubmission.letter_subtitle || '',
        photo: letterSubmission.letter_headshot_url || null,
        content: textToHtml(letterSubmission.letter_content),
        bottomImage1: letterSubmission.letter_image1_url ? {
          src: letterSubmission.letter_image1_url,
          caption: letterSubmission.letter_image1_caption || '',
        } : null,
        bottomImage2: letterSubmission.letter_image2_url ? {
          src: letterSubmission.letter_image2_url,
          caption: letterSubmission.letter_image2_caption || '',
        } : null,
      });
    }

    // Helper to parse multiple cards from content with [CARD] tags
    const parseCardsFromContent = (rawContent) => {
      if (!rawContent) return [];

      const cards = [];

      // Match all [CARD]...[/CARD] blocks
      const cardRegex = /\[CARD\]\n?([\s\S]*?)\n?\[\/CARD\]/g;
      let match;

      while ((match = cardRegex.exec(rawContent)) !== null) {
        const cardContent = match[1].trim();
        // First line is title, rest is body
        const lines = cardContent.split('\n');
        const title = lines[0]?.trim() || '';
        // Remove leading empty lines from body, then trim
        const bodyLines = lines.slice(1);
        // Skip leading empty lines
        let startIdx = 0;
        while (startIdx < bodyLines.length && !bodyLines[startIdx].trim()) {
          startIdx++;
        }
        // Join lines and clean up: trim, remove leading/trailing whitespace, collapse multiple newlines
        const body = bodyLines.slice(startIdx).join('\n')
          .trim()
          .replace(/^[\s\n\r]+/, '')  // Remove all leading whitespace
          .replace(/[\s\n\r]+$/, '')  // Remove all trailing whitespace
          .replace(/\n{3,}/g, '\n\n'); // Collapse 3+ newlines to 2

        if (title || body) {
          cards.push({ title, content: body });
        }
      }

      // If no [CARD] tags found, treat the whole content as a single text block (not a card)
      if (cards.length === 0 && rawContent.trim()) {
        // Return empty - this content should be treated as text, not cards
        return [];
      }

      return cards;
    };

    // Helper to get plain text content (excluding [CARD] blocks)
    const getTextContent = (rawContent) => {
      if (!rawContent) return '';
      // Remove all [CARD]...[/CARD] blocks, preserve remaining text
      return rawContent.replace(/\[CARD\][\s\S]*?\[\/CARD\]/g, '');
    };

    // Collect all content sections from all submissions
    const allSections = [];
    for (const submission of submissions || []) {
      const sections = submission.report_sections || [];
      for (const section of sections) {
        // Sort stats by order
        const stats = (section.report_section_stats || [])
          .sort((a, b) => a.stat_order - b.stat_order)
          .map(stat => ({
            label: stat.label,
            value: stat.value,
          }));

        // Build images array
        const images = (section.image_urls || []).map((url, idx) => ({
          id: `img-${section.id}-${idx}`,
          src: url,
          caption: section.image_captions?.[idx] || '',
        }));

        // Parse cards and text content separately
        const parsedCards = parseCardsFromContent(section.content);
        const textContent = getTextContent(section.content);

        // Always use minimum sizes so admin can see all elements on one page
        // Admin can then resize/rearrange as needed
        const GAP = 10;

        // Stats sizing - minimum size
        const statWidth = 160;
        const statHeight = 100;
        const statsPerRow = 5;
        const statsRowHeight = statHeight + GAP;

        // Image sizing - minimum size
        const imageWidth = 220;
        const imageHeight = 140;
        const imagesPerRow = 4;
        const imageRowHeight = imageHeight + GAP + 16; // Extra for caption

        // Card sizing - minimum size
        const cardWidth = 380;
        const cardHeight = 120;
        const cardsPerRow = 2;
        const cardRowHeight = cardHeight + GAP;

        // Calculate vertical positions - all elements will be placed even if they overflow
        let currentY = GAP;

        // Stats positioning
        const statsStartY = currentY;
        const statsHeight_total = stats.length > 0 ? Math.ceil(stats.length / statsPerRow) * statsRowHeight : 0;
        currentY += statsHeight_total + (stats.length > 0 ? GAP : 0);

        // Cards positioning
        const cardsStartY = currentY;
        const cardsHeight_total = parsedCards.length > 0 ? Math.ceil(parsedCards.length / cardsPerRow) * cardRowHeight : 0;
        currentY += cardsHeight_total + (parsedCards.length > 0 ? GAP : 0);

        // Text block positioning (if any text content outside cards)
        const textBlockY = currentY;
        const textBlockHeight = textContent ? 100 : 0;
        currentY += textBlockHeight + (textContent ? GAP : 0);

        // Images positioning
        const imagesStartY = currentY;
        currentY += images.length > 0 ? Math.ceil(images.length / imagesPerRow) * imageRowHeight : 0;
        currentY += images.length > 0 ? GAP : 0;

        // Charts positioning - minimum size
        const chartsStartY = currentY;
        const chartWidth = 500;
        const chartHeight = 200;

        allSections.push({
          order: section.section_order,
          submissionDate: submission.created_at,
          data: {
            type: 'content',
            title: section.title,
            sectionNumber: '',
            designNotes: section.design_notes || '',
            // Convert stats to the stats array format expected by ContentSection
            stats: stats.map((stat, idx) => ({
              id: `stat-${section.id}-${idx}`,
              number: stat.value,
              label: stat.label,
              posX: GAP + (idx % statsPerRow) * (statWidth + GAP),
              posY: statsStartY + Math.floor(idx / statsPerRow) * statsRowHeight,
              width: statWidth,
              height: statHeight,
            })),
            // Convert images to the images array format expected by ContentSection
            images: images.map((img, idx) => ({
              id: img.id,
              src: img.src,
              caption: img.caption,
              posX: GAP + (idx % imagesPerRow) * (imageWidth + GAP),
              posY: imagesStartY + Math.floor(idx / imagesPerRow) * imageRowHeight,
              width: imageWidth,
              height: imageHeight,
              shape: 'rectangle',
            })),
            // Create separate cards for each content card
            cards: parsedCards.map((card, idx) => ({
              id: `card-${section.id}-${idx}`,
              title: card.title || '',
              content: card.content || '',
              posX: GAP + (idx % cardsPerRow) * (cardWidth + GAP),
              posY: cardsStartY + Math.floor(idx / cardsPerRow) * cardRowHeight,
              width: cardWidth,
              height: cardHeight,
            })),
            // Add text content as textBlocks (not cards) - only if there's actual content
            textBlocks: textContent && textContent.trim() ? [{
              id: `text-${section.id}`,
              content: textToHtml(textContent),
              posX: GAP,
              posY: textBlockY,
              width: 380,
              height: textBlockHeight,
            }] : [],
            charts: section.chart_link ? [{
              id: `chart-${section.id}`,
              chartImage: section.chart_link,
              caption: section.chart_caption || '',
              posX: GAP,
              posY: chartsStartY,
              width: chartWidth,
              height: chartHeight,
            }] : [],
            footers: [],
          },
        });
      }
    }

    // Helper to convert number to word
    const numberToWord = (num) => {
      const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
      return num <= 20 ? words[num] : num.toString();
    };

    // Sort all sections and add to report with section numbers
    allSections.sort((a, b) => a.order - b.order);
    let contentSectionIndex = 0;
    for (const section of allSections) {
      contentSectionIndex++;
      section.data.sectionNumber = `Section ${numberToWord(contentSectionIndex)}`;
      reportData.sections.push(section.data);
    }

    // Add Footer as an element in the last content section (or create one if none exist)
    if (primarySubmission) {
      const footerElement = {
        id: `footer-${Date.now()}`,
        name: primarySubmission.organization_name || project.organization_name,
        subtitle: primarySubmission.department || '',
        address: primarySubmission.street_address || '',
        cityStateZip: primarySubmission.city_state_zip || '',
        phone: primarySubmission.phone ? `Phone: ${primarySubmission.phone}` : '',
        email: primarySubmission.email ? `Email: ${primarySubmission.email}` : '',
        website: primarySubmission.website ? `Website: ${primarySubmission.website}` : '',
        posX: 65,
        posY: 20,
        width: 860,
        height: 400,
      };

      // Find the last content section or create one for the footer
      const lastContentSectionIdx = reportData.sections.map((s, i) => ({ s, i }))
        .filter(({ s }) => s.type === 'content')
        .pop()?.i;

      if (lastContentSectionIdx !== undefined) {
        // Add footer element to the last content section
        reportData.sections[lastContentSectionIdx].footers = [footerElement];
      } else {
        // Create a new content section just for the footer
        reportData.sections.push({
          type: 'content',
          title: '',
          sectionNumber: '',
          stats: [],
          images: [],
          cards: [],
          textBlocks: [],
          charts: [],
          footers: [footerElement],
        });
      }
    }

    return NextResponse.json({
      success: true,
      reportData,
      project,
      submissionCount: submissions?.length || 0,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
