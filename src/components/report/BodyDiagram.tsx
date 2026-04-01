import type { AsymmetryDetails } from '../../types/analysis';

interface BodyDiagramProps {
  asymmetryDetails?: AsymmetryDetails;
}

function statusColor(asym: number): string {
  if (asym >= 15) return '#ef4444';
  if (asym >= 5) return '#eab308';
  return '#22c55e';
}

function biasLabel(bias: number): string {
  if (Math.abs(bias) < 0.3) return '균등';
  return bias > 0 ? '오른쪽이 더 낮음' : '왼쪽이 더 낮음';
}

function biasArrow(bias: number): string {
  if (Math.abs(bias) < 0.3) return '=';
  return bias > 0 ? 'R↓' : 'L↓';
}

const DEFAULT_DETAILS: AsymmetryDetails = {
  shoulder: 0, elbow: 0, hip: 0,
  shoulderBias: 0, elbowBias: 0, hipBias: 0,
  kneeGap: 0, elbowWidth: 0, elbowWidthBias: 0,
};

/**
 * Anatomical body zone component.
 * Each zone is a rounded rect that glows with its status color.
 */
function Zone({ x, y, w, h, rx, color, opacity = 0.55 }: {
  x: number; y: number; w: number; h: number; rx: number; color: string; opacity?: number;
}) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx}
        fill={color} opacity={opacity * 0.3} filter="url(#zone-glow)" />
      <rect x={x} y={y} width={w} height={h} rx={rx}
        fill={color} opacity={opacity} />
    </>
  );
}

