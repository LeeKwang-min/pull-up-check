import type { LandmarkSnapshot } from '../../types/analysis';

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
];

export function LandmarkOverlay({ landmarks, width, height }: LandmarkOverlayProps) {
  if (!landmarks) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {CONNECTIONS.map(([from, to], i) => {
        const a = landmarks[from];
        const b = landmarks[to];
        if (a.visibility < 0.5 || b.visibility < 0.5) return null;
        return (
          <line
            key={i}
            x1={a.x * width}
            y1={a.y * height}
            x2={b.x * width}
            y2={b.y * height}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {Object.values(landmarks).map((point, i) => {
        if (point.visibility < 0.5) return null;
        return (
          <circle
            key={i}
            cx={point.x * width}
            cy={point.y * height}
            r={4}
            fill="#60a5fa"
          />
        );
      })}
    </svg>
  );
}
