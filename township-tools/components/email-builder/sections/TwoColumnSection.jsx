import React from 'react';

const TwoColumnSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs font-bold">2</span>
        Two-Column Layout
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">Left Column</p>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={data.leftHeading || ''}
              onChange={(e) => onChange({ leftHeading: e.target.value })}
              placeholder="Heading"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Text</label>
            <textarea
              value={data.leftText || ''}
              onChange={(e) => onChange({ leftText: e.target.value })}
              placeholder="Content..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">Right Column</p>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={data.rightHeading || ''}
              onChange={(e) => onChange({ rightHeading: e.target.value })}
              placeholder="Heading"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Text</label>
            <textarea
              value={data.rightText || ''}
              onChange={(e) => onChange({ rightText: e.target.value })}
              placeholder="Content..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoColumnSection;