export function BodyDiagram({ asymmetryDetails }: BodyDiagramProps) {
  const d = asymmetryDetails ?? DEFAULT_DETAILS;
  const kneeGapScaled = Math.max(0, d.kneeGap - 140) / 10;

  const shoulderColor = statusColor(d.shoulder);
  const armColor = statusColor(Math.max(d.elbow, d.elbowWidth));
  const coreColor = statusColor(d.hip);
  const legColor = statusColor(kneeGapScaled);

  const items = [
    {
      label: '어깨 높이', weight: '20%', asym: d.shoulder, deduction: d.shoulder * 2,
      bias: d.shoulderBias, biasType: 'height' as const, color: shoulderColor,
    },
    {
      label: '팔꿈치 높이', weight: '15%', asym: d.elbow, deduction: d.elbow * 1.5,
      bias: d.elbowBias, biasType: 'height' as const, color: armColor,
    },
    {
      label: '골반', weight: '10%', asym: d.hip, deduction: d.hip * 1.0,
      bias: d.hipBias, biasType: 'height' as const, color: coreColor,
    },
    {
      label: '팔꿈치 너비', weight: '25%', asym: d.elbowWidth, deduction: d.elbowWidth * 2.5,
      bias: d.elbowWidthBias, biasType: 'width' as const, color: armColor,
    },
    {
      label: '다리 반동', weight: '30%', asym: d.kneeGap, deduction: (Math.max(0, d.kneeGap - 140) / 10) * 3,
      bias: 0, biasType: 'gap' as const, color: legColor,
    },
  ];

  const totalDeduction = items.reduce((sum, i) => sum + i.deduction, 0);

  return (
    <div className="surface-card rounded-2xl p-5">
      <h3 className="section-label mb-4">신체 밸런스</h3>

      {/* ── Figure ── */}
      <div className="flex justify-center mb-5">
        <svg viewBox="0 0 160 220" className="w-40 h-auto">
          <defs>
            <filter id="zone-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="bg-gradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#292524" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0c0a09" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <ellipse cx="80" cy="105" rx="70" ry="95" fill="url(#bg-gradient)" />

          {/* ── Base silhouette (dark neutral) ── */}
          {/* Head */}
          <ellipse cx="80" cy="22" rx="14" ry="17" fill="#292524" />
          {/* Neck */}
          <rect x="73" y="38" width="14" height="10" rx="4" fill="#292524" />
          {/* Torso */}
          <rect x="56" y="47" width="48" height="62" rx="8" fill="#292524" />
          {/* Left upper arm */}
          <rect x="36" y="50" width="18" height="38" rx="9" fill="#292524" />
          {/* Right upper arm */}
          <rect x="106" y="50" width="18" height="38" rx="9" fill="#292524" />
          {/* Left forearm */}
          <rect x="34" y="90" width="16" height="36" rx="8" fill="#292524" />
          {/* Right forearm */}
          <rect x="110" y="90" width="16" height="36" rx="8" fill="#292524" />
          {/* Left upper leg */}
          <rect x="58" y="112" width="20" height="46" rx="8" fill="#292524" />
          {/* Right upper leg */}
          <rect x="82" y="112" width="20" height="46" rx="8" fill="#292524" />
          {/* Left lower leg */}
          <rect x="60" y="160" width="16" height="40" rx="7" fill="#292524" />
          {/* Right lower leg */}
          <rect x="84" y="160" width="16" height="40" rx="7" fill="#292524" />

          {/* ── Colored zones ── */}
          {/* Shoulders */}
          <Zone x={56} y={47} w={22} h={16} rx={6} color={shoulderColor} />
          <Zone x={82} y={47} w={22} h={16} rx={6} color={shoulderColor} />
          {/* Arms (upper + forearm) */}
          <Zone x={36} y={50} w={18} h={38} rx={9} color={armColor} />
          <Zone x={106} y={50} w={18} h={38} rx={9} color={armColor} />
          <Zone x={34} y={90} w={16} h={36} rx={8} color={armColor} opacity={0.4} />
          <Zone x={110} y={90} w={16} h={36} rx={8} color={armColor} opacity={0.4} />
          {/* Core / hip */}
          <Zone x={58} y={80} w={44} h={30} rx={6} color={coreColor} />
          {/* Legs */}
          <Zone x={58} y={112} w={20} h={46} rx={8} color={legColor} />
          <Zone x={82} y={112} w={20} h={46} rx={8} color={legColor} />
          <Zone x={60} y={160} w={16} h={40} rx={7} color={legColor} opacity={0.35} />
          <Zone x={84} y={160} w={16} h={40} rx={7} color={legColor} opacity={0.35} />
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-center gap-5 mb-6">
        {[
          { color: '#22c55e', label: '양호' },
          { color: '#eab308', label: '주의' },
          { color: '#ef4444', label: '불균형' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-stone-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── Deduction table ── */}
      {asymmetryDetails && (
        <div className="space-y-1">
          <h4 className="section-label mb-2">감점 내역</h4>

          <div className="divide-y divide-stone-800/80">
            {items.map((item) => (
              <div key={item.label} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] text-stone-300">{item.label}</span>
                    <span className="text-[11px] text-stone-600">{item.weight}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <span className="text-stone-500 tabular-nums">
                      {item.biasType === 'gap'
                        ? `${item.asym.toFixed(0)}%`
                        : `${item.asym.toFixed(1)}%`}
                    </span>
                    <span className={`font-semibold tabular-nums font-[Barlow_Condensed] ${
                      item.deduction > 5 ? 'text-red-400' : item.deduction > 1 ? 'text-amber-400' : 'text-stone-500'
                    }`}>
                      -{item.deduction.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Bias info */}
                {item.biasType === 'height' && Math.abs(item.bias) >= 0.3 && (
                  <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                    <span className={`text-[10px] font-mono font-bold ${item.bias > 0 ? 'text-blue-400/70' : 'text-orange-400/70'}`}>
                      {biasArrow(item.bias)}
                    </span>
                    <span className="text-[10px] text-stone-600">
                      {biasLabel(item.bias)} ({Math.abs(item.bias).toFixed(1)}%)
                    </span>
                  </div>
                )}
                {item.biasType === 'width' && Math.abs(item.bias) >= 0.3 && (
                  <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                    <span className={`text-[10px] font-mono font-bold ${item.bias > 0 ? 'text-blue-400/70' : 'text-orange-400/70'}`}>
                      {item.bias > 0 ? 'R→' : 'L→'}
                    </span>
                    <span className="text-[10px] text-stone-600">
                      {item.bias > 0 ? '오른쪽이 더 벌어짐' : '왼쪽이 더 벌어짐'} ({Math.abs(item.bias).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-3 mt-1 border-t border-stone-700/50 flex justify-between items-center">
            <span className="text-[13px] text-stone-400">합계</span>
            <span className={`text-sm font-bold tabular-nums font-[Barlow_Condensed] ${
              totalDeduction > 20 ? 'text-red-400' : totalDeduction > 5 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              -{totalDeduction.toFixed(1)}점
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
