"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { products: number };
}

type StatusFilter = "all" | "active" | "inactive";

interface FormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", description: "" };

export function CategoriesManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: Category[] }
  >({ status: "loading" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      const data = await apiRequest<{ categories: Category[] }>(`/api/categories?${params}`);
      setState({ status: "success", data: data.categories });
    } catch (err) {
      setState({ status: "error", message: (err as ApiClientError).message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description ?? "" });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = { name: form.name, description: form.description };
      if (editingId) {
        await apiRequest(`/api/categories/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("Kategori berhasil diperbarui.");
      } else {
        await apiRequest("/api/categories", { method: "POST", body: JSON.stringify(payload) });
        showToast("Kategori berhasil ditambahkan.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const apiErr = err as ApiClientError;
      if (apiErr.fieldErrors) {
        setFieldErrors(
          Object.fromEntries(Object.entries(apiErr.fieldErrors).map(([k, v]) => [k, v[0] ?? ""]))
        );
      } else {
        showToast(apiErr.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(category: Category) {
    try {
      await apiRequest(`/api/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      showToast(category.isActive ? "Kategori dinonaktifkan." : "Kategori diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Kategori berhasil dihapus.");
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
          <Input
            placeholder="Cari kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-40">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Kategori
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingState label="Memuat kategori..." />}
      {state.status === "error" && (
        <ErrorState title="Gagal memuat kategori" message={state.message} onRetry={load} />
      )}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState
          title="Belum ada kategori."
          description="Tambahkan kategori pertama untuk mulai mengelompokkan produk."
          action={
            canManage ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Kategori
              </Button>
            ) : undefined
          }
        />
      )}
      {state.status === "success" && state.data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-ink-subtle">
              <th className="py-2 font-medium">Nama</th>
              <th className="py-2 font-medium">Deskripsi</th>
              <th className="py-2 font-medium">Produk</th>
              <th className="py-2 font-medium">Status</th>
              {canManage && <th className="py-2 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {state.data.map((category) => (
              <tr key={category.id} className="border-b border-border last:border-0">
                <td className="py-2.5 text-ink">{category.name}</td>
                <td className="py-2.5 text-ink-muted">{category.description || "—"}</td>
                <td className="py-2.5 text-ink-muted">{category._count.products}</td>
                <td className="py-2.5">
                  <StatusBadge active={category.isActive} />
                </td>
                {canManage && (
                  <td className="py-2.5">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(category)}
                        className="text-sm text-coffee-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(category)}
                        className="text-sm text-coffee-600 hover:underline"
                      >
                        {category.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(category)}
                        className="text-sm text-danger hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Kategori" : "Tambah Kategori"}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nama Kategori"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name}
            disabled={submitting}
            required
          />
          <Textarea
            label="Deskripsi (opsional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        submitting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
