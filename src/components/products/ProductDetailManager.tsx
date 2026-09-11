"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}
interface Variant {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  isActive: boolean;
}
interface Addon {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}
interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  costPrice: number | null;
  isActive: boolean;
  category: { id: string; name: string };
  variants: Variant[];
  addons: { addon: Addon }[];
}

export function ProductDetailManager({ productId, canManage }: { productId: string; canManage: boolean }) {
  const { showToast } = useToast();

  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: ProductDetail }
  >({ status: "loading" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [allAddons, setAllAddons] = useState<Addon[]>([]);

  const [form, setForm] = useState({ name: "", categoryId: "", description: "", sku: "", price: "", costPrice: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savingInfo, setSavingInfo] = useState(false);

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState({ name: "", price: "", sku: "" });
  const [variantErrors, setVariantErrors] = useState<Record<string, string>>({});
  const [savingVariant, setSavingVariant] = useState(false);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<Variant | null>(null);

  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [attachingAddons, setAttachingAddons] = useState(false);

  async function load() {
    setState({ status: "loading" });
    try {
      const data = await apiRequest<{ product: ProductDetail }>(`/api/products/${productId}`);
      setState({ status: "success", data: data.product });
      setForm({
        name: data.product.name,
        categoryId: data.product.category.id,
        description: data.product.description ?? "",
        sku: data.product.sku ?? "",
        price: String(data.product.price),
        costPrice: data.product.costPrice != null ? String(data.product.costPrice) : "",
      });
    } catch (err) {
      setState({ status: "error", message: (err as ApiClientError).message });
    }
  }

  useEffect(() => {
    load();
    apiRequest<{ categories: Category[] }>("/api/categories?status=active").then((d) => setCategories(d.categories)).catch(() => {});
    apiRequest<{ addons: Addon[] }>("/api/addons?status=active").then((d) => setAllAddons(d.addons)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSaveInfo() {
    setSavingInfo(true);
    setFieldErrors({});
    try {
      await apiRequest(`/api/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          categoryId: form.categoryId,
          description: form.description,
          sku: form.sku,
          price: Number(form.price),
          costPrice: form.costPrice === "" ? undefined : Number(form.costPrice),
        }),
      });
      showToast("Informasi produk berhasil disimpan.");
      load();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setFieldErrors(Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setSavingInfo(false);
    }
  }

  async function toggleProductActive() {
    if (state.status !== "success") return;
    try {
      await apiRequest(`/api/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !state.data.isActive }),
      });
      showToast(state.data.isActive ? "Produk dinonaktifkan." : "Produk diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  function openCreateVariant() {
    setEditingVariant(null);
    setVariantForm({ name: "", price: "", sku: "" });
    setVariantErrors({});
    setVariantModalOpen(true);
  }

  function openEditVariant(variant: Variant) {
    setEditingVariant(variant);
    setVariantForm({ name: variant.name, price: String(variant.price), sku: variant.sku ?? "" });
    setVariantErrors({});
    setVariantModalOpen(true);
  }

  async function handleSaveVariant() {
    setSavingVariant(true);
    setVariantErrors({});
    try {
      const payload = { name: variantForm.name, price: Number(variantForm.price), sku: variantForm.sku };
      if (editingVariant) {
        await apiRequest(`/api/products/${productId}/variants/${editingVariant.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("Variant berhasil diperbarui.");
      } else {
        await apiRequest(`/api/products/${productId}/variants`, { method: "POST", body: JSON.stringify(payload) });
        showToast("Variant berhasil ditambahkan.");
      }
      setVariantModalOpen(false);
      load();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setVariantErrors(Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setSavingVariant(false);
    }
  }

  async function toggleVariantActive(variant: Variant) {
    try {
      await apiRequest(`/api/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !variant.isActive }),
      });
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleDeleteVariant() {
    if (!deleteVariantTarget) return;
    try {
      await apiRequest(`/api/products/${productId}/variants/${deleteVariantTarget.id}`, { method: "DELETE" });
      showToast("Variant berhasil dihapus.");
      setDeleteVariantTarget(null);
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  function openAddonModal() {
    setSelectedAddonIds([]);
    setAddonModalOpen(true);
  }

  async function handleAttachAddons() {
    if (selectedAddonIds.length === 0) return;
    setAttachingAddons(true);
    try {
      await apiRequest(`/api/products/${productId}/addons`, {
        method: "POST",
        body: JSON.stringify({ addonIds: selectedAddonIds }),
      });
      showToast("Add-on berhasil ditambahkan ke produk.");
      setAddonModalOpen(false);
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    } finally {
      setAttachingAddons(false);
    }
  }

  async function handleDetachAddon(addonId: string) {
    try {
      await apiRequest(`/api/products/${productId}/addons/${addonId}`, { method: "DELETE" });
      showToast("Add-on dilepas dari produk.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  if (state.status === "loading") return <LoadingState label="Memuat produk..." />;
  if (state.status === "error") return <ErrorState title="Gagal memuat produk" message={state.message} onRetry={load} />;

  const product = state.data;
  const attachedIds = new Set(product.addons.map((pa) => pa.addon.id));
  const availableAddons = allAddons.filter((a) => !attachedIds.has(a.id));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Kembali ke Produk
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">{product.name}</h1>
        <div className="flex items-center gap-3">
          <StatusBadge active={product.isActive} />
          {canManage && (
            <Button variant="secondary" size="sm" onClick={toggleProductActive}>
              {product.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          )}
        </div>
      </div>

      <section className="border-b border-border pb-6">
        <h2 className="mb-3 text-sm font-medium text-ink">Informasi Produk</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nama Produk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErrors.name} disabled={!canManage || savingInfo} />
          <Select label="Kategori" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} error={fieldErrors.categoryId} disabled={!canManage || savingInfo}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Harga (Rp)" type="number" min={0} step={500} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} error={fieldErrors.price} disabled={!canManage || savingInfo} />
          <Input label="HPP (opsional, Rp)" type="number" min={0} step={500} value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} error={fieldErrors.costPrice} disabled={!canManage || savingInfo} />
          <Input label="SKU (opsional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} error={fieldErrors.sku} disabled={!canManage || savingInfo} />
        </div>
        <div className="mt-4">
          <Textarea label="Deskripsi (opsional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!canManage || savingInfo} />
        </div>
        {canManage && (
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={handleSaveInfo} disabled={savingInfo || !form.name.trim()}>
              {savingInfo ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        )}
      </section>

      <section className="border-b border-border py-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Variant</h2>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={openCreateVariant}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Variant
            </Button>
          )}
        </div>
        {product.variants.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada variant — produk ini dijual dengan satu harga tetap.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-subtle">
                <th className="py-2 font-medium">Nama</th>
                <th className="py-2 font-medium">Harga</th>
                <th className="py-2 font-medium">Status</th>
                {canManage && <th className="py-2 font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-ink">{variant.name}</td>
                  <td className="py-2.5 text-ink-muted">{formatRupiah(variant.price)}</td>
                  <td className="py-2.5"><StatusBadge active={variant.isActive} /></td>
                  {canManage && (
                    <td className="py-2.5">
                      <div className="flex gap-3">
                        <button onClick={() => openEditVariant(variant)} className="text-sm text-coffee-600 hover:underline">Edit</button>
                        <button onClick={() => toggleVariantActive(variant)} className="text-sm text-coffee-600 hover:underline">
                          {variant.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button onClick={() => setDeleteVariantTarget(variant)} className="text-sm text-danger hover:underline">Hapus</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="py-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Add-on</h2>
          {canManage && availableAddons.length > 0 && (
            <Button variant="secondary" size="sm" onClick={openAddonModal}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Add-on
            </Button>
          )}
        </div>
        {product.addons.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada add-on untuk produk ini.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {product.addons.map(({ addon }) => (
              <li key={addon.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{addon.name} <span className="text-ink-muted">— {formatRupiah(addon.price)}</span></span>
                {canManage && (
                  <button onClick={() => handleDetachAddon(addon.id)} className="text-sm text-danger hover:underline">Lepas</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={variantModalOpen} onClose={() => setVariantModalOpen(false)} title={editingVariant ? "Edit Variant" : "Tambah Variant"}>
        <div className="flex flex-col gap-4">
          <Input label="Nama Variant" placeholder="Regular / Large" value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} error={variantErrors.name} disabled={savingVariant} required />
          <Input label="Harga (Rp)" type="number" min={0} step={500} value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })} error={variantErrors.price} disabled={savingVariant} required />
          <Input label="SKU (opsional)" value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} error={variantErrors.sku} disabled={savingVariant} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setVariantModalOpen(false)} disabled={savingVariant}>Batal</Button>
          <Button size="sm" onClick={handleSaveVariant} disabled={savingVariant || !variantForm.name.trim() || variantForm.price === ""}>
            {savingVariant ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>

      <Modal open={addonModalOpen} onClose={() => setAddonModalOpen(false)} title="Tambah Add-on">
        <div className="flex flex-col gap-2">
          {availableAddons.map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={selectedAddonIds.includes(addon.id)}
                onChange={(e) =>
                  setSelectedAddonIds((prev) =>
                    e.target.checked ? [...prev, addon.id] : prev.filter((id) => id !== addon.id)
                  )
                }
              />
              {addon.name} — {formatRupiah(addon.price)}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAddonModalOpen(false)} disabled={attachingAddons}>Batal</Button>
          <Button size="sm" onClick={handleAttachAddons} disabled={attachingAddons || selectedAddonIds.length === 0}>
            {attachingAddons ? "Menyimpan..." : "Tambahkan"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteVariantTarget)}
        title="Hapus Variant"
        message={`Yakin ingin menghapus variant "${deleteVariantTarget?.name}"?`}
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDeleteVariant}
        onCancel={() => setDeleteVariantTarget(null)}
      />
    </div>
  );
}
