import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ExternalLink, Upload } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../_shared/BackLink';
import { CourseFormInitial } from '../_shared/CourseForm';
import { CourseTabs } from './CourseTabs';

export const dynamic = 'force-dynamic';

type Params = { params: { courseId: string } };

export default async function CourseDetailPage({ params }: Params) {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('*')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) notFound();

  const [{ data: signatures }, { data: certificates }, { data: otherCourses }] = await Promise.all([
    supabase
      .from('cert_signatures')
      .select('*')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('certificates')
      .select('*')
      .eq('course_id', course.id)
      .order('attendee_last', { ascending: true }),
    supabase.from('cert_courses').select('course_id').neq('id', course.id),
  ]);

  const initial: CourseFormInitial = {
    id: course.id,
    course_id: course.course_id,
    name: course.name,
    hours: String(course.hours),
    method: course.method,
    course_date: course.course_date,
    syllabus: course.syllabus || '',
    syllabus_file_url: course.syllabus_file_url || null,
    syllabus_file_name: course.syllabus_file_name || null,
    org_name: course.org_name,
    logo_url: course.logo_url,
    signatures: (signatures || []).map((s: any, i: number) => ({
      signer_name: s.signer_name,
      signer_title: s.signer_title,
      signature_image_url: s.signature_image_url,
      signer_organization: s.signer_organization || '',
      display_order: typeof s.display_order === 'number' ? s.display_order : i,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackLink href="/admin/certificates">Certificates</BackLink>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-mono">{course.course_id}</div>
              <h1 className="text-lg sm:text-xl font-bold truncate">{course.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {certificates && certificates.length > 0 ? (
              <Link
                href={`/certificates/verify/${encodeURIComponent(certificates[0].credential_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="See what an outsider sees when they scan the QR code on a certificate from this course"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Course Summary Page
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 cursor-not-allowed"
                title="Import at least one attendee to preview the public page"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Course Summary Page
              </span>
            )}
            <Link
              href={`/admin/certificates/${course.id}/import`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <Upload className="w-4 h-4" />
              Import attendees
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        <CourseTabs
          courseId={course.id}
          certificates={certificates || []}
          formInitial={initial}
          existingCourseIds={(otherCourses || []).map((c: any) => c.course_id)}
        />
      </main>
    </div>
  );
}
