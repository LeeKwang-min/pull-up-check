interface CameraControlsProps {
  isAnalyzing: boolean;
  onStartStop: () => void;
  onNextSet: () => void;
  onFinish: () => void;
}

export function CameraControls({ isAnalyzing, onStartStop, onNextSet, onFinish }: CameraControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onNextSet}
        disabled={!isAnalyzing}
        className="bg-white hover:bg-stone-50 disabled:opacity-25 text-stone-600 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all border border-stone-200 shadow-sm uppercase tracking-wider font-[Barlow_Condensed] cursor-pointer active:scale-95"
      >
        다음 세트
      </button>
      <button
        onClick={onStartStop}
        className={`relative w-16 h-16 rounded-full font-bold text-sm cursor-pointer uppercase tracking-wider font-[Barlow_Condensed] active:scale-90 transition-all ${
          isAnalyzing
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
            : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/25'
        }`}
      >
        {isAnalyzing && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
        )}
        <span className="relative">{isAnalyzing ? '일시정지' : '측정 시작'}</span>
      </button>
      <button
        onClick={onFinish}
        className="bg-white hover:bg-stone-50 text-stone-600 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all border border-stone-200 shadow-sm uppercase tracking-wider font-[Barlow_Condensed] cursor-pointer active:scale-95"
      >
        분석 완료
      </button>
    </div>
  );
}
