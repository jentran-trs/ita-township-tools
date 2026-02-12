import React from 'react';

const HeaderSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">H</span>
        Header
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Important Update from Your Township"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Subtitle (optional)</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="e.g. Monthly Community Newsletter"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <p className="text-xs text-slate-500">Background uses "Primary" color from Brand Settings.</p>
    </div>
  );
};

export default HeaderSection;
