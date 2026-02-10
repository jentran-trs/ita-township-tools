"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useOrganization, useAuth } from '@clerk/nextjs';
import {
  Building2,
  ArrowLeft,
  FileText,
  Image,
  User,
  Calendar,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Link2,
  Copy,
  Check,
  Eye,
  Edit3,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';

function SubmissionCard({ submission, isExpanded, onToggle, onDelete, isDeleting }) {
  const sections = submission.report_sections || [];
  const totalImages = sections.reduce((acc, s) => acc + (s.image_urls?.length || 0), 0) +
    (submission.letter_headshot_url ? 1 : 0) +
    (submission.letter_image1_url ? 1 : 0) +
    (submission.letter_image2_url ? 1 : 0) +
    (submission.logo_url ? 1 : 0);
  const totalStats = sections.reduce((acc, s) => acc + (s.report_section_stats?.length || 0), 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    await onDelete(submission.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-slate-700/50 rounded-xl overflow-hidden">
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-white">{submission.submitter_name}</p>
              <p className="text-sm text-slate-400">{submission.submitter_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-slate-400">
              <p>{new Date(submission.created_at).toLocaleDateString()}</p>
              <p>{totalImages} images, {sections.length} sections</p>
            </div>
            <Link
              href={`/submissions/${submission.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </Link>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete submission"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Delete Confirmation Inline */}
        {showDeleteConfirm && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <p className="text-sm text-red-300 mb-2">
              Delete this submission from <strong>{submission.submitter_name}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded font-medium hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="px-3 py-1 text-slate-300 text-sm hover:bg-slate-600 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-slate-600 p-4 space-y-4">
          {/* Cover Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Organization</p>
              <p className="text-white">{submission.organization_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Report Name</p>
              <p className="text-white">{submission.report_name}</p>
            </div>
          </div>

          {/* Logo */}
          {submission.logo_url && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Logo</p>
              <img src={submission.logo_url} alt="Logo" className="h-16 object-contain bg-white rounded p-2" />
            </div>
          )}

          {/* Opening Letter */}
          {submission.include_opening_letter && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Opening Letter</p>
              <p className="font-medium text-white">{submission.letter_title}</p>
              {submission.letter_subtitle && (
                <p className="text-sm text-slate-400">{submission.letter_subtitle}</p>
              )}
              {submission.letter_content && (
                <p className="text-sm text-slate-300 mt-2 line-clamp-3">{submission.letter_content}</p>
              )}
              <div className="flex gap-2 mt-3">
                {submission.letter_headshot_url && (
                  <img src={submission.letter_headshot_url} alt="Headshot" className="w-12 h-12 object-cover rounded" />
                )}
                {submission.letter_image1_url && (
                  <img src={submission.letter_image1_url} alt="Image 1" className="w-12 h-12 object-cover rounded" />
                )}
                {submission.letter_image2_url && (
                  <img src={submission.letter_image2_url} alt="Image 2" className="w-12 h-12 object-cover rounded" />
                )}
              </div>
            </div>
          )}

          {/* Sections */}
          {sections.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-2">Content Sections</p>
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={section.id} className="bg-slate-800 rounded-lg p-3">
                    <p className="font-medium text-white">{section.title}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>{section.image_urls?.length || 0} images</span>
                      <span>{section.report_section_stats?.length || 0} stats</span>
                      {section.chart_link && <span>Has chart</span>}
                    </div>
                    {section.image_urls?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {section.image_urls.slice(0, 4).map((url, imgIdx) => (
                          <img key={imgIdx} src={url} alt="" className="w-10 h-10 object-cover rounded" />
                        ))}
                        {section.image_urls.length > 4 && (
                          <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-xs text-slate-400">
                            +{section.image_urls.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Contact</p>
              <p className="text-slate-300">{submission.email}</p>
              <p className="text-slate-300">{submission.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Address</p>
              <p className="text-slate-300">{submission.street_address}</p>
              <p className="text-slate-300">{submission.city_state_zip}</p>
            </div>
          </div>

          {submission.additional_notes && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-300">{submission.additional_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingSubmissionId, setDeletingSubmissionId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Role checks - using organization membership
  const isAdmin = membership?.role === 'org:admin' || orgRole === 'org:admin';
  const isMember = !isAdmin;

  useEffect(() => {
    fetchProject();
    fetchDraft();
  }, [params.id]);

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/drafts`);
      if (response.ok) {
        const data = await response.json();
        setSavedDraft(data.draft);
      }
    } catch (error) {
      console.error('Error fetching draft:', error);
    }
  };

  // Redirect members away - they shouldn't access this page
  useEffect(() => {
    if (!loading && isMember) {
      router.push('/projects');
    }
  }, [loading, isMember, router]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/generate-report?orgId=${project.org_id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Store report data in sessionStorage and redirect to report builder
        sessionStorage.setItem('generatedReport', JSON.stringify(data.reportData));
        sessionStorage.setItem('generatedReportProject', JSON.stringify({
          id: project.id,
          name: project.name,
          organizationName: project.organization_name,
        }));
        router.push('/tools/report-builder?from=project');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const loadSavedDraft = () => {
    if (!savedDraft) return;
    setLoadingDraft(true);
    // Store the draft data in sessionStorage and redirect to report builder
    sessionStorage.setItem('generatedReport', JSON.stringify(savedDraft.data));
    sessionStorage.setItem('generatedReportProject', JSON.stringify({
      id: project.id,
      name: project.name,
      organizationName: project.organization_name,
    }));
    router.push('/tools/report-builder?from=project');
  };

  const copyFormLink = () => {
    const url = `${window.location.origin}/contribute/${project.share_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateProjectStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const isLocking = newStatus === 'designing';
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          allow_public_submissions: !isLocking,
          orgId: project.org_id,
        }),
      });

      if (response.ok) {
        setProject({ ...project, status: newStatus, derived_status: newStatus, allow_public_submissions: !isLocking });
      } else {
        const data = await response.json();
        console.error('Failed to update project status:', data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/projects');
      } else {
        const data = await response.json();
        setDeleteError(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    setDeletingSubmissionId(submissionId);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the submission from the list
        setSubmissions(submissions.filter(s => s.id !== submissionId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete submission');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Network error. Please try again.');
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'collecting_assets': return 'bg-blue-100 text-blue-700';
      case 'designing': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'collecting_assets': return 'Collecting Assets';
      case 'collecting': return 'Collecting Assets';
      case 'designing': return 'Designing';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Members should not see this page
  if (isMember) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Redirecting...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Project not found</p>
      </div>
    );
  }

  const totalImages = submissions.reduce((acc, s) => {
    const sectionImages = s.report_sections?.reduce((a, sec) => a + (sec.image_urls?.length || 0), 0) || 0;
    return acc + sectionImages +
      (s.logo_url ? 1 : 0) +
      (s.letter_headshot_url ? 1 : 0) +
      (s.letter_image1_url ? 1 : 0) +
      (s.letter_image2_url ? 1 : 0);
  }, 0);

  const totalSections = submissions.reduce((acc, s) => acc + (s.report_sections?.length || 0), 0);

  const currentStatus = project.derived_status || project.status || 'collecting_assets';
  const isCollecting = currentStatus === 'collecting_assets' || currentStatus === 'collecting';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                  {getStatusLabel(currentStatus)}
                </span>
              </div>
              <p className="text-sm text-slate-400">{project.organization_name}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{submissions.length}</p>
              <p className="text-xs text-slate-400">Submissions</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{totalImages}</p>
              <p className="text-xs text-slate-400">Images</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{totalSections}</p>
              <p className="text-xs text-slate-400">Sections</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {/* Status Toggle - Lock/Unlock submissions */}
            <button
              onClick={() => updateProjectStatus(isCollecting ? 'designing' : 'collecting_assets')}
              disabled={updatingStatus}
              className="flex items-center gap-2 text-sm text-slate-300 disabled:opacity-50"
              title={isCollecting ? 'Lock submissions and start designing' : 'Unlock submissions for editing'}
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : isCollecting ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span className="text-xs text-slate-400 mr-1">{isCollecting ? 'Unlocked' : 'Locked'}</span>
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${isCollecting ? 'bg-slate-600' : 'bg-purple-600'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isCollecting ? 'left-0.5' : 'left-[22px]'}`}
                />
              </div>
            </button>

            {/* Continue Editing - shown when a saved draft exists */}
            {savedDraft && (
              <button
                onClick={loadSavedDraft}
                disabled={loadingDraft}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 transition-colors"
              >
                {loadingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit3 className="w-4 h-4" />
                )}
                Continue Editing
              </button>
            )}

            <button
              onClick={copyFormLink}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copy Form Link
                </>
              )}
            </button>

            <button
              onClick={generateReport}
              disabled={generating || submissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg font-medium hover:bg-red-600/30 border border-red-600/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Delete Project?</h3>
                <p className="text-slate-300 text-sm mb-2">
                  This will permanently delete <strong>"{project.name}"</strong> and all associated data:
                </p>
                <ul className="text-slate-400 text-sm mb-4 list-disc list-inside space-y-1">
                  <li>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</li>
                  <li>{totalImages} uploaded image{totalImages !== 1 ? 's' : ''}</li>
                  <li>All sections, stats, and drafts</li>
                </ul>
                <p className="text-red-400 text-xs font-medium mb-6">
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded">{deleteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? 'Deleting...' : 'Delete Forever'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                    disabled={deleting}
                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No submissions yet</h2>
            <p className="text-slate-400 mb-6">
              Waiting for contributors to submit their assets
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">
              Submissions ({submissions.length})
            </h2>
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                isExpanded={expandedSubmission === submission.id}
                onToggle={() => setExpandedSubmission(
                  expandedSubmission === submission.id ? null : submission.id
                )}
                onDelete={handleDeleteSubmission}
                isDeleting={deletingSubmissionId === submission.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
