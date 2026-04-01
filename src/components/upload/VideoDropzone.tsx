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
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
        isDragOver ? 'border-blue-400 bg-blue-900/20' : 'border-zinc-700 hover:border-zinc-500'
      }`}
    >
      <div className="text-3xl mb-2">📁</div>
      <p className="text-sm text-zinc-300">Drag &amp; drop video or tap to select</p>
      <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WebM</p>
      <input type="file" accept="video/*" onChange={handleChange} className="hidden" />
    </label>
  );
}
