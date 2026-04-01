import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { AsymmetryDetails, SetData } from '../../types/analysis';

interface BodyDiagramProps {
  sets: SetData[];
  asymmetryDetails?: AsymmetryDetails;
}

interface BodyPart {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  asymValue: number;
}

function getStatus(asym: number): { color: string } {
  if (asym >= 15) return { color: '#ef4444' };
  if (asym >= 5) return { color: '#eab308' };
  return { color: '#22c55e' };
}

function getBiasLabel(bias: number): string {
  if (Math.abs(bias) < 0.3) return '균등';
  return bias > 0 ? '오른쪽이 더 낮음' : '왼쪽이 더 낮음';
}

function getBiasArrow(bias: number): string {
  if (Math.abs(bias) < 0.3) return '=';
  return bias > 0 ? 'R↓' : 'L↓';
}

const DEFAULT_DETAILS: AsymmetryDetails = {
  shoulder: 0, elbow: 0, hip: 0,
  shoulderBias: 0, elbowBias: 0, hipBias: 0,
  kneeGap: 0, elbowWidth: 0, elbowWidthBias: 0,
};

export function BodyDiagram({ sets, asymmetryDetails }: BodyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const d = asymmetryDetails ?? DEFAULT_DETAILS;

  // 다리 간격을 0-15 스케일로 변환 (140% 이하는 정상, 초과분만 반영)
  const kneeGapScaled = Math.max(0, d.kneeGap - 140) / 10;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const colorScale = d3.scaleLinear<string>()
      .domain([0, 5, 15]).range(['#22c55e', '#eab308', '#ef4444']).clamp(true);

    // 머리
    svg.append('ellipse').attr('cx', 100).attr('cy', 25).attr('rx', 16).attr('ry', 20)
      .attr('fill', '#44403C').attr('stroke', '#57534E');
    // 몸통
    svg.append('rect').attr('x', 68).attr('y', 48).attr('width', 64).attr('height', 70)
      .attr('rx', 8).attr('fill', '#44403C').attr('stroke', '#57534E');
    // 다리 실루엣
    svg.append('rect').attr('x', 72).attr('y', 120).attr('width', 22).attr('height', 50)
      .attr('rx', 4).attr('fill', '#44403C').attr('stroke', '#57534E');
    svg.append('rect').attr('x', 106).attr('y', 120).attr('width', 22).attr('height', 50)
      .attr('rx', 4).attr('fill', '#44403C').attr('stroke', '#57534E');

    const bodyParts: BodyPart[] = [
      { id: 'shoulder-l', x: 55, y: 50, width: 28, height: 18, asymValue: d.shoulder },
      { id: 'shoulder-r', x: 117, y: 50, width: 28, height: 18, asymValue: d.shoulder },
      { id: 'arm-l', x: 40, y: 72, width: 18, height: 45, asymValue: Math.max(d.elbow, d.elbowWidth) },
      { id: 'arm-r', x: 142, y: 72, width: 18, height: 45, asymValue: Math.max(d.elbow, d.elbowWidth) },
      { id: 'back-l', x: 72, y: 72, width: 28, height: 45, asymValue: d.hip },
      { id: 'back-r', x: 100, y: 72, width: 28, height: 45, asymValue: d.hip },
      { id: 'leg-l', x: 74, y: 122, width: 18, height: 46, asymValue: kneeGapScaled },
      { id: 'leg-r', x: 108, y: 122, width: 18, height: 46, asymValue: kneeGapScaled },
    ];

    bodyParts.forEach((part) => {
      svg.append('rect')
        .attr('x', part.x).attr('y', part.y)
        .attr('width', part.width).attr('height', part.height)
        .attr('rx', 4).attr('fill', colorScale(part.asymValue)).attr('opacity', 0.6);
    });

    // 범례
    const legend = svg.append('g').attr('transform', 'translate(10, 182)');
    [
      { color: '#22c55e', label: '양호' },
      { color: '#eab308', label: '주의' },
      { color: '#ef4444', label: '불균형' },
    ].forEach((item, i) => {
      legend.append('rect').attr('x', i * 65).attr('y', 0).attr('width', 10).attr('height', 10)
        .attr('rx', 2).attr('fill', item.color);
      legend.append('text').attr('x', i * 65 + 14).attr('y', 9)
        .attr('fill', '#A8A29E').attr('font-size', '10px').text(item.label);
    });
  }, [sets, d, kneeGapScaled]);

  // 감점 계산 (가중치 합 = 10)
  const items = [
    {
      label: '어깨 높이', weight: '20%', asym: d.shoulder, deduction: d.shoulder * 2,
      bias: d.shoulderBias, biasType: 'height' as const,
    },
    {
      label: '팔꿈치 높이', weight: '15%', asym: d.elbow, deduction: d.elbow * 1.5,
      bias: d.elbowBias, biasType: 'height' as const,
    },
    {
      label: '골반', weight: '10%', asym: d.hip, deduction: d.hip * 1.0,
      bias: d.hipBias, biasType: 'height' as const,
    },
    {
      label: '팔꿈치 너비', weight: '25%', asym: d.elbowWidth, deduction: d.elbowWidth * 2.5,
      bias: d.elbowWidthBias, biasType: 'width' as const,
    },
    {
      label: '다리 반동', weight: '30%', asym: d.kneeGap, deduction: (Math.max(0, d.kneeGap - 140) / 10) * 3,
      bias: 0, biasType: 'gap' as const,
    },
  ];

  const totalDeduction = items.reduce((sum, i) => sum + i.deduction, 0);

  return (
    <div className="bg-stone-800 rounded-2xl p-4 border border-amber-500/10">
      <h3 className="text-sm font-semibold text-stone-300 mb-2">신체 밸런스</h3>
      <svg ref={svgRef} viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto" />

      {asymmetryDetails && (
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">감점 내역</h4>
          {items.map((item) => {
            const status = getStatus(
              item.biasType === 'gap' ? Math.max(0, item.asym - 140) / 10 : item.asym,
            );

            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-stone-300">{item.label}</span>
                    <span className="text-stone-500">({item.weight})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">
                      {item.biasType === 'gap'
                        ? `간격 ${item.asym.toFixed(0)}%`
                        : `비대칭 ${item.asym.toFixed(1)}%`}
                    </span>
                    <span className="text-amber-400 font-medium">
                      -{item.deduction.toFixed(1)}점
                    </span>
                  </div>
                </div>

                {/* 방향 정보 */}
                {item.biasType === 'height' && Math.abs(item.bias) >= 0.3 && (
                  <div className="flex items-center gap-1.5 ml-4 text-[10px]">
                    <span className={`font-mono font-bold ${item.bias > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {getBiasArrow(item.bias)}
                    </span>
                    <span className="text-stone-500">
                      {getBiasLabel(item.bias)} (평균 {Math.abs(item.bias).toFixed(1)}%)
                    </span>
                  </div>
                )}
                {item.biasType === 'width' && Math.abs(item.bias) >= 0.3 && (
                  <div className="flex items-center gap-1.5 ml-4 text-[10px]">
                    <span className={`font-mono font-bold ${item.bias > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {item.bias > 0 ? 'R→' : 'L→'}
                    </span>
                    <span className="text-stone-500">
                      {item.bias > 0 ? '오른쪽이 더 벌어짐' : '왼쪽이 더 벌어짐'} (평균 {Math.abs(item.bias).toFixed(1)}%)
                    </span>
                  </div>
                )}
                {item.biasType === 'gap' && item.asym > 140 && (
                  <div className="flex items-center gap-1.5 ml-4 text-[10px]">
                    <span className="font-mono font-bold text-orange-400">!</span>
                    <span className="text-stone-500">
                      다리 반동 없이 자연스럽게 늘어뜨리세요
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t border-stone-700 pt-1 flex justify-between text-xs">
            <span className="text-stone-400">합계</span>
            <span className="text-amber-400 font-semibold">
              -{totalDeduction.toFixed(1)}점
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
