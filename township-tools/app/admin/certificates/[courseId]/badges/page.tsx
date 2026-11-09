import { notFound, redirect } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../../_shared/BackLink';
import { BadgesClient } from './BadgesClient';

export const dynamic = 'force-dynamic';

type Params = { params: { courseId: string } };

export default async function CourseBadgesPage({ params }: Params) {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, course_id, name')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) notFound();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
          <BackLink href={`/admin/certificates/${course.id}`}>{course.name}</BackLink>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h1 className="text-xl font-bold">Badges &amp; check-in</h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BadgesClient courseId={course.id} />
      </main>
    </div>
  );
}
