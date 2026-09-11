import { Badge } from "./badge";

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "success" : "neutral"}>{active ? "Aktif" : "Nonaktif"}</Badge>
  );
}

export function LowStockBadge({ isLow }: { isLow: boolean }) {
  if (!isLow) return <Badge tone="success">Aman</Badge>;
  return <Badge tone="warning">Stok Menipis</Badge>;
}
