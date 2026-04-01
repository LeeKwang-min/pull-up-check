import type { Point3D } from '../../types/analysis';

export function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

export function calculateAsymmetry(leftY: number, rightY: number): number {
  return (rightY - leftY) * 100;
}

export function calculateDisplacement(a: Point3D, b: Point3D): number {
  return Math.abs(a.x - b.x);
}
