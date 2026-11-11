import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { formatEventTimes } from '@/lib/badges/attendance';
import type { BadgeData, BadgeEvent } from '@/components/badges/Badge';
import { BadgePrintClient } from './BadgePrintClient';

export const dynamic = 'force-dynamic';

type Props = { params: { courseId: string }; searchParams: { ids?: string } };

export default async function BadgePrintPage({ params, searchParams }: Props) {
  if (!(await isSuperadmin())) redirect('/admin/contact-verification');

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, name, course_date, course_end_date, event_start_time, event_end_time, logo_url')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) notFound();

  let query = supabase
    .from('cert_registrants')
    .select('id, first_name, last_name, title, township, county, badge_token')
    .eq('course_id', course.id)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  const ids = (searchParams.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
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
      qrSvg: (await QRCode.toString(r.badge_token, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })).replace(
        '<svg ',
        '<svg width="100%" height="100%" '
      ),
    }))
  );

  const event: BadgeEvent = {
    name: course.name,
    dates: formatCourseDates(course.course_date, course.course_end_date),
    times: formatEventTimes(course.event_start_time, course.event_end_time),
    // Use the small badge-sized copy for the default ITA logo.
    logoUrl:
      !course.logo_url || course.logo_url === '/certificates/ita-logo.png' ? '/badges/ita-logo.png' : course.logo_url,
  };

  return <BadgePrintClient courseId={course.id} badges={badges} event={event} />;
}
