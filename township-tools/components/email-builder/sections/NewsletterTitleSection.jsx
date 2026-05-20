import React from 'react';

// Simplified to a single "Edition" field — townships typically use natural
// labels like "Spring 2026", "Q4 2026", or "March 2026 Issue" rather than
// the formal Volume/Issue/Date triad. Legacy templates that still carry
// volume/issue/date are rendered by the template renderer for backward
// compatibility, but new edits go through the single-field flow.
const NewsletterTitleSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">N</span>
        Newsletter Title
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Newsletter Name</label>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. The Township Times"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Edition</label>
        <input
          type="text"
          value={data.edition || ''}
          onChange={(e) => onChange({ edition: e.target.value })}
          placeholder="e.g. Spring 2026 · Q4 2026 · March 2026 Issue"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <p className="text-xs text-slate-500 mt-1">A short label that appears under the newsletter name. Use whatever frequency makes sense for your township.</p>
      </div>
      <p className="text-xs text-slate-500">Background uses &ldquo;Primary&rdquo; color. Divider line uses &ldquo;Highlight / Gold&rdquo; from Brand Settings.</p>
    </div>
  );
};

export default NewsletterTitleSection;
