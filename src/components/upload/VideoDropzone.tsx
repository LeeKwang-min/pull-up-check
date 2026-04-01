import { useCallback, useState } from 'react';

interface VideoDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function VideoDropzone({ onFileSelected }: VideoDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('video/')) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
        isDragOver ? 'border-amber-500 bg-amber-500/5' : 'border-stone-700 hover:border-stone-500'
      }`}
    >
      <svg className="mb-3" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={isDragOver ? '#F59E0B' : '#78716C'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p className="text-sm text-stone-300">영상을 끌어놓거나 탭하여 선택하세요</p>
      <p className="text-xs text-stone-600 mt-1">MP4, MOV, WebM</p>
      <input type="file" accept="video/*" onChange={handleChange} className="hidden" />
    </label>
  );
}
