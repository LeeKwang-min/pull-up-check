import type { CameraAngle } from '../../types/analysis';

export type PoseReadyLevel = 'none' | 'basic' | 'full';

interface Props {
  angle: CameraAngle;
  visible: boolean;
  readyLevel: PoseReadyLevel;
  width: number;
  height: number;
}

export function CameraGuideOverlay({ angle, visible, readyLevel, width, height }: Props) {
  if (width === 0 || height === 0) return null;

  const isSide = angle === 'side';
  const cx = width / 2;

  // --- Key Y positions ---
  const barY = height * 0.08;
  const headY = height * 0.18;
  const feetY = height * 0.90;
  const bodyH = feetY - headY;
  const hipY = headY + bodyH * 0.48;

  // --- Zone boundaries ---
  const zoneW = width * 0.52;
  const zoneL = cx - zoneW / 2;
  const zoneR = cx + zoneW / 2;

  // --- Silhouette proportions ---
  const headR = bodyH * 0.045;
  const shoulderY = headY + bodyH * 0.12;
  const shoulderHalf = isSide ? bodyH * 0.04 : bodyH * 0.11;
  const gripHalf = shoulderHalf * 1.4;
  const hipHalf = isSide ? bodyH * 0.035 : bodyH * 0.07;

  // --- Responsive sizing ---
  const fs = Math.max(10, Math.min(15, width * 0.022));
  const bracketLen = Math.min(20, width * 0.04);

  const angleLabel = isSide ? '측면' : angle === 'front' ? '정면' : '후면';

  // --- Colors: white base, green when ready ---
  const isReady = readyLevel !== 'none';
  const lineColor = isReady ? '#34D399' : '#FFFFFF';
  const textColor = isReady ? '#6EE7B7' : '#FFFFFF';
  const lowerLineColor = readyLevel === 'full' ? '#34D399' : 'rgba(255,255,255,0.6)';
  const lowerTextColor = readyLevel === 'full' ? '#6EE7B7' : 'rgba(255,255,255,0.7)';

  // --- Status message ---
  let statusText: string;
  if (readyLevel === 'full') {
    statusText = '정밀 분석 준비 완료! 측정을 시작하세요';
  } else if (readyLevel === 'basic') {
    statusText = '기본 분석 준비 완료 · 전신이 보이면 정밀 분석';
  } else {
    statusText = isSide
      ? '옆에서 상체 전체가 보이게 촬영하세요'
      : '정면/후면에서 상체 전체가 보이게 촬영하세요';
  }

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          <filter id="g-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="1" />
            <feComponentTransfer><feFuncA type="linear" slope="0.9" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="g-outline">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="expanded" />
            <feFlood floodColor="#000" floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="expanded" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── 반투명 어두운 배경 (밝은 낮 배경에서 대비 확보) ── */}
        <rect x="0" y="0" width={width} height={height} fill="#000" opacity={0.3} />

        {/* ══════════════════════════════════════════
            ■ 필수 영역: 바(Bar) ~ 골반
           ══════════════════════════════════════════ */}

        {/* 상단 코너 브라켓 (필수) */}
        <g stroke={lineColor} strokeWidth={5} fill="none" strokeLinecap="round" filter="url(#g-shadow)">
          <polyline points={`${zoneL},${barY + bracketLen} ${zoneL},${barY} ${zoneL + bracketLen},${barY}`} />
          <polyline points={`${zoneR - bracketLen},${barY} ${zoneR},${barY} ${zoneR},${barY + bracketLen}`} />
        </g>

        {/* 바(Bar) 가이드 라인 */}
        <line
          x1={cx - gripHalf * 1.3} y1={barY}
          x2={cx + gripHalf * 1.3} y2={barY}
          stroke={lineColor} strokeWidth={6} opacity={0.9} strokeLinecap="round"
          filter="url(#g-shadow)"
        />
        <text
          x={cx} y={barY - fs * 0.8}
          textAnchor="middle" fill={textColor} fontSize={fs * 1.05}
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="700"
          filter="url(#g-outline)"
        >
          바(Bar)를 이 선에 맞춰주세요
        </text>

        {/* 골반 라인 — 필수/권장 경계 */}
        <line
          x1={zoneL} y1={hipY} x2={zoneR} y2={hipY}
          stroke={lineColor} strokeWidth={3} strokeDasharray="8 5" opacity={0.7}
          filter="url(#g-shadow)"
        />
        <text
          x={zoneR + 6} y={hipY + fs * 0.35}
          fill={textColor} fontSize={fs * 0.85}
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="600"
          filter="url(#g-outline)" opacity={0.9}
        >
          필수
        </text>

        {/* ══════════════════════════════════════════
            □ 권장 영역: 골반 ~ 발
           ══════════════════════════════════════════ */}

        {/* 하단 코너 브라켓 (권장) */}
        <g stroke={lowerLineColor} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray="6 4">
          <polyline points={`${zoneL},${feetY - bracketLen} ${zoneL},${feetY} ${zoneL + bracketLen},${feetY}`} />
          <polyline points={`${zoneR - bracketLen},${feetY} ${zoneR},${feetY} ${zoneR},${feetY - bracketLen}`} />
        </g>

        {/* 발 가이드 라인 */}
        <line
          x1={zoneL + bracketLen} y1={feetY} x2={zoneR - bracketLen} y2={feetY}
          stroke={lowerLineColor} strokeWidth={2.5} strokeDasharray="10 6" opacity={0.7}
        />
        <text
          x={cx} y={feetY + fs * 1.4}
          textAnchor="middle" fill={lowerTextColor} fontSize={fs * 0.9}
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="600"
          filter="url(#g-outline)"
        >
          발끝까지 보이면 정밀 분석 가능
        </text>

        {/* ══════════════════════════════════════════
            실루엣
           ══════════════════════════════════════════ */}

        {/* 상체 실루엣 (필수) */}
        <g opacity={0.6} stroke={lineColor} strokeWidth={4} strokeLinecap="round" fill="none">
          <circle cx={cx} cy={headY} r={headR} />
          {isSide ? (
            <>
              <line x1={cx + bodyH * 0.01} y1={shoulderY} x2={cx + bodyH * 0.02} y2={barY} />
              <line x1={cx} y1={headY + headR} x2={cx} y2={hipY} />
            </>
          ) : (
            <>
              <line x1={cx - shoulderHalf} y1={shoulderY} x2={cx - gripHalf} y2={barY} />
              <line x1={cx + shoulderHalf} y1={shoulderY} x2={cx + gripHalf} y2={barY} />
              <line x1={cx - shoulderHalf} y1={shoulderY} x2={cx + shoulderHalf} y2={shoulderY} />
              <line x1={cx} y1={headY + headR} x2={cx} y2={hipY} />
              <line x1={cx - hipHalf} y1={hipY} x2={cx + hipHalf} y2={hipY} />
            </>
          )}
        </g>

        {/* 하체 실루엣 (권장 — 흐리게) */}
        <g opacity={0.35} stroke={lowerLineColor} strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray="6 4">
          {isSide ? (
            <line x1={cx} y1={hipY} x2={cx + bodyH * 0.015} y2={feetY} />
          ) : (
            <>
              <line x1={cx - hipHalf} y1={hipY} x2={cx - hipHalf * 0.8} y2={feetY} />
              <line x1={cx + hipHalf} y1={hipY} x2={cx + hipHalf * 0.8} y2={feetY} />
            </>
          )}
        </g>

        {/* ══════════════════════════════════════════
            상태 메시지 + 각도 배지
           ══════════════════════════════════════════ */}

        <text
          x={cx} y={hipY + bodyH * 0.14}
          textAnchor="middle" fill={textColor} fontSize={fs * 1.15}
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="700"
          letterSpacing="0.03em" filter="url(#g-outline)"
        >
          {statusText}
        </text>

        {/* 각도 배지 */}
        <g>
          <rect
            x={cx - fs * 2.2} y={height - fs * 3}
            width={fs * 4.4} height={fs * 1.8}
            rx={fs * 0.4} fill="#000" opacity={0.6}
          />
          <text
            x={cx} y={height - fs * 1.5}
            textAnchor="middle" fill={textColor} fontSize={fs * 0.9}
            fontFamily="'Barlow Condensed', sans-serif" fontWeight="700"
          >
            {angleLabel} 촬영
          </text>
        </g>
      </svg>
    </div>
  );
}
