import type { LandmarkSnapshot, Point3D } from '../../types/analysis';

interface LandmarkOverlayProps {
  landmarks: LandmarkSnapshot | null;
  width: number;
  height: number;
}

const CONNECTIONS: [keyof LandmarkSnapshot, keyof LandmarkSnapshot][] = [
  ['shoulderLeft', 'elbowLeft'],
  ['elbowLeft', 'wristLeft'],
  ['shoulderRight', 'elbowRight'],
  ['elbowRight', 'wristRight'],
  ['shoulderLeft', 'shoulderRight'],
  ['shoulderLeft', 'hipLeft'],
  ['shoulderRight', 'hipRight'],
  ['hipLeft', 'hipRight'],
  ['hipLeft', 'kneeLeft'],
  ['hipRight', 'kneeRight'],
  ['kneeLeft', 'kneeRight'],
];

const COLOR_NORMAL = '#F59E0B';
const COLOR_NORMAL_FILL = '#FBBF24';
const COLOR_WARN = '#ef4444';
const COLOR_WARN_FILL = '#f87171';

function getWarnFlags(landmarks: LandmarkSnapshot): Set<keyof LandmarkSnapshot> {
  const flagged = new Set<keyof LandmarkSnapshot>();

  // 높이 비대칭 쌍
  const heightPairs: { left: keyof LandmarkSnapshot; right: keyof LandmarkSnapshot; threshold: number }[] = [
    { left: 'shoulderLeft', right: 'shoulderRight', threshold: 0.03 },
    { left: 'elbowLeft', right: 'elbowRight', threshold: 0.04 },
    { left: 'hipLeft', right: 'hipRight', threshold: 0.03 },
  ];

  for (const pair of heightPairs) {
    const left = landmarks[pair.left] as Point3D;
    const right = landmarks[pair.right] as Point3D;
    if (left.visibility < 0.5 || right.visibility < 0.5) continue;
    if (Math.abs(left.y - right.y) > pair.threshold) {
      flagged.add(pair.left);
      flagged.add(pair.right);
    }
  }

  // 다리 벌어짐 체크 (어깨 너비 대비 30% 이상)
  const shoulderWidth = Math.abs(
    (landmarks.shoulderLeft as Point3D).x - (landmarks.shoulderRight as Point3D).x,
  );
  const kneeGap = Math.abs(
    (landmarks.kneeLeft as Point3D).x - (landmarks.kneeRight as Point3D).x,
  );
  if (shoulderWidth > 0.01 && (kneeGap / shoulderWidth) > 0.3) {
    flagged.add('kneeLeft');
    flagged.add('kneeRight');
  }

  // 팔꿈치 너비 대칭 체크 (등 중심 기준 10% 이상 차이)
  const centerX = ((landmarks.shoulderLeft as Point3D).x + (landmarks.shoulderRight as Point3D).x) / 2;
  const leftSpread = Math.abs(centerX - (landmarks.elbowLeft as Point3D).x);
  const rightSpread = Math.abs((landmarks.elbowRight as Point3D).x - centerX);
  const avgSpread = (leftSpread + rightSpread) / 2;
  if (avgSpread > 0.005) {
    const widthAsym = Math.abs(rightSpread - leftSpread) / avgSpread;
    if (widthAsym > 0.10) {
      flagged.add('elbowLeft');
      flagged.add('elbowRight');
    }
  }

  return flagged;
}

export function LandmarkOverlay({ landmarks, width, height }: LandmarkOverlayProps) {
  if (!landmarks || width === 0 || height === 0) return null;

  const flagged = getWarnFlags(landmarks);

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {CONNECTIONS.map(([from, to], i) => {
        const a = landmarks[from] as Point3D;
        const b = landmarks[to] as Point3D;
        if (a.visibility < 0.5 || b.visibility < 0.5) return null;

        const isWarn = flagged.has(from) && flagged.has(to);
        return (
          <line
            key={i}
            x1={a.x * width}
            y1={a.y * height}
            x2={b.x * width}
            y2={b.y * height}
            stroke={isWarn ? COLOR_WARN : COLOR_NORMAL}
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
        );
      })}
      {(Object.entries(landmarks) as [keyof LandmarkSnapshot, Point3D][]).map(([key, point]) => {
        if (point.visibility < 0.5) return null;

        const isWarn = flagged.has(key);
        return (
          <g key={key}>
            {isWarn && (
              <circle
                cx={point.x * width}
                cy={point.y * height}
                r={10}
                fill={COLOR_WARN}
                opacity={0.25}
              />
            )}
            <circle
              cx={point.x * width}
              cy={point.y * height}
              r={5}
              fill={isWarn ? COLOR_WARN_FILL : COLOR_NORMAL_FILL}
              stroke={isWarn ? '#991b1b' : '#78350F'}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
