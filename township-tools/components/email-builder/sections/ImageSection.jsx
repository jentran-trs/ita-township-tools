import React from 'react';

const ImageSection = ({ data, onChange }) => {
  const width = data.width || 100;
  const shape = data.shape || 'rectangle';
  const align = data.align || 'center';

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs font-bold">I</span>
        Image
      </h3>

      {/* Image URL */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Image URL</label>
        <input
          type="text"
          value={data.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Preview */}
      {data.url && (
        <div className={`flex ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <img
            src={data.url}
            alt={data.alt || ''}
            style={{
              width: `${width}%`,
              maxWidth: '100%',
              borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '4px' : '4px',
              aspectRatio: shape === 'circle' || shape === 'square' ? '1 / 1' : 'auto',
              objectFit: shape === 'circle' || shape === 'square' ? 'cover' : 'contain',
            }}
            className="bg-slate-700"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Width */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Width: {width}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={width}
          onChange={(e) => onChange({ width: parseInt(e.target.value) })}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Shape */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Shape</label>
        <div className="flex gap-2">
          {[
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'square', label: 'Square' },
            { value: 'circle', label: 'Circle' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ shape: opt.value })}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                shape === opt.value
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Alignment</label>
        <div className="flex gap-2">
          {[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ align: opt.value })}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                align === opt.value
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alt Text */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Alt Text</label>
        <input
          type="text"
          value={data.alt || ''}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Describe the image"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Link URL */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Link URL (optional)</label>
        <input
          type="text"
          value={data.linkUrl || ''}
          onChange={(e) => onChange({ linkUrl: e.target.value })}
          placeholder="Wrap image in a link"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
};

export default ImageSection;
