import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const ListSection = ({ data, onChange }) => {
  const items = data.items || [''];
  const listType = data.listType || 'bullet';

  const addItem = () => onChange({ items: [...items, ''] });
  const removeItem = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });
  const updateItem = (i, value) => {
    const updated = items.map((item, idx) => idx === i ? value : item);
    onChange({ items: updated });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-teal-500/20 text-teal-500 flex items-center justify-center text-xs font-bold">#</span>
        List
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Heading (optional)</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="e.g. Key Points"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">List Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ listType: 'bullet' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${listType === 'bullet' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
          >
            Bulleted
          </button>
          <button
            onClick={() => onChange({ listType: 'numbered' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${listType === 'numbered' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
          >
            Numbered
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-slate-500 w-5 text-right">{listType === 'numbered' ? `${i+1}.` : '•'}</span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder="List item..."
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
        <Plus className="w-3.5 h-3.5" /> Add Item
      </button>
    </div>
  );
};

export default ListSection;
