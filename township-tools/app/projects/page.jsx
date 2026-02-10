"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization, useUser, useAuth } from '@clerk/nextjs';
import {
  Building2,
  Plus,
  FolderOpen,
  Calendar,
  FileText,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Link2,
  Check,
  Pencil,
  Send,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const { orgRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [userSubmissions, setUserSubmissions] = useState({});

  // Role checks - only 2 roles: admin and member
  // Check organization membership role from Clerk
  const membershipRole = membership?.role;
  const isAdmin = membershipRole === 'org:admin' || orgRole === 'org:admin';
  const isMember = !isAdmin;

  // Debug logging
  console.log('User role check:', { membershipRole, orgRole, isAdmin, isMember });

  const [newProject, setNewProject] = useState({
    name: '',
    organizationName: '',
    description: '',
    year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    fetchProjects();
  }, [organization]);

  // Fetch user's submissions to show "View Submission" button
  useEffect(() => {
    if (user && projects.length > 0) {
      fetchUserSubmissions();
    }
  }, [user, projects]);

  const fetchProjects = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/projects?orgId=${organization.id}`);
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects || []);
      } else {
        console.error('API error:', data);
        setError(data.error || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubmissions = async () => {
    if (!user) return;

    try {
      // API will use Clerk user ID from auth, fallback to email
      const email = user.primaryEmailAddress?.emailAddress || '';
      const response = await fetch(`/api/submissions/user?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        // Create a map of projectId -> submission
        const submissionMap = {};
        (data.submissions || []).forEach(sub => {
          submissionMap[sub.project_id] = sub;
        });
        setUserSubmissions(submissionMap);
      }
    } catch (err) {
      console.error('Error fetching user submissions:', err);
    }
  };

  const createProject = async () => {
    if (!newProject.name || !newProject.organizationName) return;

    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          orgId: organization.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setProjects([data.project, ...projects]);
        setShowCreateModal(false);
        setNewProject({
          name: '',
          organizationName: '',
          description: '',
          year: new Date().getFullYear().toString(),
        });
      } else {
        setError(data.error || 'Failed to create project');
        console.error('API error:', data);
      }
    } catch (err) {
      setError('Network error - please try again');
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
    }
  };

  const copyFormLink = (e, shareId) => {
    e.stopPropagation();
    const url = `${window.location.origin}/contribute/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not started': return 'bg-slate-100 text-slate-600';
      case 'collecting_assets': return 'bg-blue-100 text-blue-700';
      case 'designing': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'collecting_assets': return 'Collecting Assets';
      case 'designing': return 'Designing';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Please select an organization</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-amber-500" />
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {isMember ? 'Submit Assets' : 'Report Projects'}
                  </h1>
                  <p className="text-sm text-slate-400">{organization.name}</p>
                </div>
              </div>
            </div>

            {/* Only admin can create projects */}
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && !showCreateModal && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">
              {isAdmin
                ? 'Create a project to start collecting assets for a report'
                : 'No projects available. Contact an admin to create a project.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => {
              const userSubmission = userSubmissions[project.id];
              const canEditSubmission = project.derived_status === 'collecting_assets' || project.derived_status === 'collecting';

              return (
                <div
                  key={project.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.derived_status)}`}>
                          {project.derived_status === 'designing' || project.derived_status === 'completed' ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                          {getStatusLabel(project.derived_status)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{project.organization_name}</p>
                      {project.description && isAdmin && (
                        <p className="text-slate-500 text-sm mb-3">{project.description}</p>
                      )}
                      {/* Show stats to admin only */}
                      {isAdmin && (
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          {project.year && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {project.year}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {project.submission_count || 0} submissions
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Member buttons */}
                      {isMember && (
                        <>
                          {/* If user has submitted, show View Submission button */}
                          {userSubmission && (
                            <button
                              onClick={() => router.push(`/submissions/${userSubmission.id}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View Submission
                            </button>
                          )}
                          {canEditSubmission ? (
                            <>
                              {userSubmission ? (
                                <button
                                  onClick={() => router.push(`/contribute/${project.share_id}?edit=${userSubmission.id}`)}
                                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors text-sm font-medium"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit Submission
                                </button>
                              ) : (
                                <button
                                  onClick={() => router.push(`/contribute/${project.share_id}`)}
                                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors text-sm font-medium"
                                >
                                  <Send className="w-4 h-4" />
                                  Submit Assets
                                </button>
                              )}
                              <button
                                onClick={(e) => copyFormLink(e, project.share_id)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
                              >
                                {copiedId === project.share_id ? (
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
                            </>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 rounded-lg text-sm">
                              <Lock className="w-4 h-4" />
                              Submissions locked for designing
                            </div>
                          )}
                        </>
                      )}

                      {/* Admin buttons */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => copyFormLink(e, project.share_id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
                          >
                            {copiedId === project.share_id ? (
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
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                          >
                            View Project
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Modal - Only for admin */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">Create New Project</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., 2025 Annual Report"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Client/Township Name *
                </label>
                <input
                  type="text"
                  value={newProject.organizationName}
                  onChange={(e) => setNewProject({ ...newProject, organizationName: e.target.value })}
                  placeholder="e.g., Vernon Township"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Year
                </label>
                <input
                  type="text"
                  value={newProject.year}
                  onChange={(e) => setNewProject({ ...newProject, year: e.target.value })}
                  placeholder="e.g., 2025"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Any notes about this project..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setError(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={creating || !newProject.name || !newProject.organizationName}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
