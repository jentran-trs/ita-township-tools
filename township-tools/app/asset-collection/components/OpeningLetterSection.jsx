"use client";

import { useState } from 'react';
import FileUpload from './FileUpload';
import { Mail, ToggleLeft, ToggleRight } from 'lucide-react';

export default function OpeningLetterSection({ data, onChange, existingImageUrls = {} }) {
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const isEnabled = data.includeOpeningLetter || false;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Opening Letter</h2>
          <p className="text-sm text-slate-500">A personal message from leadership (optional)</p>
        </div>
      </div>

      {/* Toggle */}
      <div
        onClick={() => updateField('includeOpeningLetter', !isEnabled)}
        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <div>
          <p className="font-medium text-slate-800">Include an Opening Letter?</p>
          <p className="text-sm text-slate-500">Add a personal message from a trustee, chief, or other leader</p>
        </div>
        {isEnabled ? (
          <ToggleRight className="w-10 h-10 text-emerald-500" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-slate-300" />
        )}
      </div>

      {isEnabled && (
        <div className="grid gap-6 pt-4 border-t border-slate-200">
          {/* Headshot */}
          <div>
            {existingImageUrls.headshot && !data.headshot && (
              <div className="mb-2">
                <img
                  src={existingImageUrls.headshot}
                  alt="Current headshot"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">Current photo — upload a new file to replace</p>
              </div>
            )}
            <FileUpload
              label="Professional Headshot"
              accept="image/png,image/jpeg"
              value={data.headshot}
              onChange={(file) => updateField('headshot', file)}
              helpText="A professional photo of the letter author"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title / Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.letterTitle || ''}
              onChange={(e) => updateField('letterTitle', e.target.value)}
              placeholder="e.g., Message from the Trustee"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subtitle <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={data.letterSubtitle || ''}
              onChange={(e) => updateField('letterSubtitle', e.target.value)}
              placeholder="e.g., Reflecting on 7 Years of Growth"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          {/* Letter Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Letter Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.letterContent || ''}
              onChange={(e) => updateField('letterContent', e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');

                // Normalize all types of line endings to \n
                let formatted = text
                  .replace(/\r\n/g, '\n')  // Windows
                  .replace(/\r/g, '\n');    // Old Mac

                // Convert all single newlines to double newlines for paragraph spacing
                // First, normalize any existing double+ newlines to a placeholder
                formatted = formatted
                  .replace(/\n{2,}/g, '<<PARA>>')  // Mark existing paragraph breaks
                  .replace(/\n/g, '\n\n')          // Single newlines become double
                  .replace(/<<PARA>>/g, '\n\n');   // Restore paragraph breaks as double

                // Clean up any excessive newlines (3+ becomes 2)
                formatted = formatted.replace(/\n{3,}/g, '\n\n');

                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = data.letterContent || '';
                const newValue = currentValue.slice(0, start) + formatted + currentValue.slice(end);
                updateField('letterContent', newValue);

                // Restore cursor position after React re-renders
                setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
                }, 0);
              }}
              placeholder="Write your opening letter here... You can include multiple paragraphs."
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use blank lines to separate paragraphs
            </p>
          </div>

          {/* Image 1 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {existingImageUrls.letterImage1 && !data.letterImage1 && (
                <div className="mb-2">
                  <img
                    src={existingImageUrls.letterImage1}
                    alt="Current image 1"
                    className="w-full h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current image — upload to replace</p>
                </div>
              )}
              <FileUpload
                label="Image 1"
                accept="image/png,image/jpeg"
                value={data.letterImage1}
                onChange={(file) => updateField('letterImage1', file)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image 1 Caption
              </label>
              <input
                type="text"
                value={data.letterImage1Caption || ''}
                onChange={(e) => updateField('letterImage1Caption', e.target.value)}
                placeholder="Describe this image"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              />
            </div>
          </div>

          {/* Image 2 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {existingImageUrls.letterImage2 && !data.letterImage2 && (
                <div className="mb-2">
                  <img
                    src={existingImageUrls.letterImage2}
                    alt="Current image 2"
                    className="w-full h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current image — upload to replace</p>
                </div>
              )}
              <FileUpload
                label="Image 2"
                accept="image/png,image/jpeg"
                value={data.letterImage2}
                onChange={(file) => updateField('letterImage2', file)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image 2 Caption
              </label>
              <input
                type="text"
                value={data.letterImage2Caption || ''}
                onChange={(e) => updateField('letterImage2Caption', e.target.value)}
                placeholder="Describe this image"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
