import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SetData } from '../../types/analysis';

interface BodyDiagramProps {
  sets: SetData[];
}

interface BodyPart {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const bodyParts: BodyPart[] = [
  { id: 'shoulder-l', label: 'L Shoulder', x: 55, y: 60, width: 30, height: 20 },
  { id: 'shoulder-r', label: 'R Shoulder', x: 115, y: 60, width: 30, height: 20 },
  { id: 'arm-l', label: 'L Arm', x: 40, y: 85, width: 20, height: 50 },
  { id: 'arm-r', label: 'R Arm', x: 140, y: 85, width: 20, height: 50 },
  { id: 'back-l', label: 'L Back', x: 70, y: 85, width: 30, height: 50 },
  { id: 'back-r', label: 'R Back', x: 100, y: 85, width: 30, height: 50 },
];

export function BodyDiagram({ sets }: BodyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
    const asymmetryIssues = allIssues.filter((i) => i.type === 'asymmetry');

    const shoulderAsym =
      asymmetryIssues
        .filter((i) => i.detail.includes('어깨'))
        .reduce((sum, i) => sum + Math.abs(i.values.shoulderAsymmetry ?? 0), 0) /
        Math.max(1, asymmetryIssues.filter((i) => i.detail.includes('어깨')).length);

    const colorScale = d3.scaleLinear<string>().domain([0, 5, 15]).range(['#22c55e', '#eab308', '#ef4444']).clamp(true);

    svg.append('ellipse').attr('cx', 100).attr('cy', 30).attr('rx', 18).attr('ry', 22).attr('fill', '#44403C').attr('stroke', '#57534E');
    svg.append('rect').attr('x', 65).attr('y', 55).attr('width', 70).attr('height', 85).attr('rx', 8).attr('fill', '#44403C').attr('stroke', '#57534E');

    bodyParts.forEach((part) => {
      const asym = part.label.toLowerCase().includes('shoulder') ? shoulderAsym : 0;
      svg.append('rect').attr('x', part.x).attr('y', part.y).attr('width', part.width).attr('height', part.height).attr('rx', 4).attr('fill', colorScale(asym)).attr('opacity', 0.6);
    });

    const legend = svg.append('g').attr('transform', 'translate(10, 165)');
    [{ color: '#22c55e', label: '양호' }, { color: '#eab308', label: '주의' }, { color: '#ef4444', label: '불균형' }].forEach((d, i) => {
      legend.append('rect').attr('x', i * 65).attr('y', 0).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', d.color);
      legend.append('text').attr('x', i * 65 + 14).attr('y', 9).attr('fill', '#A8A29E').attr('font-size', '10px').text(d.label);
    });
  }, [sets]);

  return (
    <div className="bg-stone-800 rounded-2xl p-4 border border-amber-500/10">
      <h3 className="text-sm font-semibold text-stone-300 mb-2">신체 밸런스</h3>
      <svg ref={svgRef} viewBox="0 0 200 185" className="w-full max-w-[200px] mx-auto" />
    </div>
  );
}
