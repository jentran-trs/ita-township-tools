"use client";

import { ClipboardCheck, Check, Image, FileText, BarChart3, Upload, Info } from 'lucide-react';
import FileUpload from './FileUpload';

export default function ReviewSection({ formData, reviewData, onChange, onUpdateCover, existingLogoUrl }) {
  const updateField = (field, value) => {
    onChange({ ...reviewData, [field]: value });
  };

  const updateCoverField = (field, value) => {
    onUpdateCover({ ...formData.cover, [field]: value });
  };

  const { cover, letter, footer, sections } = formData;

  // Count totals
  const totalImages = sections.reduce((acc, s) => {
    const sectionImages = (s.images || []).filter(img => img.file?.file).length;
    return acc + sectionImages;
  }, 0) +
    (letter.headshot ? 1 : 0) +
    (letter.letterImage1 ? 1 : 0) +
    (letter.letterImage2 ? 1 : 0) +
    (cover.logo ? 1 : 0);

  const totalStats = sections.reduce((acc, s) => acc + (s.stats?.length || 0), 0);
  const totalTextBlocks = sections.reduce((acc, s) => acc + (s.textBlocks?.length || 0), 0);
  const totalCards = sections.reduce((acc, s) => acc + (s.contentCards?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Review & Submit</h2>
          <p className="text-sm text-slate-500">Verify your information before submitting</p>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>You can edit your submission anytime.</strong> After submitting, you can return to this form to add more sections, upload additional assets, or make changes until you confirm that everything is ready for design.
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-slate-800">Upload Organization Logo <span className="text-red-500">*</span></h3>
        </div>
        {/* Show existing logo if editing and no new file uploaded */}
        {existingLogoUrl && !cover.logo && (
          <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-2">Current logo — upload a new file to replace</p>
            <img
              src={existingLogoUrl}
              alt="Current logo"
              className="max-h-20 object-contain"
            />
          </div>
        )}
        <FileUpload
          label="Organization Logo"
          accept="image/png,image/jpeg,image/svg+xml"
          value={cover.logo}
          onChange={(file) => updateCoverField('logo', file)}
          helpText="PNG or SVG format with transparent background recommended."
        />
        <p className="mt-2 text-xs text-amber-700">
          <strong>Important:</strong> The colors from your logo will be used to generate your report's color theme. For best results, use a logo with a transparent background.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Image className="w-4 h-4" />
            <span className="text-sm font-medium">Images</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalImages}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Sections</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{sections.length}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Stats</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalStats}</p>
        </div>
      </div>

      {/* Submission Summary */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <h3 className="font-medium text-slate-800">What you're submitting:</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span><strong>{cover.organizationName}</strong> — {cover.reportName}</span>
          </li>
          {letter.includeOpeningLetter && (
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Opening letter: {letter.letterTitle}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Footer with contact info for {footer.email}</span>
          </li>
          {sections.map((s, i) => {
            const imgCount = (s.images || []).filter(img => img.file?.file).length;
            const textCount = s.textBlocks?.length || 0;
            const cardCount = s.contentCards?.length || 0;
            const statCount = s.stats?.length || 0;
            const details = [];
            if (imgCount > 0) details.push(`${imgCount} image${imgCount !== 1 ? 's' : ''}`);
            if (textCount > 0) details.push(`${textCount} text block${textCount !== 1 ? 's' : ''}`);
            if (cardCount > 0) details.push(`${cardCount} card${cardCount !== 1 ? 's' : ''}`);
            if (statCount > 0) details.push(`${statCount} stat${statCount !== 1 ? 's' : ''}`);
            return (
              <li key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>
                  Section {i + 1}: {s.title || '(Untitled)'}
                  {details.length > 0 && ` — ${details.join(', ')}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Submitter Info */}
      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="font-medium text-slate-800">Your Contact Information</h3>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reviewData.submitterName || ''}
            onChange={(e) => updateField('submitterName', e.target.value)}
            placeholder="e.g., John Smith"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={reviewData.submitterEmail || ''}
            onChange={(e) => updateField('submitterEmail', e.target.value)}
            placeholder="e.g., john@township.gov"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={reviewData.additionalNotes || ''}
            onChange={(e) => updateField('additionalNotes', e.target.value)}
            placeholder="Any special instructions or requests for your report..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent resize-y"
          />
        </div>

        {/* Confirmation Checkbox */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewData.confirmed || false}
              onChange={(e) => updateField('confirmed', e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
            <span className="text-sm text-slate-700">
              <strong>I confirm</strong> that the information and files provided are accurate and approved for use in our report.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
