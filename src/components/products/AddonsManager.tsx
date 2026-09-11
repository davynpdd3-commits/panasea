"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";

interface Addon {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

type StatusFilter = "all" | "active" | "inactive";
interface FormState {
  name: string;
  price: string;
}
const EMPTY_FORM: FormState = { name: "", price: "" };

export function AddonsManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: Addon[] }
  >({ status: "loading" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Addon | null>(null);
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
      const data = await apiRequest<{ addons: Addon[] }>(`/api/addons?${params}`);
      setState({ status: "success", data: data.addons });
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

  function openEdit(addon: Addon) {
    setEditingId(addon.id);
    setForm({ name: addon.name, price: String(addon.price) });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFieldErrors({});
    const price = Number(form.price);
    try {
      const payload = { name: form.name, price };
      if (editingId) {
        await apiRequest(`/api/addons/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("Add-on berhasil diperbarui.");
      } else {
        await apiRequest("/api/addons", { method: "POST", body: JSON.stringify(payload) });
        showToast("Add-on berhasil ditambahkan.");
      }
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

  async function toggleActive(addon: Addon) {
    try {
      await apiRequest(`/api/addons/${addon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !addon.isActive }),
      });
      showToast(addon.isActive ? "Add-on dinonaktifkan." : "Add-on diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/addons/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Add-on berhasil dihapus.");
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
          <Input placeholder="Cari add-on..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-40">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Add-on
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingState label="Memuat add-on..." />}
      {state.status === "error" && <ErrorState title="Gagal memuat add-on" message={state.message} onRetry={load} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState
          title="Belum ada add-on."
          description="Tambahkan add-on seperti extra shot atau oat milk untuk ditawarkan pada produk."
          action={canManage ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" strokeWidth={2} /> Tambah Add-on</Button> : undefined}
        />
      )}
      {state.status === "success" && state.data.length > 0 && (
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
            {state.data.map((addon) => (
              <tr key={addon.id} className="border-b border-border last:border-0">
                <td className="py-2.5 text-ink">{addon.name}</td>
                <td className="py-2.5 text-ink-muted">{formatRupiah(addon.price)}</td>
                <td className="py-2.5"><StatusBadge active={addon.isActive} /></td>
                {canManage && (
                  <td className="py-2.5">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(addon)} className="text-sm text-coffee-600 hover:underline">Edit</button>
                      <button onClick={() => toggleActive(addon)} className="text-sm text-coffee-600 hover:underline">
                        {addon.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button onClick={() => setDeleteTarget(addon)} className="text-sm text-danger hover:underline">Hapus</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Add-on" : "Tambah Add-on"}>
        <div className="flex flex-col gap-4">
          <Input
            label="Nama Add-on"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name}
            disabled={submitting}
            required
          />
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
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name.trim() || form.price === ""}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Add-on"
        message={`Yakin ingin menghapus add-on "${deleteTarget?.name}"? Add-on ini akan hilang dari semua produk yang menggunakannya.`}
        confirmLabel="Hapus"
        destructive
        submitting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
