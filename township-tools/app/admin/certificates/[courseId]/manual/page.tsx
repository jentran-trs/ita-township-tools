import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../../_shared/BackLink';
import { AttendeesTable } from '../AttendeesTable';

export const dynamic = 'force-dynamic';

type Params = { params: { courseId: string } };

// The second way to issue certificates: import a list (or add people one at a
// time) and they get certificates straight away, no badges or check-in. It
// also lists every certificate this course has issued, however it was issued.
export default async function ManualCertificatesPage({ params }: Params) {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, course_id, name, badge_checkin_enabled')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) notFound();

  const { data: certificates } = await supabase
    .from('certificates')
    .select('*')
    .eq('course_id', course.id)
    .order('attendee_last', { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackLink href={`/admin/certificates/${course.id}`}>{course.name}</BackLink>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">Manual import &amp; issued certificates</h1>
            </div>
          </div>
          <Link
            href={`/admin/certificates/${course.id}/import`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <Upload className="w-4 h-4" />
            Import attendees for certificates
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-32 space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3">
          {course.badge_checkin_enabled ? (
            <>
              This course uses badges and check-in, so certificates are normally issued from attendance on the{' '}
              <Link href={`/admin/certificates/${course.id}#certificates`} className="font-semibold underline">
                course page
              </Link>
              . Use this page to see every issued certificate (download, edit, revoke) or to add someone by hand.
              Importing here issues certificates straight away, without checking attendance.
            </>
          ) : (
            <>
              Importing a list or adding someone here issues their certificate straight away, without badges or
              check-in. Below is every certificate this course has issued.
            </>
          )}
        </div>
        <AttendeesTable certificates={certificates || []} courseId={course.id} />
      </main>
    </div>
  );
}
