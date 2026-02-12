import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const MemberResourcesSection = ({ data, onChange }) => {
  const items = data.items || [''];

  const addItem = () => onChange({ items: [...items, ''] });
  const removeItem = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });
  const updateItem = (i, value) => {
    const updated = items.map((item, idx) => idx === i ? value : item);
    onChange({ items: updated });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">📋</span>
        Member Resources
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Section Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Member Resources"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">•</span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder="Resource item..."
              className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400">
        <Plus className="w-3.5 h-3.5" /> Add Resource
      </button>
    </div>
  );
};

export default MemberResourcesSection;
