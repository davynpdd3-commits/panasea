import React from 'react';
import { PaymentBreakdownItem } from '@/lib/types/report-types';

interface PaymentBreakdownChartProps {
  data: PaymentBreakdownItem[];
}

// Simple SVG donut chart – shows proportion of each method
export default function PaymentBreakdownChart({ data }: PaymentBreakdownChartProps) {
  if (!data.length) {
    return <p className="text-center">No payment breakdown data for selected period.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0) || 1; // avoid zero division
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  return (
    <div className="bg-white rounded shadow-sm p-4">
      <h2 className="mb-2 text-lg font-medium text-ink">Payment Method Breakdown</h2>
      <div className="flex items-center justify-center">
        <svg width={200} height={200} viewBox="0 0 200 200">
          {data.map((item, i) => {
            const value = (item.amount / total) * 100;
            const offset = (cumulative / total) * circumference;
            cumulative += item.amount;
            return (
              <circle
                key={i}
                r={radius}
                cx={100}
                cy={100}
                fill="transparent"
                stroke={colors[i % colors.length]}
                strokeWidth={30}
                strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <ul className="ml-4 space-y-1">
          {data.map((item, i) => (
            <li key={i} className="flex items-center">
              <span
                className="inline-block w-3 h-3 mr-2 rounded"
                style={{ backgroundColor: colors[i % colors.length] }}
              ></span>
              <span className="capitalize">{item.method}</span>: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
