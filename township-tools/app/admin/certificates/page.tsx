import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Award, FileSignature, Plus, ShieldCheck } from 'lucide-react';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BackLink } from './_shared/BackLink';

export const dynamic = 'force-dynamic';

const METHOD_LABEL: Record<string, string> = {
  in_person: 'In-Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const dt = m
    ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    : new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

        {!courses?.length ? (
          <EmptyState />
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 font-semibold">Hours</th>
                  <th className="px-4 py-3 font-semibold text-right">Active certs</th>
                  <th className="px-4 py-3 font-semibold text-right">Last issued</th>
                  <th className="px-4 py-3 font-semibold text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {courses.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/certificates/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{c.course_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(c.course_date)}</td>
                    <td className="px-4 py-3 text-sm">{METHOD_LABEL[c.method] || c.method}</td>
                    <td className="px-4 py-3 text-sm">{Number(c.hours).toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-right">{c.active_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {formatDate(c.last_issued_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/certificates/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60"
                      >
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
      <Award className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
      <h2 className="text-lg font-semibold mb-2">No courses yet</h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
        Create your first training course to start issuing certificates. New courses pre-fill from the
        default Executive Director signature — set that up first if you haven&apos;t already.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/admin/certificates/signatures"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <FileSignature className="w-4 h-4" />
          Set default signature
        </Link>
        <Link
          href="/admin/certificates/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" />
          Create course
        </Link>
      </div>
    </div>
  );
}
