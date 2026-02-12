import React from 'react';
import RichTextEditor from '../RichTextEditor';

const ContentBodySection = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">C</span>
        Content Body
      </h3>
      <RichTextEditor
        content={data.content || ''}
        onChange={(content) => onChange({ content })}
        placeholder="Write your main email content here..."
      />
    </div>
  );
};

export default ContentBodySection;
