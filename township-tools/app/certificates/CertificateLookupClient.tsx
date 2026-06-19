"use client";

import { useMemo, useState } from 'react';
import { Award, Calendar, Filter, GraduationCap, Loader2, Mail, MapPin, Search, User, Users, X } from 'lucide-react';
import { CertificateDownloadButton } from '@/components/certificates/CertificateDownloadButton';
import { townshipLabel } from '@/lib/certificates/township';

type Sig = {
  signer_name: string;
  signer_title: string;
  signature_image_url: string;
  signer_organization?: string | null;
};

type CertCard = {
  credential_id: string;
  attendee_first: string;
  attendee_last: string;
  attendee_email: string;
  attendee_township: string | null;
  attendee_county: string | null;
  issued_at: string;
  course: {
    course_id: string;
    name: string;
    hours: number;
    method: 'in_person' | 'online' | 'hybrid';
    course_date: string;
    org_name: string;
    logo_url: string;
  };
  signatures: Sig[];
};

const METHOD_LABEL: Record<CertCard['course']['method'], string> = {
  in_person: 'In-Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

function formatDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m
    ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

type AvailableCourse = {
  id: string;
  course_id: string;
  name: string;
  course_date: string;
};

export function CertificateLookupClient({
  availableCourses = [],
}: {
  availableCourses?: AvailableCourse[];
}) {
  const [mode, setMode] = useState<'email' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [preCourseFilter, setPreCourseFilter] = useState<string>('all');
  const [submitted, setSubmitted] = useState(false);
  const [searchedLabel, setSearchedLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CertCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const c of availableCourses) {
      const m = /^(\d{4})/.exec(c.course_date);
      if (m) set.add(m[1]);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [availableCourses]);

  const [preYearFilter, setPreYearFilter] = useState<string>('all');

  // Available courses filtered by the year picker, so picking a year narrows
  // the course dropdown to that year's courses.
  const visibleCourses = useMemo(() => {
    if (preYearFilter === 'all') return availableCourses;
    return availableCourses.filter((c) => c.course_date.startsWith(preYearFilter));
  }, [availableCourses, preYearFilter]);

  // Distinct courses + years across the result set (drives the dropdowns).
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of results) {
      if (!map.has(c.course.course_id)) {
        map.set(c.course.course_id, c.course.name);
      }
    }
    return Array.from(map.entries())
      .map(([course_id, name]) => ({ course_id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of results) {
      const m = /^(\d{4})/.exec(c.course.course_date);
      if (m) set.add(m[1]);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [results]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return results.filter((c) => {
      if (courseFilter !== 'all' && c.course.course_id !== courseFilter) return false;
      if (yearFilter !== 'all') {
        const m = /^(\d{4})/.exec(c.course.course_date);
        if (!m || m[1] !== yearFilter) return false;
      }
      if (!q) return true;
      const hay = [
        c.course.name,
        c.course.course_id,
        c.credential_id,
        `${c.attendee_first} ${c.attendee_last}`,
        c.course.course_date,
        c.attendee_township || '',
        c.attendee_county || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [results, filter, courseFilter, yearFilter]);

  // Group the filtered results by course so a multi-course / multi-person
  // (shared email) result set is easy to scan. Courses newest-first; people
  // within a course alphabetical by name.
  const groupedByCourse = useMemo(() => {
    const map = new Map<string, { course: CertCard['course']; certs: CertCard[] }>();
    for (const c of filtered) {
      const g = map.get(c.course.course_id);
      if (g) g.certs.push(c);
      else map.set(c.course.course_id, { course: c.course, certs: [c] });
    }
    const groups = Array.from(map.values());
    groups.sort((a, b) => (b.course.course_date || '').localeCompare(a.course.course_date || ''));
    for (const g of groups) {
      g.certs.sort((a, b) =>
        `${a.attendee_last} ${a.attendee_first}`
          .toLowerCase()
          .localeCompare(`${b.attendee_last} ${b.attendee_first}`.toLowerCase())
      );
    }
    return groups;
  }, [filtered]);

  const filtersActive = courseFilter !== 'all' || yearFilter !== 'all' || filter.trim() !== '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailV = email.trim();
    const firstV = first.trim();
    const lastV = last.trim();
    let body: Record<string, string>;
    let label: string;
    if (mode === 'email') {
      if (!emailV) return;
      body = { email: emailV };
      label = emailV;
    } else {
      if (!firstV || !lastV) return;
      body = { first: firstV, last: lastV };
      label = `${firstV} ${lastV}`;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/certificates/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setResults(json.certificates || []);
      setSearchedLabel(label);
      setSubmitted(true);
      // Carry the pre-search filters into the post-results filters so the
      // attendee's selection is honored on the result list.
      setCourseFilter(preCourseFilter);
      setYearFilter(preYearFilter);
      setFilter('');
    } catch (e: any) {
      setError(e.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4"
      >
        {availableCourses.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Which training did you attend? <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              {availableYears.length > 1 && (
                <select
                  value={preYearFilter}
                  onChange={(e) => {
                    setPreYearFilter(e.target.value);
                    // If the currently-picked course no longer matches the
                    // new year, drop it.
                    if (preCourseFilter !== 'all' && e.target.value !== 'all') {
                      const stillVisible = availableCourses.some(
                        (c) => c.course_id === preCourseFilter && c.course_date.startsWith(e.target.value)
                      );
                      if (!stillVisible) setPreCourseFilter('all');
                    }
                  }}
                  className="px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-32"
                  aria-label="Filter by year"
                >
                  <option value="all">All years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={preCourseFilter}
                onChange={(e) => setPreCourseFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Filter by course"
              >
                <option value="all">All courses</option>
                {visibleCourses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Browse the available trainings above to confirm yours, then enter your email to look up your certificate.
            </p>
          </div>
        )}

        {/* Search by email or by first + last name. */}
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
              mode === 'email'
                ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Mail className="w-4 h-4" />
            Search by email
          </button>
          <button
            type="button"
            onClick={() => setMode('name')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
              mode === 'name'
                ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <User className="w-4 h-4" />
            Search by name
          </button>
        </div>

        {mode === 'email' ? (
          <div>
            <label htmlFor="lookup-email" className="block text-sm font-medium mb-1.5">
              Your email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="lookup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find certificates
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1.5">Your name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className="flex-1 px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                className="flex-1 px-3 py-2.5 text-base bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find certificates
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Enter the first and last name exactly as you registered for the training.
            </p>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {submitted && !loading && (
        <div className="mt-8">
          {results.length === 0 ? (
            <EmptyState label={searchedLabel} />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filtersActive && filtered.length !== results.length ? (
                    <>
                      Showing <strong>{filtered.length}</strong> of {results.length} certificate
                      {results.length === 1 ? '' : 's'} for <strong>{searchedLabel}</strong>.
                    </>
                  ) : (
                    <>
                      Showing {results.length} certificate{results.length === 1 ? '' : 's'} for{' '}
                      <strong>{searchedLabel}</strong>.
                    </>
                  )}
                </div>
              </div>
              {sharedEmailMessage(results) && (
                <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{sharedEmailMessage(results)}</div>
                </div>
              )}

              {/* Filters: show when there are enough results to be worth
                  narrowing down. Dropdowns appear only when there are at
                  least two distinct courses / years to choose from. */}
              {results.length > 3 && (
                <div className="mb-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 ml-1" />
                  {courseOptions.length > 1 && (
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label="Filter by course"
                    >
                      <option value="all">All courses</option>
                      {courseOptions.map((c) => (
                        <option key={c.course_id} value={c.course_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {yearOptions.length > 1 && (
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label="Filter by year"
                    >
                      <option value="all">All years</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="search"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search…"
                      className="w-full pl-3 pr-8 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {filter && (
                      <button
                        type="button"
                        onClick={() => setFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilter('');
                        setCourseFilter('all');
                        setYearFilter('all');
                      }}
                      className="text-xs text-amber-700 dark:text-amber-400 hover:underline px-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center text-sm text-gray-500">
                  No certificates match these filters. Try clearing them or adjusting your search.
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedByCourse.map((g) => (
                    <section key={g.course.course_id} className="space-y-4">
                      {/* Per-course heading — shown when results span more than
                          one course, so attendees can jump to the one they need. */}
                      {groupedByCourse.length > 1 && (
                        <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold truncate">{g.course.name}</h3>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                            {g.certs.length} cert{g.certs.length === 1 ? '' : 's'} · {formatDate(g.course.course_date)}
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        {g.certs.map((c) => (
                          <CertificateCard key={c.credential_id} cert={c} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
      <Award className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
      <div className="font-semibold mb-1">No certificates found</div>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        We couldn&apos;t find any active certificates for {label ? <strong>{label}</strong> : 'that search'}.
        If you believe this is an error, please contact the Indiana Township Association so they can verify your roster entry.
      </p>
    </div>
  );
}

function CertificateCard({ cert }: { cert: CertCard }) {
  const fullName = `${cert.attendee_first} ${cert.attendee_last}`.trim();
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/certificates/verify/${encodeURIComponent(cert.credential_id)}`
      : `/certificates/verify/${encodeURIComponent(cert.credential_id)}`;

  const onDownloaded = () => {
    // Fire-and-forget bump of last_downloaded_at; ignore failures.
    fetch(`/api/certificates/${encodeURIComponent(cert.credential_id)}/touch`, { method: 'POST' }).catch(() => {});
  };

  return (
    <article className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Recipient name as the prominent card heading — important when a
              shared email returns multiple certs for different people. */}
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1">
            <User className="w-3.5 h-3.5" />
            Issued to
          </div>
          <div className="text-xl sm:text-2xl font-bold leading-tight mb-3">{fullName}</div>

          <div className="text-xs text-gray-500 font-mono mb-1">{cert.course.course_id}</div>
          <h2 className="text-base sm:text-lg font-semibold leading-snug mb-2">{cert.course.name}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Pair icon={<Calendar className="w-4 h-4" />} label="Date">
              {formatDate(cert.course.course_date)}
            </Pair>
            <Pair icon={<GraduationCap className="w-4 h-4" />} label="Hours">
              {cert.course.hours.toFixed(1)} · {METHOD_LABEL[cert.course.method]}
            </Pair>
            {(cert.attendee_township || cert.attendee_county) && (
              <Pair icon={<MapPin className="w-4 h-4" />} label="Organization" wide>
                {[townshipLabel(cert.attendee_township), cert.attendee_county && `${cert.attendee_county} County`]
                  .filter(Boolean)
                  .join(', ')}
              </Pair>
            )}
          </dl>
          <div className="mt-3 text-xs text-gray-500 font-mono">
            Credential ID: {cert.credential_id}
          </div>
        </div>

        <div className="flex-shrink-0">
          <CertificateDownloadButton
            data={{
              recipient: {
                first: cert.attendee_first,
                last: cert.attendee_last,
                township: cert.attendee_township,
                county: cert.attendee_county,
              },
              course: cert.course,
              credential_id: cert.credential_id,
              signatures: cert.signatures,
              org_name: cert.course.org_name,
              logo_url: cert.course.logo_url,
            }}
            verifyUrl={verifyUrl}
            onDownloaded={onDownloaded}
          />
        </div>
      </div>
    </article>
  );
}

function sharedEmailMessage(results: CertCard[]): string | null {
  const names = new Set(
    results.map((r) => `${r.attendee_first.trim().toLowerCase()}|${r.attendee_last.trim().toLowerCase()}`)
  );
  if (names.size <= 1) return null;
  return `This email is shared by ${names.size} people. Each certificate below is issued to a different name — pick yours.`;
}

function Pair({
  icon,
  label,
  children,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`font-medium ${wide ? 'break-words' : 'truncate'}`}>{children}</span>
    </div>
  );
}
