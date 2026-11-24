import React from 'react';

interface RadarChartProps {
  labels: string[];
  values: number[];
  size?: number;
  color?: string;
  fillColor?: string;
  showValues?: boolean;
}

export default function RadarChart({
  labels,
  values,
  size = 400,
  color = '#2563eb',
  fillColor = 'rgba(37, 99, 235, 0.18)',
  showValues = true,
}: RadarChartProps) {
  const count = Math.max(3, Math.min(labels.length, values.length));
  // viewBox ไม่จำเป็นต้องเป็นสี่เหลี่ยมจัตุรัส: เผื่อพื้นที่แนวนอนมากกว่า
  // เพื่อให้ป้ายชื่อแกนภาษาไทย (ยาวสุด ~15 ตัวอักษร) ไม่ถูกขอบซ้าย/ขวาตัด
  const padX = Math.ceil(size * 0.34);
  const padY = Math.ceil(size * 0.14);
  const viewW = size + padX * 2;
  const viewH = size + padY * 2;
  const centerX = viewW / 2;
  const centerY = viewH / 2;
  const radius = (size - 20) * 0.35;
  const angleStep = (Math.PI * 2) / count;

  const pointAt = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return {
      x: centerX + Math.cos(angle) * radius * ratio,
      y: centerY + Math.sin(angle) * radius * ratio,
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
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label="กราฟเรดาร์แสดงระดับทักษะ 6 มิติ"
      className="h-auto w-full max-w-full"
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
        const labelPoint = pointAt(index, 1.5);
        const anchor = Math.abs(labelPoint.x - centerX) < 8 ? 'middle' : labelPoint.x > centerX ? 'start' : 'end';
        const labelText = labels[index] ?? '';
        // ประเมินความกว้างโดยประมาณ (~11pxต่อตัวอักษรไทยที่ fontSize 10)
        // แล้วจำกัด textLength ไม่ให้เกินพื้นที่ว่างจริงของแต่ละด้าน
        const estWidth = labelText.length * 11;
        const margin = 6;
        const availWidth =
          anchor === 'middle'
            ? 2 * Math.min(labelPoint.x - margin, viewW - margin - labelPoint.x)
            : anchor === 'end'
              ? labelPoint.x - margin
              : viewW - margin - labelPoint.x;
        const cap = Math.min(128, Math.max(24, Math.floor(availWidth)));
        const fitLength = estWidth > cap ? cap : undefined;
        return (
          <g key={labelText || index}>
            <line x1={centerX} y1={centerY} x2={outer.x} y2={outer.y} stroke="#e2e8f0" strokeWidth={1} />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={800}
              fill="#475569"
              textLength={fitLength}
              lengthAdjust={fitLength ? 'spacingAndGlyphs' : undefined}
            >
              {labelText}
            </text>
            {showValues && (
              <text
                x={dataPoints[index].x}
                y={dataPoints[index].y - 8}
                textAnchor="middle"
                fontSize={9}
                fontWeight={800}
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
        <circle key={index} cx={point.x} cy={point.y} r={4} fill="#ffffff" stroke={color} strokeWidth={2.5} />
      ))}
    </svg>
  );
}
