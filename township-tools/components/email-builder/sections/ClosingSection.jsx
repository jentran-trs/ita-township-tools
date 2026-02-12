import React from 'react';
import RichTextEditor from '../RichTextEditor';

const ClosingSection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">X</span>
        Closing
      </h3>
      <RichTextEditor
        content={data.content || ''}
        onChange={(content) => onChange({ content })}
        placeholder="Add closing remarks, thank you message, etc."
      />
    </div>
  );
};

export default ClosingSection;
