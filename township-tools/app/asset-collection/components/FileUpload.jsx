"use client";

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';

export default function FileUpload({
  label,
  accept = "image/*",
  maxSize = 10, // MB
  required = false,
  multiple = false,
  value,
  onChange,
  helpText,
  maxFiles = 6,
  compact = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const files = multiple ? (value || []) : (value ? [value] : []);

  const validateFile = (file) => {
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File "${file.name}" exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const handleFiles = async (fileList) => {
    setError('');
    const newFiles = Array.from(fileList);

    // Validate each file
    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check max files for multiple
    if (multiple && files.length + newFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    // Create preview URLs and file objects
    const processedFiles = newFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    if (multiple) {
      onChange([...files, ...processedFiles]);
    } else {
      // Clean up old preview
      if (files[0]?.preview) {
        URL.revokeObjectURL(files[0].preview);
      }
      onChange(processedFiles[0]);
    }

    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index) => {
    if (multiple) {
      const newFiles = [...files];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      onChange(newFiles);
    } else {
      if (files[0]?.preview) {
        URL.revokeObjectURL(files[0].preview);
      }
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Drop zone */}
      {compact ? (
        // Compact mode for individual image uploads
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${error ? 'border-red-300 bg-red-50' : ''}
            ${files.length > 0 ? 'p-2' : 'p-4'}
          `}
        >
          {uploading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : files.length > 0 ? (
            <div className="flex items-center gap-3">
              {files[0].preview ? (
                <img src={files[0].preview} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                  <Image className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{files[0].name}</p>
                <p className="text-xs text-slate-400">{(files[0].size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(0);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Upload className="w-5 h-5" />
              <span className="text-sm">Click or drop image</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      ) : (
        // Standard mode
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              <p className="mt-2 text-sm text-slate-500">Processing...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="mt-2 text-sm text-slate-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {accept.includes('image') ? 'PNG, JPG' : 'PDF, PNG, JPG'} up to {maxSize}MB
                {multiple && ` (max ${maxFiles} files)`}
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {helpText && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {files.length > 0 && (
        <p className="text-xs text-red-500">Image is only saved when you submit this form.</p>
      )}

      {/* File previews (not shown in compact mode) */}
      {!compact && files.length > 0 && (
        <div className={`grid gap-3 mt-3 ${multiple ? 'grid-cols-2 sm:grid-cols-3' : ''}`}>
          {files.map((fileData, index) => (
            <div
              key={index}
              className="relative bg-slate-50 rounded-lg p-2 flex items-center gap-3 group"
            >
              {fileData.preview ? (
                <img
                  src={fileData.preview}
                  alt=""
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{fileData.name}</p>
                <p className="text-xs text-slate-400">
                  {(fileData.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
