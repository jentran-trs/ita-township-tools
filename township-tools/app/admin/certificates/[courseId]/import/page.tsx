import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Upload } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from '../../_shared/BackLink';
import { ImportClient } from './ImportClient';

export const dynamic = 'force-dynamic';

type Params = { params: { courseId: string } };

export default async function ImportAttendeesPage({ params }: Params) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackLink href={`/admin/certificates/${course.id}`}>{course.name}</BackLink>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl font-bold">Import attendees</h1>
            </div>
          </div>
          <Link
            href={`/admin/certificates/${course.id}`}
            className="text-sm text-gray-500 hover:underline"
          >
            View course
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3 space-y-2">
          <p>
            Upload an <code className="font-mono">.xlsx</code> or <code className="font-mono">.csv</code> file.
            Required columns: <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>.
            Optional: <strong>Township</strong>, <strong>County</strong>. Header matching is case-insensitive.
            Every new row becomes an active certificate the moment you commit.
          </p>
          <p>
            <strong>You can re-upload the same file later.</strong> Add more attendees to the same spreadsheet
            and upload it again — the system recognizes people who already have a certificate for this course
            (matched by email + first name + last name) and skips them, so only the new names get new
            certificates. Keep name spellings consistent across uploads so the match works reliably.
          </p>
        </div>

        <ImportClient courseId={course.id} courseLabel={course.name} />
      </main>
    </div>
  );
}
