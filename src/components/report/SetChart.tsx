import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SetData } from '../../types/analysis';

interface SetChartProps {
  sets: SetData[];
}

export function SetChart({ sets }: SetChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || sets.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 360 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(sets.map((_, i) => `세트 ${i + 1}`)).range([0, width]).padding(0.3);
    const maxReps = d3.max(sets, (s) => s.reps.length) ?? 10;
    const y = d3.scaleLinear().domain([0, maxReps]).range([height, 0]);

    g.selectAll('.bar')
      .data(sets)
      .join('rect')
      .attr('x', (_, i) => x(`세트 ${i + 1}`)!)
      .attr('y', (d) => y(d.reps.length))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.reps.length))
      .attr('fill', '#3b82f6')
      .attr('rx', 4);

    const lineY = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const line = d3.line<SetData>()
      .x((_, i) => x(`세트 ${i + 1}`)! + x.bandwidth() / 2)
      .y((d) => lineY(d.averageFormScore))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(sets).attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 2).attr('d', line);

    g.selectAll('.dot')
      .data(sets)
      .join('circle')
      .attr('cx', (_, i) => x(`세트 ${i + 1}`)! + x.bandwidth() / 2)
      .attr('cy', (d) => lineY(d.averageFormScore))
      .attr('r', 4)
      .attr('fill', '#f59e0b');

    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x))
      .selectAll('text').attr('fill', '#a1a1aa').style('font-size', '11px');

    g.append('g').call(d3.axisLeft(y).ticks(5))
      .selectAll('text').attr('fill', '#a1a1aa').style('font-size', '11px');

    svg.selectAll('.domain, .tick line').attr('stroke', '#3f3f46');
  }, [sets]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">세트별 분석</h3>
      <div className="flex gap-4 text-xs text-zinc-500 mb-2">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> 횟수</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full inline-block" /> 자세 점수</span>
      </div>
      <svg ref={svgRef} width="360" height="200" className="w-full" />
    </div>
  );
}
