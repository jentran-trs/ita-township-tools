import { redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import MergerMap from '@/components/merger-map/MergerMap';
import { DEFAULT_SETTINGS, type CountyMeeting, type MapSettings } from '@/lib/merger-map/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Township Merger Meetings · Indiana Township Association',
};

// Superadmin-only copy of the merger meeting map. The public version is the
// AMO paste block on the ITA website (lib/merger-map/amo), which reads and
// saves through /api/merger-map/*. Editing here still unlocks with the
// MERGER_MAP_PASSCODE passcode, same as on the ITA site.
export default async function MergerMapPage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  let meetings: CountyMeeting[] = [];
  let settings: MapSettings = DEFAULT_SETTINGS;
  let loadError = false;

  try {
    const supabase = createServerSupabaseClient();
    const [m, s] = await Promise.all([
      supabase
        .from('merger_map_counties')
        .select('county, status, contact_name, meeting_date, meeting_time, location, notes'),
      supabase
        .from('merger_map_settings')
        .select('title, intro, contact_name, contact_email, contact_phone')
        .eq('id', 1)
        .maybeSingle(),
    ]);
    if (m.error) throw m.error;
    meetings = (m.data ?? []) as CountyMeeting[];
    if (s.data) settings = { ...DEFAULT_SETTINGS, ...s.data };
  } catch (e) {
    console.error('merger-map load failed', e);
    loadError = true;
  }

  return <MergerMap initialMeetings={meetings} initialSettings={settings} loadError={loadError} />;
}
