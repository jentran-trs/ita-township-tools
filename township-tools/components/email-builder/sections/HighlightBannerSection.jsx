import React from 'react';

const HighlightBannerSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">🎯</span>
        Highlight Banner
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Join Us at the Community Fair!"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
        <textarea
          value={data.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Supporting text for the banner..."
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Button Text</label>
        <input
          type="text"
          value={data.buttonText || ''}
          onChange={(e) => onChange({ buttonText: e.target.value })}
          placeholder="e.g. Register Now"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Button URL</label>
        <input
          type="text"
          value={data.buttonUrl || ''}
          onChange={(e) => onChange({ buttonUrl: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <p className="text-xs text-slate-500">Background uses "Primary" color. Button uses "Highlight / Gold" from Brand Settings.</p>
    </div>
  );
};

export default HighlightBannerSection;
