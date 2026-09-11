// src/components/reports/ReportsDashboard.tsx
"use client"

import { useEffect, useState } from 'react';
import { ReportResponse } from '@/lib/types/report-types';
import DateFilter from '@/components/reports/DateFilter';
import SummaryCard from '@/components/reports/SummaryCard';
import SalesTrendChart from '@/components/reports/SalesTrendChart';
import TopProductsTable from '@/components/reports/TopProductsTable';
import PaymentBreakdownChart from '@/components/reports/PaymentBreakdownChart';
import StatusSummary from '@/components/reports/StatusSummary';

// Helper to format IDR currency
const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);

export default function ReportsDashboard() {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (fromDate: string, toDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/sales?from=${fromDate}&to=${toDate}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }
      const json = (await res.json()) as ReportResponse;
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load – default to today
  useEffect(() => {
    const today = new Date();
    const iso: string = today.toISOString().slice(0, 10);
    setFrom(iso);
    setTo(iso);
  }, []);

  // When from/to change trigger fetch
  useEffect(() => {
    if (from && to) {
      fetchReport(from, to);
    }
  }, [from, to]);

  const handleFilterChange = (range: { from: string; to: string }) => {
    setFrom(range.from);
    setTo(range.to);
  };

  return (
    <div className="space-y-8">
      <DateFilter onChange={handleFilterChange} />
      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Revenue" value={formatIDR(data.summary.revenue)} />
            <SummaryCard title="Transaction Count" value={data.summary.transactionCount.toString()} />
            <SummaryCard title="Avg Transaction" value={formatIDR(data.summary.avgTransaction)} />
            <SummaryCard title="Items Sold" value={data.summary.totalItemsSold.toString()} />
          </div>
          <SalesTrendChart data={data.daily} />
          <TopProductsTable products={data.topProducts} />
          <PaymentBreakdownChart data={data.paymentBreakdown} />
          <StatusSummary counts={data.statusCounts} />
        </>
      )}
      {!loading && !error && !data && (
        <p className="text-center">No data for selected period.</p>
      )}
    </div>
  );
}
