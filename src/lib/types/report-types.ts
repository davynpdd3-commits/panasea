export interface ReportSummary {
  revenue: number;
  transactionCount: number;
  avgTransaction: number;
  totalItemsSold: number;
}

export interface DailySale {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentBreakdownItem {
  method: string;
  amount: number;
}

export interface ReportResponse {
  summary: ReportSummary;
  daily: DailySale[];
  topProducts: TopProduct[];
  paymentBreakdown: PaymentBreakdownItem[];
  statusCounts: Record<string, number>;
}
