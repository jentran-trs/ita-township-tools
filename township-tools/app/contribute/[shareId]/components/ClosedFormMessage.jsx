"use client";

import { Lock, Calendar, User, FileText } from 'lucide-react';

export default function ClosedFormMessage({ project, submissionCount }) {
  const finalizedDate = project.finalized_at
    ? new Date(project.finalized_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-slate-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Form Closed
        </h1>

        <p className="text-slate-600 mb-6">
          The contribution form for <strong>{project.name}</strong> has been finalized
          and is no longer accepting submissions.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-left mb-6">
          <div className="flex items-center gap-3 text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">Project:</span>
            <span className="font-medium text-slate-800">{project.name}</span>
          </div>

          {project.organization_name && (
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Organization:</span>
              <span className="font-medium text-slate-800">{project.organization_name}</span>
            </div>
          )}

          {finalizedDate && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Closed on:</span>
              <span className="font-medium text-slate-800">{finalizedDate}</span>
            </div>
          )}

          {submissionCount !== undefined && submissionCount > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Total submissions:</span>
              <span className="font-medium text-slate-800">{submissionCount}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          If you believe this is an error, please contact the project administrator.
        </p>
      </div>
    </div>
  );
}
