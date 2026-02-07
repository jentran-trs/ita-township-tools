"use client";

import { useState } from 'react';
import { Lock, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function FinalizationBanner({ projectId, projectName, onFinalize }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFinalize = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}/finalize`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to finalize project');
      }

      if (onFinalize) {
        onFinalize(data);
      }
    } catch (err) {
      console.error('Error finalizing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-800">Finalize "{projectName}"?</h3>
            <p className="text-sm text-amber-700 mt-1">
              This will close the form and prevent any further submissions. Contributors with unsaved
              drafts will not be able to submit.
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Yes, Finalize
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="px-4 py-2 text-amber-700 hover:bg-amber-100 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800 text-sm">Ready to close submissions?</p>
            <p className="text-xs text-blue-600">
              As a member, you can finalize this project when all contributions are collected.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 text-sm whitespace-nowrap"
        >
          <Lock className="w-4 h-4" />
          Finalize Form
        </button>
      </div>
    </div>
  );
}
