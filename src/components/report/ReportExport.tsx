import { useCallback } from 'react';
import html2canvas from 'html2canvas';

interface ReportExportProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function ReportExport({ targetRef }: ReportExportProps) {
  const handleSaveImage = useCallback(async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { backgroundColor: '#0C0A09', scale: 2 });
    const link = document.createElement('a');
    link.download = `pullup-check-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [targetRef]);

  const handleShare = useCallback(async () => {
    if (!targetRef.current || !navigator.share) return;
    const canvas = await html2canvas(targetRef.current, { backgroundColor: '#0C0A09', scale: 2 });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'pullup-check.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    });
  }, [targetRef]);

  return (
    <div className="flex gap-3">
      <button onClick={handleSaveImage} className="flex-1 bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold py-3 rounded-xl text-sm transition-colors border border-stone-800 cursor-pointer">
        이미지 저장
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button onClick={handleShare} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 rounded-xl text-sm transition-all cursor-pointer uppercase tracking-wider font-[Barlow_Condensed]">
          공유
        </button>
      )}
    </div>
  );
}
