"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiClientError } from "@/lib/api-client";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
}

type StatusFilter = "all" | "active" | "inactive";
interface FormState {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}
const EMPTY_FORM: FormState = { name: "", contactPerson: "", phone: "", email: "", address: "", notes: "" };

export function SuppliersManager({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: Supplier[] }
  >({ status: "loading" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
      const data = await apiRequest<{ suppliers: Supplier[] }>(`/api/suppliers?${params}`);
      setState({ status: "success", data: data.suppliers });
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

  function openEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      if (editingId) {
        await apiRequest(`/api/suppliers/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
        showToast("Supplier berhasil diperbarui.");
      } else {
        await apiRequest("/api/suppliers", { method: "POST", body: JSON.stringify(form) });
        showToast("Supplier berhasil ditambahkan.");
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

  async function toggleActive(supplier: Supplier) {
    try {
      await apiRequest(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      showToast(supplier.isActive ? "Supplier dinonaktifkan." : "Supplier diaktifkan.");
      load();
    } catch (err) {
      showToast((err as ApiClientError).message, "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Cari supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-40">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Supplier
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingState label="Memuat supplier..." />}
      {state.status === "error" && <ErrorState title="Gagal memuat supplier" message={state.message} onRetry={load} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState
          title="Belum ada supplier."
          description="Tambahkan supplier untuk mempersiapkan pencatatan pembelian."
          action={canManage ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" strokeWidth={2} /> Tambah Supplier</Button> : undefined}
        />
      )}
      {state.status === "success" && state.data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-ink-subtle">
              <th className="py-2 font-medium">Supplier</th>
              <th className="py-2 font-medium">Kontak</th>
              <th className="py-2 font-medium">Telepon</th>
              <th className="py-2 font-medium">Email</th>
              <th className="py-2 font-medium">Status</th>
              {canManage && <th className="py-2 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {state.data.map((supplier) => (
              <tr key={supplier.id} className="border-b border-border last:border-0">
                <td className="py-2.5 text-ink">{supplier.name}</td>
                <td className="py-2.5 text-ink-muted">{supplier.contactPerson || "—"}</td>
                <td className="py-2.5 text-ink-muted">{supplier.phone || "—"}</td>
                <td className="py-2.5 text-ink-muted">{supplier.email || "—"}</td>
                <td className="py-2.5"><StatusBadge active={supplier.isActive} /></td>
                {canManage && (
                  <td className="py-2.5">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(supplier)} className="text-sm text-coffee-600 hover:underline">Edit</button>
                      <button onClick={() => toggleActive(supplier)} className="text-sm text-coffee-600 hover:underline">
                        {supplier.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Supplier" : "Tambah Supplier"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nama Supplier" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErrors.name} disabled={submitting} required className="sm:col-span-2" />
          <Input label="Kontak Person (opsional)" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} disabled={submitting} />
          <Input label="Telepon (opsional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={submitting} />
          <Input label="Email (opsional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={fieldErrors.email} disabled={submitting} className="sm:col-span-2" />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <Textarea label="Alamat (opsional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={submitting} />
          <Textarea label="Catatan (opsional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={submitting} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
