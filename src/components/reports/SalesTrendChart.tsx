import React from 'react';
import { DailySale } from '@/lib/types/report-types';

interface SalesTrendChartProps {
  data: DailySale[];
}

// Simple SVG line chart – assumes data is sorted by date ascending.
export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  if (!data.length) {
    return <p className="text-center">No sales data for selected period.</p>;
  }

  // Determine dimensions
  const width = 600;
  const height = 300;
  const padding = 40;

  const amounts = data.map((d) => d.amount);
  const maxY = Math.max(...amounts, 0);
  const minY = Math.min(...amounts, 0);
  const yRange = maxY - minY || 1; // avoid divide by zero
  const stepX = (width - 2 * padding) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + ((maxY - d.amount) / yRange) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;

  // Generate X axis labels (date) spaced every N points to avoid crowding
  const labelEvery = Math.ceil(data.length / 5);

  return (
    <div className="overflow-auto bg-white rounded shadow-sm p-4">
      <h2 className="mb-2 text-lg font-medium text-ink">Daily Sales Trend</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" />
        {/* Data line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {/* Points */}
        {data.map((d, i) => {
          const x = padding + i * stepX;
          const y = padding + ((maxY - d.amount) / yRange) * (height - 2 * padding);
          return (
            <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" />
          );
        })}
        {/* X axis labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null;
          const x = padding + i * stepX;
          const y = height - padding + 15;
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize="10" fill="#555">
              {d.date.slice(5)}
            </text>
          );
        })}
        {/* Y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding + p * (height - 2 * padding);
          const value = Math.round(maxY - p * yRange);
          return (
            <text key={idx} x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#555">
              {value}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
