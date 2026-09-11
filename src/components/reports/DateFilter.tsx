"use client"

import { useState, useEffect } from 'react';

interface DateRange {
  from: string;
  to: string;
}

interface DateFilterProps {
  onChange: (range: DateRange) => void;
}

// Helper to format dates as YYYY-MM-DD
const toISO = (d: Date): string => d.toISOString().slice(0,10);

export default function DateFilter({ onChange }: DateFilterProps) {
  const [preset, setPreset] = useState<'today' | 'last7' | 'month' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const applyRange = (from: string, to: string) => {
    onChange({ from, to });
  };

  const handlePreset = (p: typeof preset) => {
    setPreset(p);
    const today = new Date();
    if (p === 'today') {
      const iso = toISO(today);
      applyRange(iso, iso);
    } else if (p === 'last7') {
      const toDate = toISO(today);
      const fromDate = toISO(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
      applyRange(fromDate, toDate);
    } else if (p === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const startISO: string = toISO(start);
      const todayISO: string = toISO(today);
      applyRange(startISO, todayISO);
    }
  };

  // Run preset on mount (today)
  useEffect(() => {
    handlePreset('today');
  }, []);

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      applyRange(customFrom, customTo);
    }
  };

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
      <div className="flex space-x-2">
        <button
          className={`px-3 py-1 rounded ${preset === 'today' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          onClick={() => handlePreset('today')}
        >
          Today
        </button>
        <button
          className={`px-3 py-1 rounded ${preset === 'last7' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          onClick={() => handlePreset('last7')}
        >
          Last 7 Days
        </button>
        <button
          className={`px-3 py-1 rounded ${preset === 'month' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          onClick={() => handlePreset('month')}
        >
          This Month
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="date"
          className="border rounded p-1"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          disabled={preset !== 'custom'}
        />
        <span>to</span>
        <input
          type="date"
          className="border rounded p-1"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          disabled={preset !== 'custom'}
        />
        <button
          className={`px-2 py-1 rounded ${preset === 'custom' ? 'bg-primary text-white' : 'bg-gray-200'}`}
          onClick={() => setPreset('custom')}
        >
          Custom
        </button>
        {preset === 'custom' && (
          <button className="px-3 py-1 bg-primary text-white rounded" onClick={handleCustomApply}>
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
