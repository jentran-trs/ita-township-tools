import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  GraduationCap,
  MapPin,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Params = { params: { credentialId: string } };

const METHOD_LABEL: Record<string, string> = {
  in_person: 'In-Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m
    ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: Params) {
  const credentialId = decodeURIComponent(params.credentialId);
  return {
    title: `Verify ${credentialId} · Indiana Township Association`,
  };
}

export default async function VerifyResultPage({ params }: Params) {
  const credentialId = decodeURIComponent(params.credentialId).trim();
  const supabase = createServerSupabaseClient();

  const { data: cert } = await supabase
    .from('certificates')
    .select(
      'credential_id, attendee_first, attendee_last, attendee_township, attendee_county, status, issued_at, course_id'
    )
    .eq('credential_id', credentialId)
    .maybeSingle();

  let course: any = null;
  if (cert?.course_id) {
    const { data } = await supabase
      .from('cert_courses')
      .select(
        'course_id, name, hours, method, course_date, org_name, syllabus, syllabus_file_url, syllabus_file_name'
      )
      .eq('id', cert.course_id)
      .maybeSingle();
    course = data;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <Award className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            <span className="font-bold text-lg">Township Tools</span>
          </Link>
          <Link
            href="/certificates/verify"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Verify another
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="mb-6">
          <Link href="/certificates/verify" className="text-sm text-gray-500 hover:underline">
            ← Verify another credential
          </Link>
        </div>

        <div className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Credential ID</div>
        <h1 className="text-2xl sm:text-3xl font-bold font-mono break-all mb-6">{credentialId}</h1>

        {!cert || !course ? (
          <ResultCard
            status="not_found"
            title="No credential found"
            body="We don't have any record of that credential ID. Double-check that it was copied correctly — IDs are case-sensitive and may include a year suffix and a 6-character code."
          />
        ) : cert.status === 'revoked' ? (
          <ResultCard
            status="revoked"
            title="Credential revoked"
            body="This credential has been revoked by the Indiana Township Association. Contact ITA if you need clarification."
          >
            <CertSummary cert={cert} course={course} />
          </ResultCard>
        ) : cert.status === 'reissued' ? (
          <ResultCard
            status="reissued"
            title="Credential superseded"
            body="A newer credential has been issued for this attendee and course. The new credential ID supersedes this one."
          >
            <CertSummary cert={cert} course={course} />
          </ResultCard>
        ) : (
          <ResultCard
            status="active"
            title="Credential verified"
            body={`This certificate is currently valid and was issued by the ${course.org_name}.`}
          >
            <CertSummary cert={cert} course={course} />
          </ResultCard>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  status,
  title,
  body,
  children,
}: {
  status: 'active' | 'revoked' | 'reissued' | 'not_found';
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const tone =
    status === 'active'
      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
      : status === 'revoked' || status === 'not_found'
      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900';
  const Icon =
    status === 'active'
      ? CheckCircle2
      : status === 'revoked'
      ? XCircle
      : status === 'reissued'
      ? RotateCcw
      : AlertTriangle;
  const iconColor =
    status === 'active'
      ? 'text-emerald-600 dark:text-emerald-400'
      : status === 'revoked' || status === 'not_found'
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <div className={`border rounded-xl p-5 sm:p-6 ${tone}`}>
      <div className="flex items-start gap-3 mb-3">
        <Icon className={`w-7 h-7 flex-shrink-0 ${iconColor}`} />
        <div>
          <h2 className="text-xl font-bold leading-tight mb-1">{title}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{body}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CertSummary({ cert, course }: { cert: any; course: any }) {
  const fullName = `${cert.attendee_first} ${cert.attendee_last}`.trim();
  return (
    <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-5">
      <div className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
        {course.course_id}
      </div>
      <div className="text-lg font-bold mb-3">{course.name}</div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        <Pair icon={<Award className="w-4 h-4" />} label="Recipient">
          {fullName}
        </Pair>
        <Pair icon={<Calendar className="w-4 h-4" />} label="Course date">
          {formatDate(course.course_date)}
        </Pair>
        <Pair icon={<GraduationCap className="w-4 h-4" />} label="Hours">
          {Number(course.hours).toFixed(1)} · {METHOD_LABEL[course.method] || course.method}
        </Pair>
        <Pair icon={<ShieldCheck className="w-4 h-4" />} label="Issued by">
          {course.org_name}
        </Pair>
        {(cert.attendee_township || cert.attendee_county) && (
          <Pair icon={<MapPin className="w-4 h-4" />} label="Location">
            {[cert.attendee_township, cert.attendee_county && `${cert.attendee_county} County`]
              .filter(Boolean)
              .join(', ')}
          </Pair>
        )}
        {cert.issued_at && (
          <Pair icon={<Calendar className="w-4 h-4" />} label="Issued on">
            {formatDate(cert.issued_at.slice(0, 10))}
          </Pair>
        )}
      </dl>
      {(course.syllabus || course.syllabus_file_url) && (
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Course syllabus
          </div>
          {course.syllabus && (
            <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-3">
              {course.syllabus}
            </div>
          )}
          {course.syllabus_file_url && (
            <a
              href={course.syllabus_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50"
            >
              <FileText className="w-4 h-4" />
              {course.syllabus_file_name || 'Download syllabus'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Pair({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="font-medium truncate">{children}</span>
    </div>
  );
}
