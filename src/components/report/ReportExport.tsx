import { useCallback } from 'react';
import html2canvas from 'html2canvas';

interface ReportExportProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function ReportExport({ targetRef }: ReportExportProps) {
  const handleSaveImage = useCallback(async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { backgroundColor: '#09090b', scale: 2 });
    const link = document.createElement('a');
    link.download = `pullup-check-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [targetRef]);

  const handleShare = useCallback(async () => {
    if (!targetRef.current || !navigator.share) return;
    const canvas = await html2canvas(targetRef.current, { backgroundColor: '#09090b', scale: 2 });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'pullup-check.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    });
  }, [targetRef]);

  return (
    <div className="flex gap-2">
      <button onClick={handleSaveImage} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 rounded-lg text-sm transition-colors">
        Save Image
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button onClick={handleShare} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
          Share
        </button>
      )}
    </div>
  );
}
