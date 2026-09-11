import React from 'react';
import { TopProduct } from '@/lib/types/report-types';

interface TopProductsTableProps {
  products: TopProduct[];
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  if (!products.length) {
    return <p className="text-center">No product data for selected period.</p>;
  }

  return (
    <div className="bg-white rounded shadow-sm p-4 overflow-x-auto">
      <h2 className="mb-2 text-lg font-medium text-ink">Top Selling Products</h2>
      <table className="min-w-full table-auto">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Product</th>
            <th className="px-4 py-2 text-right">Quantity Sold</th>
            <th className="px-4 py-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId} className="border-t">
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2 text-right">{p.quantitySold}</td>
              <td className="px-4 py-2 text-right">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(p.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
