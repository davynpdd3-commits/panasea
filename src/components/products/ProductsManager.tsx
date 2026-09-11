"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  category: { id: string; name: string };
  _count: { variants: number };
}

type StatusFilter = "all" | "active" | "inactive";

interface FormState {
  name: string;
  categoryId: string;
  description: string;
  sku: string;
  price: string;
}
const emptyForm = (defaultCategoryId: string): FormState => ({
  name: "",
  categoryId: defaultCategoryId,
  description: "",
  sku: "",
  price: "",
});

export function ProductsManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; items: Product[]; total: number }
  >({ status: "loading" });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiRequest<{ categories: Category[] }>("/api/categories?status=active")
      .then((data) => setCategories(data.categories))
      .catch(() => {
        /* category dropdown just stays empty; the main list error state covers connectivity issues */
      });
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
      if (categoryId) params.set("categoryId", categoryId);
      if (status !== "all") params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const data = await apiRequest<{ items: Product[]; total: number }>(`/api/products?${params}`);
      setState({ status: "success", items: data.items, total: data.total });
    } catch (err) {
      setState({ status: "error", message: (err as ApiClientError).message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryId, status, page]);

  function openCreate() {
    setForm(emptyForm(categories[0]?.id ?? ""));
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleCreate() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          categoryId: form.categoryId,
          description: form.description,
          sku: form.sku,
          price: Number(form.price),
        }),
      });
      showToast("Produk berhasil ditambahkan.");
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

  async function toggleActive(product: Product) {
    try {
      await apiRequest(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      showToast(product.isActive ? "Produk dinonaktifkan." : "Produk diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Produk berhasil dihapus.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="w-44">
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }} className="w-40">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={categories.length === 0}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Produk
          </Button>
        )}
      </div>

      {canManage && categories.length === 0 && state.status === "success" && (
        <p className="mb-3 text-sm text-ink-muted">
          Buat kategori terlebih dahulu di tab{" "}
          <Link href="/products/categories" className="text-coffee-600 hover:underline">Kategori</Link>{" "}
          sebelum menambah produk.
        </p>
      )}

      {state.status === "loading" && <LoadingState label="Memuat produk..." />}
      {state.status === "error" && <ErrorState title="Gagal memuat produk" message={state.message} onRetry={load} />}
      {state.status === "success" && state.items.length === 0 && (
        <EmptyState
          title="Belum ada produk."
          description="Tambahkan produk pertama untuk mulai membangun menu."
          action={canManage && categories.length > 0 ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" strokeWidth={2} /> Tambah Produk</Button> : undefined}
        />
      )}
      {state.status === "success" && state.items.length > 0 && (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-subtle">
                <th className="py-2 font-medium">Nama</th>
                <th className="py-2 font-medium">Kategori</th>
                <th className="py-2 font-medium">Harga</th>
                <th className="py-2 font-medium">Variant</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-ink">{product.name}</td>
                  <td className="py-2.5 text-ink-muted">{product.category.name}</td>
                  <td className="py-2.5 text-ink-muted">{formatRupiah(product.price)}</td>
                  <td className="py-2.5 text-ink-muted">{product._count.variants || "—"}</td>
                  <td className="py-2.5"><StatusBadge active={product.isActive} /></td>
                  <td className="py-2.5">
                    <div className="flex gap-3">
                      <Link href={`/products/${product.id}`} className="text-sm text-coffee-600 hover:underline">Detail</Link>
                      {canManage && (
                        <>
                          <button onClick={() => toggleActive(product)} className="text-sm text-coffee-600 hover:underline">
                            {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button onClick={() => setDeleteTarget(product)} className="text-sm text-danger hover:underline">Hapus</button>
                        </>
                      )}
                    </div>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Produk">
        <div className="flex flex-col gap-4">
          <Input
            label="Nama Produk"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name}
            disabled={submitting}
            required
          />
          <Select
            label="Kategori"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            error={fieldErrors.categoryId}
            disabled={submitting}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input
            label="Harga (Rp)"
            type="number"
            min={0}
            step={500}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            error={fieldErrors.price}
            disabled={submitting}
            required
          />
          <Input
            label="SKU (opsional)"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            error={fieldErrors.sku}
            disabled={submitting}
          />
          <Textarea
            label="Deskripsi (opsional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>Batal</Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={submitting || !form.name.trim() || !form.categoryId || form.price === ""}
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Produk"
        message={`Yakin ingin menghapus produk "${deleteTarget?.name}"? Variant dan add-on yang terhubung juga akan ikut terhapus.`}
        confirmLabel="Hapus"
        destructive
        submitting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
