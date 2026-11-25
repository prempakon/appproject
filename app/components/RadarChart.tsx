import React from 'react';

interface RadarChartProps {
  labels: string[];
  values: number[];
  size?: number;
  color?: string;
  fillColor?: string;
  showValues?: boolean;
}

const VIEW_W = 460;
const VIEW_H = 340;
const CX = 230;
const CY = 170;
const MAX_RADIUS = 115;
const LABEL_RADIUS = 132;
const LABEL_FONT = 13;

export default function RadarChart({
  labels,
  values,
  color = '#2563eb',
  fillColor = 'rgba(37, 99, 235, 0.18)',
  showValues = true,
}: RadarChartProps) {
  const count = Math.max(3, Math.min(labels.length, values.length));
  const angleStep = (Math.PI * 2) / count;

  const pointAt = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return {
      x: CX + Math.cos(angle) * MAX_RADIUS * ratio,
      y: CY + Math.sin(angle) * MAX_RADIUS * ratio,
    };
  };

  const labelPointAt = (index: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return {
      x: CX + Math.cos(angle) * LABEL_RADIUS,
      y: CY + Math.sin(angle) * LABEL_RADIUS,
      cos: Math.cos(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = Array.from({ length: count }).map((_, index) => {
    const value = Math.max(0, Math.min(100, values[index] ?? 0));
    return pointAt(index, value / 100);
  });
  const polygon = dataPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="กราฟเรดาร์แสดงระดับทักษะ 6 มิติ"
      className="h-auto w-full overflow-visible"
    >
      {gridLevels.map((level) => {
        const points = Array.from({ length: count })
          .map((_, index) => {
            const point = pointAt(index, level);
            return `${point.x},${point.y}`;
          })
          .join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill={level === 1 ? '#f8fafc' : 'none'}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {Array.from({ length: count }).map((_, index) => {
        const outer = pointAt(index, 1);
        const lp = labelPointAt(index);
        const labelText = labels[index] ?? '';
        const anchor = lp.cos > 0.1 ? 'start' : lp.cos < -0.1 ? 'end' : 'middle';
        return (
          <g key={labelText || index}>
            <line x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="#e2e8f0" strokeWidth={1} />
            <text
              x={lp.x}
              y={lp.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={LABEL_FONT}
              fontWeight={600}
              fill="#334155"
            >
              {labelText}
            </text>
            {showValues && (
              <text
                x={dataPoints[index].x}
                y={dataPoints[index].y - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={color}
              >
                {Math.round(values[index] ?? 0)}
              </text>
            )}
          </g>
        );
      })}

      <polygon points={polygon} fill={fillColor} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {dataPoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={4.5} fill="#ffffff" stroke={color} strokeWidth={2.5} />
      ))}
    </svg>
  );
}
