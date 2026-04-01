import { useState, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';

interface ReportExportProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

function getOptions(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const pad = 16;
  return {
    backgroundColor: '#1C1917',
    pixelRatio: 2,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    style: { margin: '0', padding: `${pad}px` },
  };
}

export function ReportExport({ targetRef }: ReportExportProps) {
  const [saving, setSaving] = useState(false);

  const handleSaveImage = useCallback(async () => {
    if (!targetRef.current || saving) return;
    setSaving(true);

    try {
      const dataUrl = await toPng(targetRef.current, getOptions(targetRef.current));
      const link = document.createElement('a');
      link.download = `pullup-check-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      // 폴백: blob URL을 새 탭에서 열기 (모바일 Safari 등)
      try {
        const blob = await toBlob(targetRef.current, getOptions(targetRef.current));
        if (blob) {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch {
        alert('이미지 저장에 실패했습니다. 스크린샷을 이용해 주세요.');
      }
    } finally {
      setSaving(false);
    }
  }, [targetRef, saving]);

  const handleShare = useCallback(async () => {
    if (!targetRef.current || !navigator.share) return;

    try {
      const blob = await toBlob(targetRef.current, getOptions(targetRef.current));
      if (!blob) return;
      const file = new File([blob], 'pullup-check.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') {
        console.error('공유 실패:', err);
      }
    }
  }, [targetRef]);

  return (
    <div className="flex gap-3">
      <button
        onClick={handleSaveImage}
        disabled={saving}
        className="flex-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 font-semibold py-3 rounded-xl text-sm transition-colors border border-stone-700 cursor-pointer"
      >
        {saving ? '저장 중...' : '이미지 저장'}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button onClick={handleShare} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 rounded-xl text-sm transition-all cursor-pointer uppercase tracking-wider font-[Barlow_Condensed]">
          공유
        </button>
      )}
    </div>
  );
}
