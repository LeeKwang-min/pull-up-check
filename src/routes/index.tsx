import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col min-h-[85vh] py-8">
      <div className="mb-8">
        <p className="text-xs text-stone-400 tracking-widest uppercase font-[Barlow_Condensed]">오늘의 턱걸이</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          풀업 <span className="text-amber-500">체크</span>
        </h1>
      </div>

      <div className="bg-stone-800 rounded-2xl p-6 border border-amber-500/10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />
        <div className="relative">
          <div className="text-6xl font-bold text-amber-500 leading-none font-[Barlow_Condensed]">
            --<span className="text-lg text-stone-400 ml-1">점</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">최근 종합 점수</p>
        </div>
        <div className="flex gap-8 mt-6">
          <div>
            <div className="text-xl font-bold font-[Barlow_Condensed]">--</div>
            <div className="text-xs text-stone-400">총 횟수</div>
          </div>
          <div>
            <div className="text-xl font-bold font-[Barlow_Condensed]">--</div>
            <div className="text-xs text-stone-400">세트</div>
          </div>
          <div>
            <div className="text-xl font-bold font-[Barlow_Condensed]">--</div>
            <div className="text-xs text-stone-400">평균 템포</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto pt-8">
        <Link
          to="/analyze"
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-4 px-6 rounded-2xl text-center transition-all hover:shadow-lg hover:shadow-amber-500/20 uppercase tracking-widest text-sm font-[Barlow_Condensed] cursor-pointer"
        >
          분석 시작
        </Link>
        <Link
          to="/history"
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-3 px-6 rounded-2xl text-center transition-colors border border-stone-700 cursor-pointer"
        >
          기록 보기
        </Link>
      </div>

      <p className="text-xs text-stone-500 text-center mt-6">
        모든 처리는 기기에서 이루어집니다. 영상 데이터는 서버로 전송되지 않습니다.
      </p>
    </div>
  );
}
