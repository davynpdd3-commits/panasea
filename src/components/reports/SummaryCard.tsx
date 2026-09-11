import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
}

export default function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="p-4 bg-white rounded shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
