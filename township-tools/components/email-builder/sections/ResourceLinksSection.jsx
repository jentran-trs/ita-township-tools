import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const ResourceLinksSection = ({ data, onChange }) => {
  const links = data.links || [{ text: '', url: '' }];

  const addLink = () => onChange({ links: [...links, { text: '', url: '' }] });
  const removeLink = (i) => onChange({ links: links.filter((_, idx) => idx !== i) });
  const updateLink = (i, field, value) => {
    const updated = links.map((link, idx) => idx === i ? { ...link, [field]: value } : link);
    onChange({ links: updated });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">🔗</span>
        Resource Links
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Section Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Helpful Resources"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={link.text}
                onChange={(e) => updateLink(i, 'text', e.target.value)}
                placeholder="Link text"
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            {links.length > 1 && (
              <button onClick={() => removeLink(i)} className="mt-1 p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addLink} className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400">
        <Plus className="w-3.5 h-3.5" /> Add Link
      </button>
      <p className="text-xs text-slate-500">Heading uses "Primary" color. Links use "Highlight / Gold" from Brand Settings.</p>
    </div>
  );
};

export default ResourceLinksSection;
