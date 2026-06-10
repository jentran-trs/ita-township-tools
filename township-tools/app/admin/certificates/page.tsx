import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Award, FileSignature, Plus, ShieldCheck } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from './_shared/BackLink';
import { CoursesTable } from './_shared/CoursesTable';

export const dynamic = 'force-dynamic';

export default async function CertificateCoursesPage() {
  if (!(await isSuperadmin())) {
    redirect('/admin/contact-verification');
  }

  const supabase = createServerSupabaseClient();
  const { data: courses } = await supabase
    .from('cert_course_summary')
    .select('*')
    .order('course_date', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackLink href="/dashboard">Dashboard</BackLink>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">Certificates</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/certificates/signatures"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FileSignature className="w-4 h-4" />
              Default signature
            </Link>
            <Link
              href="/admin/certificates/preview"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ShieldCheck className="w-4 h-4" />
              Preview Certificate
            </Link>
            <Link
              href="/admin/certificates/new"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <Plus className="w-4 h-4" />
              New course
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Create training courses, import attendees, and let attendees retrieve their certificates from the
          public lookup page.
        </p>

        <CoursesTable initialCourses={(courses as any) || []} />
      </main>
    </div>
  );
}
