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
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    const uploadPromises = files.map(async (fileData) => {
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('orgId', orgId);
      formData.append('orgName', orgName);
      formData.append('uploaderName', uploaderName);
      formData.append('category', selectedCategory);
      formData.append('description', fileData.description);

      try {
        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        return { success: true, fileName: fileData.file.name, asset: await response.json() };
      } catch (err) {
        return { success: false, fileName: fileData.file.name, error: err.message };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    setUploadedAssets(prev => [...prev, ...successful]);

    files.forEach(fileData => {
      if (fileData.preview) URL.revokeObjectURL(fileData.preview);
    });
    setFiles([]);
    setUploading(false);

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      setError(`Failed to upload ${failed.length} file(s): ${failed.map(f => f.fileName).join(', ')}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          <span className="text-xl font-bold">Township Tools</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Report Assets</h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            Upload your logos, photos, and documents for your annual report
          </p>
        </div>

        {/* Organization Info */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Organization Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Township/Organization Name *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Vernon Township"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name (optional)
              </label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Asset Category</h2>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    selectedCategory === cat.id
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${selectedCategory === cat.id ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <div className="font-medium text-sm">{cat.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{cat.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload Files</h2>

          {/* Drop Zone */}
          <label className="block border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 transition-colors mb-4">
            <Upload className="w-10 h-10 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-base text-gray-700 dark:text-gray-300 mb-1">Click to select files or drag and drop</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG, PDF up to 10MB each</p>
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
                <div key={index} className="flex items-start gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  {fileData.preview ? (
                    <img src={fileData.preview} alt="" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{fileData.file.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                    <input
                      type="text"
                      value={fileData.description}
                      onChange={(e) => updateFileDescription(index, e.target.value)}
                      placeholder="Add description (optional)"
                      className="mt-2 w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
          <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold">Successfully Uploaded</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedAssets.map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-3">
                  {item.asset?.url && item.asset?.file_type?.startsWith('image/') ? (
                    <img src={item.asset.url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                  <p className="text-sm truncate">{item.fileName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>Your files will be securely stored and used in your annual report.</p>
          <p className="mt-1">Questions? Contact your report administrator.</p>
        </div>
      </main>
    </div>
  );
}
