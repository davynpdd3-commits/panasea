"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Edit, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatQuantity } from "@/lib/inventory/unit-conversion";

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface IngredientOption {
  id: string;
  name: string;
  cost?: number | null;
  unit: Unit;
}

interface RecipeItem {
  id: string;
  quantity: number;
  ingredient: {
    id: string;
    name: string;
    cost?: number | null;
    unit: Unit;
  };
}

interface RecipeDetail {
  id: string;
  name: string;
  productId: string;
  variantId: string | null;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    price: number;
    variants?: Array<{ id: string; name: string; price: number }>;
  };
  variant: {
    id: string;
    name: string;
    price: number;
  } | null;
  items: RecipeItem[];
  hpp: number;
}

interface ItemRow {
  ingredientId: string;
  quantity: string;
}

export function RecipeDetailManager({
  recipeId,
  canManage,
}: {
  recipeId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [allIngredients, setAllIngredients] = useState<IngredientOption[]>([]);
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editItemRows, setEditItemRows] = useState<ItemRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadRecipe() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiRequest<{ recipe: RecipeDetail }>(`/api/recipes/${recipeId}`);
      setRecipe(data.recipe);
    } catch (err) {
      setErrorMessage((err as ApiClientError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  async function openEditModal() {
    if (!recipe) return;
    setEditError(null);
    setEditName(recipe.name);
    setEditIsActive(recipe.isActive);
    setEditItemRows(
      recipe.items.map((it) => ({
        ingredientId: it.ingredient.id,
        quantity: String(it.quantity),
      }))
    );
    setEditModalOpen(true);

    try {
      const ingRes = await apiRequest<{ items: IngredientOption[] }>(
        "/api/ingredients?pageSize=100&status=active"
      );
      setAllIngredients(ingRes.items);
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  function addEditItemRow() {
    if (allIngredients.length === 0 || !allIngredients[0]) return;
    setEditItemRows([...editItemRows, { ingredientId: allIngredients[0].id, quantity: "1" }]);
  }

  function removeEditItemRow(index: number) {
    setEditItemRows(editItemRows.filter((_, i) => i !== index));
  }

  function updateEditItemRow(index: number, field: keyof ItemRow, value: string) {
    setEditItemRows(
      editItemRows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  // Live preview HPP in Edit Modal
  const editCalculatedHpp = editItemRows.reduce((sum, row) => {
    const ing = allIngredients.find((i) => i.id === row.ingredientId);
    const cost = ing?.cost ?? 0;
    const qty = parseFloat(row.quantity) || 0;
    return sum + qty * cost;
  }, 0);

  async function handleSaveEdit() {
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Nama resep wajib diisi.");
      return;
    }
    if (editItemRows.length === 0) {
      setEditError("Resep harus memiliki minimal 1 bahan baku.");
      return;
    }

    for (const row of editItemRows) {
      const q = parseFloat(row.quantity);
      if (isNaN(q) || q <= 0) {
        setEditError("Jumlah setiap bahan baku harus lebih besar dari 0.");
        return;
      }
    }

    setSavingEdit(true);
    try {
      await apiRequest(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          isActive: editIsActive,
          items: editItemRows.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: parseFloat(r.quantity),
          })),
        }),
      });

      showToast("Resep berhasil diperbarui.");
      setEditModalOpen(false);
      loadRecipe();
    } catch (err) {
      setEditError((err as ApiClientError).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive() {
    if (!recipe) return;
    try {
      await apiRequest(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !recipe.isActive }),
      });
      showToast(recipe.isActive ? "Resep dinonaktifkan." : "Resep diaktifkan.");
      loadRecipe();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiRequest(`/api/recipes/${recipeId}`, { method: "DELETE" });
      showToast("Resep berhasil dihapus.");
      router.push("/recipes");
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState label="Memuat detail resep..." />;
  if (errorMessage) return <ErrorState title="Gagal memuat resep" message={errorMessage} onRetry={loadRecipe} />;
  if (!recipe) return null;

  const sellingPrice = recipe.variant ? recipe.variant.price : recipe.product.price;
  const marginRp = sellingPrice - recipe.hpp;
  const marginPercent = sellingPrice > 0 ? Math.round((marginRp / sellingPrice) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/recipes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Resep
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-ink">{recipe.name}</h1>
            <StatusBadge active={recipe.isActive} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Produk: <strong className="text-ink">{recipe.product.name}</strong>
            {recipe.variant && (
              <span className="ml-2 rounded bg-coffee-100 px-2 py-0.5 text-xs font-medium text-coffee-800">
                Varian {recipe.variant.name}
              </span>
            )}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openEditModal}>
              <Edit className="h-4 w-4" /> Edit Resep
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleActive}>
              {recipe.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Financial & HPP Overview Card */}
      <section className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-3">
        <div className="border-b border-border pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
            Estimasi HPP per Porsi
          </span>
          <div className="mt-1 text-2xl font-bold text-ink">
            Rp {recipe.hpp.toLocaleString("id-ID")}
          </div>
          <span className="text-xs text-ink-muted">
            Formula: Σ (takaran × biaya bahan)
          </span>
        </div>

        <div className="border-b border-border pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
            Harga Jual Produk
          </span>
          <div className="mt-1 text-2xl font-bold text-coffee-700">
            Rp {sellingPrice.toLocaleString("id-ID")}
          </div>
          <span className="text-xs text-ink-muted">
            {recipe.variant ? `Varian ${recipe.variant.name}` : "Harga menu utama"}
          </span>
        </div>

        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
            Estimasi Laba Kotor (Margin)
          </span>
          <div className={`mt-1 text-2xl font-bold ${marginRp >= 0 ? "text-success" : "text-danger"}`}>
            Rp {marginRp.toLocaleString("id-ID")}
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Margin: {marginPercent}% dari harga jual
          </span>
        </div>
      </section>

      {/* Recipe Items Table */}
      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-base text-ink">Komposisi Bahan Baku (Per 1 Porsi)</h2>
          <p className="text-xs text-ink-muted">
            Bahan baku ini akan otomatis dipotong dari stok inventori saat pesanan selesai dibayar.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-ink-subtle">
                <th className="px-5 py-3 font-medium">Bahan Baku</th>
                <th className="px-5 py-3 font-medium">Takaran Konsumsi</th>
                <th className="px-5 py-3 font-medium">Biaya per Satuan</th>
                <th className="px-5 py-3 font-medium text-right">Subtotal HPP</th>
              </tr>
            </thead>
            <tbody>
              {recipe.items.map((item) => {
                const unitCost = item.ingredient.cost ?? 0;
                const lineHpp = item.quantity * unitCost;

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-muted/20">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      <Link
                        href={`/inventory/${item.ingredient.id}`}
                        className="text-coffee-600 hover:underline"
                      >
                        {item.ingredient.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {formatQuantity(item.quantity, item.ingredient.unit.symbol)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {item.ingredient.cost != null ? (
                        `Rp ${item.ingredient.cost.toLocaleString("id-ID")} / ${item.ingredient.unit.symbol}`
                      ) : (
                        <span className="text-xs text-ink-subtle">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-ink">
                      Rp {Math.round(lineHpp).toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-coffee-50/50 font-medium text-ink">
                <td colSpan={3} className="px-5 py-3.5 text-right">
                  Total HPP per Porsi:
                </td>
                <td className="px-5 py-3.5 text-right text-base font-bold text-coffee-900">
                  Rp {recipe.hpp.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Edit Recipe Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Resep" widthClassName="max-w-2xl">
        <div className="flex flex-col gap-4">
          {editError && (
            <div className="rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-ink-subtle">Produk</label>
              <div className="rounded border border-border bg-surface-muted/50 px-3 py-2 text-sm text-ink">
                {recipe.product.name}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-subtle">Varian</label>
              <div className="rounded border border-border bg-surface-muted/50 px-3 py-2 text-sm text-ink">
                {recipe.variant ? recipe.variant.name : "Semua Varian / Base"}
              </div>
            </div>
          </div>

          <Input
            label="Nama Resep"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={savingEdit}
            required
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                disabled={savingEdit}
                className="h-4 w-4 rounded border-border text-coffee-600 focus:ring-coffee-500"
              />
              Resep Aktif (digunakan untuk auto-deduksi stok saat penjualan)
            </label>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-ink">Bahan Baku & Takaran</label>
              <Button type="button" variant="secondary" size="sm" onClick={addEditItemRow} disabled={savingEdit}>
                <Plus className="h-3.5 w-3.5" /> Tambah Bahan
              </Button>
            </div>

            <div className="space-y-3">
              {editItemRows.map((row, idx) => {
                const selectedIng = allIngredients.find((i) => i.id === row.ingredientId);
                const lineCost = (parseFloat(row.quantity) || 0) * (selectedIng?.cost ?? 0);

                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-2 rounded border border-border bg-surface-muted/20 p-2.5"
                  >
                    <div className="min-w-[180px] flex-1">
                      <label className="mb-1 block text-xs text-ink-subtle">Bahan Baku</label>
                      <Select
                        value={row.ingredientId}
                        onChange={(e) => updateEditItemRow(idx, "ingredientId", e.target.value)}
                        disabled={savingEdit}
                      >
                        {allIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit.symbol})
                            {ing.cost != null ? ` - Rp ${ing.cost.toLocaleString("id-ID")}/${ing.unit.symbol}` : " - Biaya belum diisi"}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-28">
                      <label className="mb-1 block text-xs text-ink-subtle">
                        Jumlah ({selectedIng?.unit.symbol || "satuan"})
                      </label>
                      <Input
                        type="number"
                        step="any"
                        min={0.0001}
                        value={row.quantity}
                        onChange={(e) => updateEditItemRow(idx, "quantity", e.target.value)}
                        disabled={savingEdit}
                      />
                    </div>

                    <div className="w-28 pb-2 text-right text-xs">
                      <span className="text-ink-subtle">Biaya Takaran:</span>
                      <div className="font-medium text-ink">
                        Rp {Math.round(lineCost).toLocaleString("id-ID")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEditItemRow(idx)}
                      disabled={savingEdit || editItemRows.length <= 1}
                      className="rounded p-2 text-ink-subtle hover:bg-danger-50 hover:text-danger disabled:opacity-30"
                      title="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HPP Live Summary */}
          <div className="rounded border border-coffee-200 bg-coffee-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-coffee-900">Total HPP per Porsi:</span>
              <span className="text-xl font-bold text-coffee-900">
                Rp {Math.round(editCalculatedHpp).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={savingEdit}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Hapus Resep">
        <p className="text-sm text-ink-muted">
          Apakah Anda yakin ingin menghapus resep <strong className="text-ink">{recipe.name}</strong>?
          Tindakan ini akan menghapus takaran bahan baku dan perhitungan HPP untuk produk ini.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
            Batal
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Menghapus..." : "Hapus Resep"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
