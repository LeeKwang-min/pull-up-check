import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">풀업 체크</h1>
        <p className="text-zinc-400 mt-2">AI 기반 턱걸이 자세 분석</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/analyze"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          분석 시작
        </Link>
        <Link
          to="/history"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          기록 보기
        </Link>
      </div>

      <p className="text-xs text-zinc-600 max-w-xs">
        모든 처리는 기기에서 이루어집니다. 영상 데이터는 서버로 전송되지 않습니다.
      </p>
    </div>
  );
}
