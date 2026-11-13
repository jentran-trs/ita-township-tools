import QRCode from 'qrcode';
import { createServerSupabaseClient } from '@/lib/supabase';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { formatEventTimes } from '@/lib/badges/attendance';
import type { BadgeData, BadgeEvent } from '@/components/badges/Badge';

/**
 * Everything needed to print a course's badges: the event header and one
 * badge per registrant (sorted by last name), each with its QR code as a
 * ~300 dpi PNG. Used by the admin print page and the PIN-protected print page
 * for whoever prints the badges.
 */
export async function loadBadgePrintData(
  courseId: string,
  ids: string[] = []
): Promise<{ event: BadgeEvent; badges: BadgeData[] } | null> {
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, name, course_date, course_end_date, event_start_time, event_end_time, badge_tagline, logo_url')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return null;

  let query = supabase
    .from('cert_registrants')
    .select('id, first_name, last_name, title, registrant_type, organization, township, county, badge_token')
    .eq('course_id', course.id)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (ids.length) query = query.in('id', ids);
  const { data: registrants } = await query;

  const badges: BadgeData[] = await Promise.all(
    (registrants || []).map(async (r: any) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      title: r.title,
      township: r.township,
      county: r.county,
      registrantType: r.registrant_type,
      organization: r.organization,
      // 480px PNG = ~300 dpi at the 1.6" printed size.
      qrSrc: await QRCode.toDataURL(r.badge_token, { margin: 0, width: 480, errorCorrectionLevel: 'M' }),
    }))
  );

  const event: BadgeEvent = {
    name: course.name,
    tagline: course.badge_tagline || null,
    dates: formatCourseDates(course.course_date, course.course_end_date),
    times: formatEventTimes(course.event_start_time, course.event_end_time),
    // Use the small badge-sized copy for the default ITA logo.
    logoUrl:
      !course.logo_url || course.logo_url === '/certificates/ita-logo.png' ? '/badges/ita-logo.png' : course.logo_url,
  };
  return { event, badges };
}
