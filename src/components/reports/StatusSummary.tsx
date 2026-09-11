import React from 'react';

interface StatusSummaryProps {
  counts: Record<string, number>;
}

export default function StatusSummary({ counts }: StatusSummaryProps) {
  const entries = Object.entries(counts);
  if (!entries.length) {
    return <p className="text-center">No status data for selected period.</p>;
  }

  return (
    <div className="bg-white rounded shadow-sm p-4">
      <h2 className="mb-2 text-lg font-medium text-ink">Transaction Status Summary</h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {entries.map(([status, count]) => (
          <li key={status} className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600 capitalize">{status}</span>
            <span className="mt-1 text-xl font-semibold text-ink">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
