import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const PreviewPanel = ({ html, onClose }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Preview</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-200 p-4">
        <iframe
          ref={iframeRef}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="w-full bg-white rounded shadow-lg"
          style={{ minHeight: '600px', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
