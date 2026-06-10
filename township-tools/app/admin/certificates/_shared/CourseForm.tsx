"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { SignatureUpload } from '@/components/certificates/SignatureUpload';
import { suggestCourseId } from '@/lib/certificates/course-id';

type Signature = {
  signer_name: string;
  signer_title: string;
  signature_image_url: string;
  signer_organization?: string | null;
  display_order?: number;
};

export type CourseFormInitial = {
  id?: string;
  course_id: string;
  name: string;
  hours: string;
  method: 'in_person' | 'online' | 'hybrid';
  course_date: string;
  syllabus: string;
  syllabus_file_url: string | null;
  syllabus_file_name: string | null;
  org_name: string;
  logo_url: string;
  signatures: Signature[];
};

type Props = {
  mode: 'create' | 'edit';
  initial: CourseFormInitial;
  existingCourseIds: string[];
  defaultSignature: Signature | null;
  attendeeCount?: number;
};

const DEFAULT_LOGO = '/certificates/ita-logo.png';

export function CourseForm({ mode, initial, existingCourseIds, defaultSignature, attendeeCount }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CourseFormInitial>(() => ({
    ...initial,
    // Cap at exactly one signer. Legacy courses with two are trimmed.
    signatures: initial.signatures.slice(0, 1),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [courseIdEdited, setCourseIdEdited] = useState(mode === 'edit');
  const errorRef = useRef<HTMLDivElement>(null);

  // Whenever an error appears, bring it into view so superadmins clicking
  // Save from the bottom of a long form don't miss it.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Re-suggest course_id when the course_date changes (only if user hasn't manually edited)
  useEffect(() => {
    if (courseIdEdited || mode === 'edit') return;
    if (!form.course_date) return;
    const suggested = suggestCourseId(form.course_date, existingCourseIds);
    setForm((f) => ({ ...f, course_id: suggested }));
  }, [form.course_date, courseIdEdited, existingCourseIds, mode]);

  // Pre-fill the first signer from default signature on initial mount (only if empty)
  useEffect(() => {
    if (mode !== 'create') return;
    if (!defaultSignature) return;
    setForm((f) => {
      const sigs = f.signatures.length === 0 || (!f.signatures[0].signer_name && !f.signatures[0].signature_image_url)
        ? [{ ...defaultSignature, display_order: 0 }]
        : f.signatures;
      return { ...f, signatures: sigs };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestedCourseId = useMemo(() => {
    if (!form.course_date) return '';
    return suggestCourseId(form.course_date, existingCourseIds);
  }, [form.course_date, existingCourseIds]);

  const onSuggestCourseId = () => {
    if (!suggestedCourseId) return;
    setForm((f) => ({ ...f, course_id: suggestedCourseId }));
    setCourseIdEdited(false);
  };

  const onChangeSignature = (idx: number, patch: Partial<Signature>) => {
    setForm((f) => {
      const next = [...f.signatures];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, signatures: next };
    });
  };

  const validate = (): string | null => {
    if (!form.course_id.trim()) return 'Course ID is required';
    if (!form.name.trim()) return 'Course name is required';
    const hours = parseFloat(form.hours);
    if (!Number.isFinite(hours) || hours < 0) return 'Hours must be a non-negative number';
    if (!form.course_date) return 'Course date is required';
    if (!form.syllabus_file_url) return 'Upload a course syllabus (PDF or Word document)';
    if (form.signatures.length !== 1) return 'A course must have exactly one signer';
    const s = form.signatures[0];
    if (!s.signer_name.trim()) return 'Signer name is required';
    if (!s.signer_title.trim()) return 'Signer title is required';
    if (!s.signature_image_url.trim()) return 'Signer signature image is required';
    return null;
  };

  const onSubmit = async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        course_id: form.course_id.trim(),
        name: form.name.trim(),
        hours: parseFloat(form.hours),
        method: form.method,
        course_date: form.course_date,
        // Free-text syllabus is retired in favor of file uploads only.
        syllabus: null,
        syllabus_file_url: form.syllabus_file_url || null,
        syllabus_file_name: form.syllabus_file_name || null,
        org_name: form.org_name.trim() || 'Indiana Township Association',
        logo_url: form.logo_url.trim() || DEFAULT_LOGO,
        signatures: form.signatures.map((s, i) => ({
          signer_name: s.signer_name.trim(),
          signer_title: s.signer_title.trim(),
          signer_organization: s.signer_organization?.trim() || null,
          signature_image_url: s.signature_image_url.trim(),
          display_order: i,
        })),
      };
      const url =
        mode === 'create'
          ? '/api/admin/certificates/courses'
          : `/api/admin/certificates/courses/${initial.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      if (mode === 'create') {
        router.push(`/admin/certificates/${json.course.id}`);
      } else {
        router.refresh();
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!initial.id) return;
    const message =
      attendeeCount && attendeeCount > 0
        ? `Delete this course AND its ${attendeeCount} issued certificate${attendeeCount === 1 ? '' : 's'}?\n\nThis is permanent. Attendees will no longer be able to download these certificates, and the credential IDs will no longer verify.`
        : 'Delete this course? This is permanent.';
    if (!confirm(message)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/certificates/courses/${initial.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      router.push('/admin/certificates');
    } catch (e: any) {
      setError(e.message || 'Delete failed');
      setDeleting(false);
    }
  };

  const editCaption = useMemo(() => {
    if (mode !== 'edit') return null;
    if (!attendeeCount) return 'Edits apply to all certificates issued by this course the next time an attendee downloads.';
    return `Edits apply to all ${attendeeCount} certificate${attendeeCount === 1 ? '' : 's'} issued by this course the next time an attendee downloads.`;
  }, [mode, attendeeCount]);

  return (
    <div className="space-y-6">
      {mode === 'edit' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting…' : 'Delete Course'}
          </button>
        </div>
      )}

      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm rounded-lg px-4 py-3 scroll-mt-24"
        >
          {error}
        </div>
      )}

      {savedFlash && (
        <div
          role="status"
          className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm rounded-lg px-4 py-3 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Changes saved.</span>
        </div>
      )}

      {editCaption && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-4 py-2">
          {editCaption}
        </div>
      )}

      <div className="space-y-5">
        <SubSection index={1} title="Course details">
          <Field label="Course date" required>
            <input
              type="date"
              value={form.course_date}
              onChange={(e) => setForm((f) => ({ ...f, course_date: e.target.value }))}
              className={inputCls}
            />
          </Field>

          <Field
            label="Course ID"
            required
            hint={
              suggestedCourseId
                ? form.course_id === suggestedCourseId
                  ? `Using the next available ID for ${form.course_date.slice(0, 4)}. Override for legal / external courses.`
                  : `Next available: ${suggestedCourseId}. Override for legal / external courses.`
                : 'Free-text. Override the suggestion for legal / external courses.'
            }
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={form.course_id}
                onChange={(e) => {
                  setForm((f) => ({ ...f, course_id: e.target.value }));
                  setCourseIdEdited(true);
                }}
                className={`${inputCls} font-mono`}
                placeholder="ITA-2026_100"
              />
              <button
                type="button"
                onClick={onSuggestCourseId}
                disabled={!suggestedCourseId || form.course_id === suggestedCourseId}
                className="px-2.5 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  suggestedCourseId
                    ? form.course_id === suggestedCourseId
                      ? `Already showing the suggestion (${suggestedCourseId})`
                      : `Use ${suggestedCourseId}`
                    : 'Pick a course date first'
                }
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Use suggested
              </button>
            </div>
          </Field>

          <Field label="Course name" required className="sm:col-span-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="2026 Township Assistance Training"
            />
          </Field>
        </SubSection>

        <SubSection index={2} title="Course format">
          <Field label="Training hours" required hint="Decimal, rendered as e.g. 5.0">
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              className={inputCls}
              placeholder="5.0"
            />
          </Field>

          <Field label="Format" required>
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as any }))}
              className={inputCls}
            >
              <option value="in_person">In-Person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
        </SubSection>

        <SubSection index={3} title="Course syllabus">
          <Field
            label="Course Syllabus"
            required
            hint="PDF or Word document. Shown on the public verify page linked by the certificate's QR code."
            className="sm:col-span-2"
          >
            <SyllabusFileUpload
              url={form.syllabus_file_url}
              name={form.syllabus_file_name}
              onChange={(url, name) =>
                setForm((f) => ({ ...f, syllabus_file_url: url, syllabus_file_name: name }))
              }
            />
          </Field>
        </SubSection>

        <SubSection index={4} title="Certificate branding">
          <Field label="Organization name" hint="The issuing authority. Appears in the ribbon header (e.g. 'Authorized by the Indiana Township Association'). Each signer can also have their own organization further down — leave the per-signer field blank to use this one.">
            <input
              type="text"
              value={form.org_name}
              onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))}
              className={inputCls}
            />
          </Field>

          <Field
            label="Logo"
            className="sm:col-span-2"
            hint={
              form.logo_url === DEFAULT_LOGO
                ? 'Default ITA logo is preloaded. Upload to override.'
                : 'Custom logo uploaded for this course.'
            }
          >
            <SignatureUpload
              kind="logo"
              value={form.logo_url || null}
              onChange={(url) => setForm((f) => ({ ...f, logo_url: url || DEFAULT_LOGO }))}
              helperText={
                form.logo_url === DEFAULT_LOGO
                  ? 'Using the default ITA logo. Replace to override; Remove to reset.'
                  : 'Custom logo. Replace to swap; Remove to use the default ITA logo.'
              }
            />
          </Field>
        </SubSection>

        <SubSection index={5} title="Certificate signer">
          {form.signatures[0] && (
            <>
              <Field label="Name" required>
                <input
                  type="text"
                  value={form.signatures[0].signer_name}
                  onChange={(e) => onChangeSignature(0, { signer_name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Title" required>
                <input
                  type="text"
                  value={form.signatures[0].signer_title}
                  onChange={(e) => onChangeSignature(0, { signer_title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Organization"
                hint="Optional. Leave blank if this signer represents the issuing organization (shown in the ribbon). Use this when a signer represents a different organization."
                className="sm:col-span-2"
              >
                <input
                  type="text"
                  value={form.signatures[0].signer_organization || ''}
                  onChange={(e) => onChangeSignature(0, { signer_organization: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. State of Indiana Department of Education"
                />
              </Field>
              <Field label="Signature image (PNG)" required className="sm:col-span-2">
                <SignatureUpload
                  kind="signature"
                  value={form.signatures[0].signature_image_url || null}
                  onChange={(url) => onChangeSignature(0, { signature_image_url: url || '' })}
                />
              </Field>
            </>
          )}
        </SubSection>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${
              savedFlash
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedFlash ? (
              <Check className="w-4 h-4" />
            ) : null}
            {savedFlash
              ? 'Saved'
              : mode === 'create'
              ? 'Create course'
              : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400';

function Section({
  title,
  description,
  actions,
  accent = 'indigo',
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  accent?: 'indigo' | 'amber';
  children: React.ReactNode;
}) {
  const accentClasses = {
    indigo: {
      border: 'border-l-4 border-l-indigo-500 dark:border-l-indigo-400',
      title: 'text-indigo-700 dark:text-indigo-300',
      header: 'bg-indigo-50/60 dark:bg-indigo-950/30',
    },
    amber: {
      border: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
      title: 'text-amber-700 dark:text-amber-300',
      header: 'bg-amber-50/60 dark:bg-amber-950/30',
    },
  }[accent];

  return (
    <section
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm ${accentClasses.border}`}
    >
      <div
        className={`flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-800 ${accentClasses.header}`}
      >
        <div>
          <h2 className={`text-lg font-bold ${accentClasses.title}`}>{title}</h2>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SubSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-900/60 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100/70 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-900/60">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
          {index}
        </span>
        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{title}</h4>
      </div>
      <div className="p-4 bg-white dark:bg-gray-900/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function SyllabusFileUpload({
  url,
  name,
  onChange,
}: {
  url: string | null;
  name: string | null;
  onChange: (url: string | null, name: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('kind', 'syllabus');
      if (url) fd.set('oldUrl', url);
      const res = await fetch('/api/admin/certificates/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange(json.url, file.name);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Upload a syllabus file (PDF / Word)
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {url ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm flex-1 min-w-0">
            <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate flex-1 hover:underline"
              title={name || url}
            >
              {name || 'Attached file'}
            </a>
            <button
              type="button"
              onClick={() => onChange(null, null)}
              disabled={uploading}
              className="text-red-600 hover:text-red-700 px-1 py-0.5"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500 flex-1">No file attached.</div>
        )}
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Uploading' : url ? 'Replace file' : 'Attach file'}
        </button>
      </div>
      <div className="mt-1.5 text-xs text-gray-500">
        PDF, .docx, or .doc. Max 10 MB.
      </div>
      {error && <div className="mt-1.5 text-xs text-red-600">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
