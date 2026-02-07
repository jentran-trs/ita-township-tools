"use client";

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Building2, Upload, CheckCircle, Image, FileText, User, Loader2, X, Plus } from 'lucide-react';

const CATEGORIES = [
  { id: 'logo', label: 'Logo', description: 'Township logo/seal', icon: Building2 },
  { id: 'staff', label: 'Staff Photos', description: 'Photos of trustees, staff, officials', icon: User },
  { id: 'projects', label: 'Project Photos', description: 'Community projects, events, facilities', icon: Image },
  { id: 'documents', label: 'Documents', description: 'PDFs, reports, charts', icon: FileText },
  { id: 'general', label: 'Other', description: 'Any other assets', icon: Plus },
];

export default function SubmitAssetsPage() {
  const params = useParams();
  const orgId = params.orgId;

  const [orgName, setOrgName] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles.map(file => ({
      file,
      description: '',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))]);
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileDescription = (index, description) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], description };
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (!orgName.trim()) {
      setError('Please enter your township/organization name');
      return;
    }
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setError('');
    setUploading(true);

    const results = [];
    for (const fileData of files) {
      try {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('orgId', orgId);
        formData.append('orgName', orgName);
        formData.append('category', selectedCategory);
        formData.append('description', fileData.description);
        formData.append('uploadedBy', uploaderName || 'anonymous');

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          results.push({ success: true, fileName: fileData.file.name, asset: data.asset });
        } else {
          results.push({ success: false, fileName: fileData.file.name, error: data.error });
        }
      } catch (err) {
        results.push({ success: false, fileName: fileData.file.name, error: err.message });
      }
    }

    setUploadedAssets(prev => [...prev, ...results.filter(r => r.success)]);
    setFiles([]);
    setUploading(false);

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      setError(`Failed to upload ${failed.length} file(s): ${failed.map(f => f.fileName).join(', ')}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-amber-500" />
          <span className="text-xl font-bold text-white">Township Tools</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Submit Report Assets</h1>
          <p className="text-slate-400">
            Upload your logos, photos, and documents for your annual report
          </p>
        </div>

        {/* Organization Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Organization Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Township/Organization Name *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Vernon Township"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name (optional)
              </label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Asset Category</h2>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    selectedCategory === cat.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${selectedCategory === cat.id ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div className="font-medium text-white text-sm">{cat.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{cat.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Upload Files</h2>

          {/* Drop Zone */}
          <label className="block border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors mb-4">
            <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 mb-1">Click to select files or drag and drop</p>
            <p className="text-sm text-slate-500">PNG, JPG, PDF up to 10MB each</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              {files.map((fileData, index) => (
                <div key={index} className="flex items-start gap-4 bg-slate-700/50 rounded-lg p-4">
                  {fileData.preview ? (
                    <img src={fileData.preview} alt="" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{fileData.file.name}</p>
                    <p className="text-sm text-slate-400">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                    <input
                      type="text"
                      value={fileData.description}
                      onChange={(e) => updateFileDescription(index, e.target.value)}
                      placeholder="Add description (optional)"
                      className="mt-2 w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-slate-600 rounded"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full py-4 bg-amber-500 text-slate-900 rounded-xl font-bold text-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
            </>
          )}
        </button>

        {/* Uploaded Assets */}
        {uploadedAssets.length > 0 && (
          <div className="mt-8 bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-lg font-semibold text-white">Successfully Uploaded</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedAssets.map((item, index) => (
                <div key={index} className="bg-slate-800 rounded-lg p-3">
                  {item.asset?.url && item.asset?.file_type?.startsWith('image/') ? (
                    <img src={item.asset.url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full h-24 bg-slate-700 rounded mb-2 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <p className="text-sm text-white truncate">{item.fileName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Your files will be securely stored and used in your annual report.</p>
          <p className="mt-1">Questions? Contact your report administrator.</p>
        </div>
      </main>
    </div>
  );
}
