import React from 'react';

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
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Volume</label>
          <input
            type="text"
            value={data.volume || ''}
            onChange={(e) => onChange({ volume: e.target.value })}
            placeholder="e.g. 5"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Issue</label>
          <input
            type="text"
            value={data.issue || ''}
            onChange={(e) => onChange({ issue: e.target.value })}
            placeholder="e.g. 3"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input
            type="text"
            value={data.date || ''}
            onChange={(e) => onChange({ date: e.target.value })}
            placeholder="e.g. March 2025"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">Background uses "Primary" color. Divider line uses "Highlight / Gold" from Brand Settings.</p>
    </div>
  );
};

export default NewsletterTitleSection;
