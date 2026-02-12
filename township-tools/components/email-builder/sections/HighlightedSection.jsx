import React from 'react';
import RichTextEditor from '../RichTextEditor';

const HighlightedSection = ({ data, onChange, themeColors }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">!</span>
        Highlighted Section
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Section Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Key Information"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Content</label>
        <RichTextEditor
          content={data.content || ''}
          onChange={(content) => onChange({ content })}
          placeholder="Write highlighted content..."
        />
      </div>
      <p className="text-xs text-slate-500">Left border and heading use "Accent" color from Brand Settings.</p>
    </div>
  );
};

export default HighlightedSection;
