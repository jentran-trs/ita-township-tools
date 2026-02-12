"use client";

import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, X } from 'lucide-react';
import {
  buildExportPayload,
  downloadJsonFile,
  readJsonFile,
  validateImportPayload,
  mergeImportedData,
} from '../utils/formExportImport';

/**
 * Two small buttons — "Export Progress" and "Import Progress" — placed
 * between the tips section and the form card.
 *
 * Props:
 *  - formData        current form state
 *  - onImport(data)  callback with merged form data ready to setFormData
 *  - source          'asset-collection' | 'contribute'  (metadata tag)
 *  - hideImport      if true, only show the Export button
 */
export default function FormTransferBar({ formData, onImport, source = 'asset-collection', hideImport = false }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [confirmData, setConfirmData] = useState(null); // parsed payload awaiting user confirm

  const handleExport = () => {
    setError('');
    try {
      const payload = buildExportPayload(formData, source);
      downloadJsonFile(payload);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to export progress.');
    }
  };

  const handleFileSelect = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    try {
      const parsed = await readJsonFile(file);
      const validation = validateImportPayload(parsed);
      if (!validation.valid) {
        setError(validation.reason);
        return;
      }
      // Show confirmation modal
      setConfirmData(parsed);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to read file.');
    }
  };

  const handleConfirmImport = () => {
    const merged = mergeImportedData(confirmData.data);
    onImport(merged);
    setConfirmData(null);
  };

  const handleCancelImport = () => {
    setConfirmData(null);
  };

  return (
    <>
      {/* Button bar */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Progress
        </button>

        {!hideImport && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Progress
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="flex-shrink-0 text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">Import Form Progress</h3>

            <div className="space-y-2 text-sm text-slate-600 mb-4">
              {confirmData.organizationName && (
                <p><span className="font-medium text-slate-700">Organization:</span> {confirmData.organizationName}</p>
              )}
              {confirmData.reportName && (
                <p><span className="font-medium text-slate-700">Report:</span> {confirmData.reportName}</p>
              )}
              {confirmData.exportedAt && (
                <p><span className="font-medium text-slate-700">Exported:</span> {new Date(confirmData.exportedAt).toLocaleString()}</p>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-5">
              <p className="font-medium mb-1">This will replace your current form data.</p>
              <p>Images (logo, headshot, section photos) cannot be transferred and will need to be re-uploaded.</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelImport}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2d4a6f] transition-colors"
              >
                Import and Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
