"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, FileSignature, Loader2, Plus, Trash2 } from 'lucide-react';

type Course = {
  id: string;
  course_id: string;
  name: string;
  course_date: string | null;
  method: string;
  hours: number | string;
  active_count: number | null;
  last_issued_at: string | null;
};

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

export function CoursesTable({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async (course: Course) => {
    const count = course.active_count ?? 0;
    const message =
      count > 0
        ? `Delete "${course.name}" AND its ${count} issued certificate${count === 1 ? '' : 's'}?\n\nThis is permanent. Attendees will no longer be able to download these certificates, and the credential IDs will no longer verify.`
        : `Delete "${course.name}"? This is permanent.`;
    if (!confirm(message)) return;

    setError(null);
    setDeletingId(course.id);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${course.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      // Remove from local state so the row disappears immediately without a refresh.
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (!courses.length) {
    return <EmptyState />;
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3"
        >
          {error}
        </div>
      )}
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
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/certificates/${c.id}`} className="font-medium hover:underline">
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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/certificates/${c.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60"
                    >
                      View
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      disabled={deletingId === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 disabled:opacity-50"
                      title={`Delete ${c.name}`}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {deletingId === c.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
