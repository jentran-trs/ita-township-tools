"use client";

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

type Kind = 'signature' | 'logo';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  kind: Kind;
  label?: string;
  helperText?: string;
};

const ACCEPT: Record<Kind, string> = {
  signature: 'image/png',
  logo: 'image/png,image/jpeg,image/webp',
};

export function SignatureUpload({ value, onChange, kind, label, helperText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackHelper =
    kind === 'signature'
      ? 'PNG, transparent background recommended. Max 2 MB.'
      : 'PNG, JPEG, or WebP. Max 2 MB.';

  const onPick = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('kind', kind);
      if (value) fd.set('oldUrl', value);
      const res = await fetch('/api/admin/certificates/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange(json.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5">{label}</label>}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div
            className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[100px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="max-h-20 max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400 text-xs">
                Drag and drop or click to upload
              </div>
            )}
          </div>
          <div className="mt-1.5 text-xs text-gray-500">{helperText || fallbackHelper}</div>
          {error && <div className="mt-1.5 text-xs text-red-600">{error}</div>}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onPick}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? 'Uploading' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
