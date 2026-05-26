import { Award, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { certFontsClassName } from '@/lib/certificates/fonts';
import { SBOA_UPLOAD_URL } from '@/lib/certificates/sboa';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CertificateLookupClient } from './CertificateLookupClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Find your training certificate · Indiana Township Association',
  description:
    'Look up your ITA training certificate by email. Download a PDF copy of any active certificate issued by the Indiana Township Association.',
};

export default async function CertificatesLookupPage() {
  const supabase = createServerSupabaseClient();
  const { data: courseRows } = await supabase
    .from('cert_courses')
    .select('id, course_id, name, course_date')
    .order('course_date', { ascending: false });
  const courses = (courseRows || []).map((c: any) => ({
    id: c.id,
    course_id: c.course_id,
    name: c.name,
    course_date: c.course_date,
  }));

  // QR code for the SBOA Election Official Certification of Training Courses
  // Upload Tool. Rendered as a data URL inline so attendees can scan it
  // straight from the page to submit their training completion proof.
  const sboaQrDataUrl = await QRCode.toDataURL(SBOA_UPLOAD_URL, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
    color: { dark: '#1B2E5B', light: '#FFFFFF' },
  }).catch(() => null);

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
            <ShieldCheck className="w-4 h-4" />
            Verify a credential ID
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="text-center mb-8">
          <Award className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Find your training certificate</h1>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Enter the email you used to register for an ITA training. We&apos;ll show every active
            certificate tied to that email so you can download a PDF copy.
          </p>
        </div>

        {/* SBOA disclosure — attendees are responsible for submitting proof
            of training completion via the State Board of Accounts upload
            tool. The QR points directly at that tool. */}
        <section className="mb-8 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-xl p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-3">
            Indiana State Board of Accounts certification
          </h2>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              <p>
                The Indiana Township Association certifies that all training courses are designed
                to meet applicable educational standards outlined in{' '}
                <span className="font-semibold">Indiana Code IC&nbsp;36-6-4-20</span>. Attendees are
                responsible for submitting proof of training completion through the{' '}
                <span className="font-semibold">
                  Indiana State Board of Accounts Election Official Certification of Training
                  Courses Upload Tool
                </span>{' '}
                accessible via the QR code.
              </p>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 break-all">
                Or open directly:{' '}
                <a
                  href={SBOA_UPLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium text-amber-800 dark:text-amber-300"
                >
                  gateway.ifionline.org/sboa_EOTC/
                </a>
              </p>
            </div>
            {sboaQrDataUrl && (
              <a
                href={SBOA_UPLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-white p-2 rounded-lg border border-amber-300 dark:border-amber-700 shadow-sm hover:shadow transition-shadow"
                aria-label="Open the SBOA upload tool"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sboaQrDataUrl}
                  alt="QR code to the Indiana State Board of Accounts upload tool"
                  width={120}
                  height={120}
                  style={{ display: 'block' }}
                />
              </a>
            )}
          </div>
        </section>

        <div className={certFontsClassName}>
          <CertificateLookupClient availableCourses={courses} />
        </div>
      </main>
    </div>
  );
}
