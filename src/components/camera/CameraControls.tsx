interface CameraControlsProps {
  isAnalyzing: boolean;
  onStartStop: () => void;
  onNextSet: () => void;
  onFinish: () => void;
}

export function CameraControls({ isAnalyzing, onStartStop, onNextSet, onFinish }: CameraControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onNextSet}
        disabled={!isAnalyzing}
        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Next Set
      </button>
      <button
        onClick={onStartStop}
        className={`w-16 h-16 rounded-full font-bold text-sm transition-all ${
          isAnalyzing
            ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/30'
            : 'bg-blue-600 hover:bg-blue-500 text-white ring-4 ring-blue-600/30'
        }`}
      >
        {isAnalyzing ? 'STOP' : 'START'}
      </button>
      <button
        onClick={onFinish}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Finish
      </button>
    </div>
  );
}
