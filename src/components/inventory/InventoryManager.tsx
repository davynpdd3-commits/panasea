"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { LowStockBadge, StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatQuantity } from "@/lib/inventory/unit-conversion";

interface Unit {
  id: string;
  name: string;
  symbol: string;
}
interface Ingredient {
  id: string;
  name: string;
  sku: string | null;
  cost?: number | null;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  isLow: boolean;
  unit: Unit;
}

type StatusFilter = "all" | "active" | "inactive" | "low";
interface FormState {
  name: string;
  sku: string;
  unitId: string;
  cost: string;
  minimumStock: string;
  initialStock: string;
}
const emptyForm = (defaultUnitId: string): FormState => ({
  name: "",
  sku: "",
  unitId: defaultUnitId,
  cost: "",
  minimumStock: "0",
  initialStock: "",
});

export function InventoryManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; items: Ingredient[]; total: number }
  >({ status: "loading" });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<{ units: Unit[] }>("/api/units").then((d) => setUnits(d.units)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const data = await apiRequest<{ items: Ingredient[]; total: number }>(`/api/ingredients?${params}`);
      setState({ status: "success", items: data.items, total: data.total });
    } catch (err) {
      setState({ status: "error", message: (err as ApiClientError).message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, page]);

  function openCreate() {
    setForm(emptyForm(units[0]?.id ?? ""));
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleCreate() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await apiRequest("/api/ingredients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          unitId: form.unitId,
          cost: form.cost !== "" ? Number(form.cost) : undefined,
          minimumStock: Number(form.minimumStock || 0),
          initialStock: form.initialStock === "" ? undefined : Number(form.initialStock),
        }),
      });
      showToast("Bahan baku berhasil ditambahkan.");
      setModalOpen(false);
      load();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setFieldErrors(Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Cari bahan baku..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }} className="w-44">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="low">Stok Menipis</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={units.length === 0}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Bahan Baku
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingState label="Memuat inventori..." />}
      {state.status === "error" && <ErrorState title="Gagal memuat inventori" message={state.message} onRetry={load} />}
      {state.status === "success" && state.items.length === 0 && (
        <EmptyState
          title={status === "low" ? "Tidak ada bahan baku dengan stok menipis." : "Belum ada bahan baku."}
          description={status === "low" ? undefined : "Tambahkan bahan baku untuk mulai mencatat stok."}
          action={canManage && status !== "low" ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" strokeWidth={2} /> Tambah Bahan Baku</Button> : undefined}
        />
      )}
      {state.status === "success" && state.items.length > 0 && (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-subtle">
                <th className="py-2 font-medium">Bahan Baku</th>
                <th className="py-2 font-medium">Stok Saat Ini</th>
                <th className="py-2 font-medium">Stok Minimum</th>
                <th className="py-2 font-medium">Biaya / Satuan</th>
                <th className="py-2 font-medium">Kondisi</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((ingredient) => (
                <tr key={ingredient.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-ink">{ingredient.name}</td>
                  <td className="py-2.5 text-ink-muted">{formatQuantity(ingredient.currentStock, ingredient.unit.symbol)}</td>
                  <td className="py-2.5 text-ink-muted">{formatQuantity(ingredient.minimumStock, ingredient.unit.symbol)}</td>
                  <td className="py-2.5 text-ink-muted">
                    {ingredient.cost != null
                      ? `Rp ${ingredient.cost.toLocaleString("id-ID")} / ${ingredient.unit.symbol}`
                      : "—"}
                  </td>
                  <td className="py-2.5"><LowStockBadge isLow={ingredient.isLow} /></td>
                  <td className="py-2.5"><StatusBadge active={ingredient.isActive} /></td>
                  <td className="py-2.5">
                    <Link href={`/inventory/${ingredient.id}`} className="text-sm text-coffee-600 hover:underline">Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <Pagination page={page} pageSize={pageSize} total={state.total} onPageChange={setPage} />
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Bahan Baku">
        <div className="flex flex-col gap-4">
          <Input label="Nama Bahan Baku" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErrors.name} disabled={submitting} required />
          <Select label="Satuan" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} error={fieldErrors.unitId} disabled={submitting}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </Select>
          <Input label="Biaya per Satuan (Rp, opsional)" type="number" min={0} step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} error={fieldErrors.cost} disabled={submitting} placeholder="Contoh: 15000" />
          <Input label="Stok Minimum" type="number" min={0} step="any" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} error={fieldErrors.minimumStock} disabled={submitting} />
          <Input label="Stok Awal (opsional)" type="number" min={0} step="any" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} disabled={submitting} />
          <Input label="SKU (opsional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} error={fieldErrors.sku} disabled={submitting} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>Batal</Button>
          <Button size="sm" onClick={handleCreate} disabled={submitting || !form.name.trim() || !form.unitId}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
