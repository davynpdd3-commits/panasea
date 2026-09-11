"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  unitId: string;
  cost?: number | null;
  unit: Unit;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  isLow: boolean;
}
interface Movement {
  id: string;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  note: string | null;
  createdAt: string;
  unit: Unit;
  createdBy: { name: string };
}

const REASON_OPTIONS = [
  { value: "DAMAGED", label: "Rusak" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
  { value: "WASTE", label: "Terbuang" },
  { value: "COUNTING_CORRECTION", label: "Koreksi hitung fisik" },
  { value: "SYSTEM_CORRECTION", label: "Koreksi sistem" },
];

const MOVEMENT_LABELS: Record<Movement["type"], string> = {
  STOCK_IN: "Stok Masuk",
  STOCK_OUT: "Stok Keluar",
  ADJUSTMENT_IN: "Penyesuaian (+)",
  ADJUSTMENT_OUT: "Penyesuaian (-)",
};
const INCREASING = new Set(["STOCK_IN", "ADJUSTMENT_IN"]);

export function IngredientDetailManager({ ingredientId, canManage }: { ingredientId: string; canManage: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: Ingredient }
  >({ status: "loading" });
  const [units, setUnits] = useState<Unit[]>([]);

  const [editForm, setEditForm] = useState({ name: "", sku: "", unitId: "", cost: "", minimumStock: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ direction: "IN", quantity: "", reason: "DAMAGED", note: "" });
  const [adjustErrors, setAdjustErrors] = useState<Record<string, string>>({});
  const [adjusting, setAdjusting] = useState(false);

  const [movements, setMovements] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; items: Movement[]; total: number }
  >({ status: "loading" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setState({ status: "loading" });
    try {
      const data = await apiRequest<{ ingredient: Ingredient }>(`/api/ingredients/${ingredientId}`);
      setState({ status: "success", data: data.ingredient });
      setEditForm({
        name: data.ingredient.name,
        sku: data.ingredient.sku ?? "",
        unitId: data.ingredient.unitId,
        cost: data.ingredient.cost != null ? String(data.ingredient.cost) : "",
        minimumStock: String(data.ingredient.minimumStock),
      });
    } catch (err) {
      setState({ status: "error", message: (err as ApiClientError).message });
    }
  }

  async function loadMovements() {
    setMovements({ status: "loading" });
    try {
      const data = await apiRequest<{ items: Movement[]; total: number }>(
        `/api/ingredients/${ingredientId}/movements?page=${page}&pageSize=${pageSize}`
      );
      setMovements({ status: "success", items: data.items, total: data.total });
    } catch (err) {
      setMovements({ status: "error", message: (err as ApiClientError).message });
    }
  }

  useEffect(() => {
    load();
    apiRequest<{ units: Unit[] }>("/api/units").then((d) => setUnits(d.units)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientId]);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientId, page]);

  async function handleSaveEdit() {
    setSavingEdit(true);
    setEditErrors({});
    try {
      await apiRequest(`/api/ingredients/${ingredientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          sku: editForm.sku,
          unitId: editForm.unitId,
          cost: editForm.cost !== "" ? Number(editForm.cost) : null,
          minimumStock: Number(editForm.minimumStock),
        }),
      });
      showToast("Bahan baku berhasil diperbarui.");
      setEditModalOpen(false);
      load();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setEditErrors(Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiRequest(`/api/ingredients/${ingredientId}`, { method: "DELETE" });
      showToast("Bahan baku berhasil dihapus.");
      router.push("/inventory");
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive() {
    if (state.status !== "success") return;
    try {
      await apiRequest(`/api/ingredients/${ingredientId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !state.data.isActive }),
      });
      showToast(state.data.isActive ? "Bahan baku dinonaktifkan." : "Bahan baku diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  function openAdjustModal() {
    setAdjustForm({ direction: "IN", quantity: "", reason: "DAMAGED", note: "" });
    setAdjustErrors({});
    setAdjustModalOpen(true);
  }

  async function handleAdjust() {
    setAdjusting(true);
    setAdjustErrors({});
    try {
      await apiRequest(`/api/ingredients/${ingredientId}/adjust`, {
        method: "POST",
        body: JSON.stringify({
          direction: adjustForm.direction,
          quantity: Number(adjustForm.quantity),
          reason: adjustForm.reason,
          note: adjustForm.note,
        }),
      });
      showToast("Penyesuaian stok berhasil disimpan.");
      setAdjustModalOpen(false);
      load();
      setPage(1);
      loadMovements();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setAdjustErrors(Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setAdjusting(false);
    }
  }

  if (state.status === "loading") return <LoadingState label="Memuat bahan baku..." />;
  if (state.status === "error") return <ErrorState title="Gagal memuat bahan baku" message={state.message} onRetry={load} />;

  const ingredient = state.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/inventory" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Kembali ke Inventori
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">{ingredient.name}</h1>
        <div className="flex items-center gap-3">
          <LowStockBadge isLow={ingredient.isLow} />
          <StatusBadge active={ingredient.isActive} />
        </div>
      </div>

      <section className="border-b border-border pb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-subtle">Stok Saat Ini</dt>
            <dd className="mt-0.5 text-lg text-ink">{formatQuantity(ingredient.currentStock, ingredient.unit.symbol)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Stok Minimum</dt>
            <dd className="mt-0.5 text-lg text-ink">{formatQuantity(ingredient.minimumStock, ingredient.unit.symbol)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Biaya per Satuan</dt>
            <dd className="mt-0.5 text-lg text-ink">
              {ingredient.cost != null
                ? `Rp ${ingredient.cost.toLocaleString("id-ID")} / ${ingredient.unit.symbol}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">SKU</dt>
            <dd className="mt-0.5 text-lg text-ink">{ingredient.sku || "—"}</dd>
          </div>
        </dl>
        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={openAdjustModal}>Sesuaikan Stok</Button>
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>Edit Info</Button>
            <Button variant="secondary" size="sm" onClick={toggleActive}>
              {ingredient.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              Hapus
            </Button>
          </div>
        )}
      </section>

      <section className="py-6">
        <h2 className="mb-3 text-sm font-medium text-ink">Riwayat Pergerakan Stok</h2>
        {movements.status === "loading" && <LoadingState label="Memuat riwayat..." />}
        {movements.status === "error" && <ErrorState title="Gagal memuat riwayat" message={movements.message} onRetry={loadMovements} />}
        {movements.status === "success" && movements.items.length === 0 && (
          <EmptyState title="Belum ada riwayat pergerakan stok." />
        )}
        {movements.status === "success" && movements.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-ink-subtle">
                  <th className="py-2 font-medium">Tanggal</th>
                  <th className="py-2 font-medium">Tipe</th>
                  <th className="py-2 font-medium">Jumlah</th>
                  <th className="py-2 font-medium">Catatan</th>
                  <th className="py-2 font-medium">Oleh</th>
                </tr>
              </thead>
              <tbody>
                {movements.items.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-ink-muted">{new Date(m.createdAt).toLocaleString("id-ID")}</td>
                    <td className="py-2.5 text-ink">{MOVEMENT_LABELS[m.type]}</td>
                    <td className={`py-2.5 ${INCREASING.has(m.type) ? "text-success" : "text-danger"}`}>
                      {INCREASING.has(m.type) ? "+" : "-"}{formatQuantity(m.quantity, m.unit.symbol)}
                    </td>
                    <td className="py-2.5 text-ink-muted">{m.note || "—"}</td>
                    <td className="py-2.5 text-ink-muted">{m.createdBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <Pagination page={page} pageSize={pageSize} total={movements.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Bahan Baku">
        <div className="flex flex-col gap-4">
          <Input label="Nama" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} error={editErrors.name} disabled={savingEdit} required />
          <Select label="Satuan" value={editForm.unitId} onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })} error={editErrors.unitId} disabled={savingEdit}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </Select>
          <Input label="Biaya per Satuan (Rp, opsional)" type="number" min={0} step="any" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} error={editErrors.cost} disabled={savingEdit} placeholder="Contoh: 15000" />
          <Input label="Stok Minimum" type="number" min={0} step="any" value={editForm.minimumStock} onChange={(e) => setEditForm({ ...editForm, minimumStock: e.target.value })} error={editErrors.minimumStock} disabled={savingEdit} />
          <Input label="SKU (opsional)" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} error={editErrors.sku} disabled={savingEdit} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={savingEdit}>Batal</Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editForm.name.trim()}>
            {savingEdit ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>

      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Hapus Bahan Baku">
        <p className="text-sm text-ink-muted">
          Apakah Anda yakin ingin menghapus bahan baku <strong className="text-ink">{ingredient.name}</strong>?
          Bahan baku yang sudah memiliki riwayat stok tidak dapat dihapus (gunakan opsi Nonaktifkan).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Batal
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Menghapus..." : "Hapus Bahan Baku"}
          </Button>
        </div>
      </Modal>

      <Modal open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Sesuaikan Stok">
        <div className="mb-3 text-sm text-ink-muted">
          Stok saat ini: <span className="text-ink">{formatQuantity(ingredient.currentStock, ingredient.unit.symbol)}</span>
        </div>
        <div className="flex flex-col gap-4">
          <Select label="Arah Penyesuaian" value={adjustForm.direction} onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value })} disabled={adjusting}>
            <option value="IN">Tambah Stok (+)</option>
            <option value="OUT">Kurangi Stok (-)</option>
          </Select>
          <Input
            label={`Jumlah (${ingredient.unit.symbol})`}
            type="number"
            min={0}
            step="any"
            value={adjustForm.quantity}
            onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
            error={adjustErrors.quantity}
            disabled={adjusting}
            required
          />
          <Select label="Alasan" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} error={adjustErrors.reason} disabled={adjusting}>
            {REASON_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Textarea label="Catatan (opsional)" value={adjustForm.note} onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })} disabled={adjusting} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAdjustModalOpen(false)} disabled={adjusting}>Batal</Button>
          <Button size="sm" onClick={handleAdjust} disabled={adjusting || !adjustForm.quantity}>
            {adjusting ? "Menyimpan..." : "Simpan Penyesuaian"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
