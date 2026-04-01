interface CameraControlsProps {
  isAnalyzing: boolean;
  onStartStop: () => void;
  onNextSet: () => void;
  onFinish: () => void;
}

export function CameraControls({ isAnalyzing, onStartStop, onNextSet, onFinish }: CameraControlsProps) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        onClick={onNextSet}
        disabled={!isAnalyzing}
        className="bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors border border-stone-700 uppercase tracking-wider font-[Barlow_Condensed] cursor-pointer"
      >
        다음 세트
      </button>
      <button
        onClick={onStartStop}
        className={`w-16 h-16 rounded-full font-bold text-sm transition-all cursor-pointer uppercase tracking-wider font-[Barlow_Condensed] ${
          isAnalyzing
            ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/20'
            : 'bg-gradient-to-br from-amber-500 to-amber-600 text-black ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/20'
        }`}
      >
        {isAnalyzing ? '정지' : '시작'}
      </button>
      <button
        onClick={onFinish}
        className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors border border-stone-700 uppercase tracking-wider font-[Barlow_Condensed] cursor-pointer"
      >
        완료
      </button>
    </div>
  );
}
