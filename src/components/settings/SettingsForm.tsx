"use client";
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { settingsSchema, SettingsInput } from '@/lib/validation/settings';
import { z } from 'zod';

interface FormState extends SettingsInput {}

export default function SettingsForm() {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(settingsSchema.parse({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        setForm(data);
      } catch (err) {
        showToast((err as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const parseResult = settingsSchema.safeParse(form);
    if (!parseResult.success) {
      const errors = parseResult.error.format();
      showToast('Validasi gagal. Periksa input.', 'error');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseResult.data),
      });
      if (!res.ok) {
        const errData = await res.json();
        showToast(errData?.errors?._ ?? 'Gagal menyimpan.', 'error');
        setSaving(false);
        return;
      }
      const updated = await res.json();
      setForm(updated);
      showToast('Pengaturan berhasil disimpan.', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {/* Store Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">Nama toko</label>
          <input
            id="name"
            name="name"
            type="text"
            className="input"
            value={form.name ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="address">Alamat</label>
          <input
            id="address"
            name="address"
            type="text"
            className="input"
            value={form.address ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="phone">Telepon</label>
          <input
            id="phone"
            name="phone"
            type="text"
            className="input"
            value={form.phone ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            value={form.email ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className="col-span-full">
          <label className="block text-sm font-medium mb-1" htmlFor="logoUrl">Logo URL</label>
          <input
            id="logoUrl"
            name="logoUrl"
            type="url"
            className="input"
            value={form.logoUrl ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Transaction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="currency">Currency</label>
          <input
            id="currency"
            name="currency"
            type="text"
            className="input"
            value={form.currency ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="taxRate">Pajak (%)</label>
          <input
            id="taxRate"
            name="taxRate"
            type="number"
            step="0.01"
            className="input"
            value={form.taxRate ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="serviceCharge">Service charge (%)</label>
          <input
            id="serviceCharge"
            name="serviceCharge"
            type="number"
            step="0.01"
            className="input"
            value={form.serviceCharge ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="timezone">Timezone</label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            className="input"
            value={form.timezone ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Receipt */}
      <div className="grid gap-2">
        <label className="block text-sm font-medium" htmlFor="receiptHeader">Receipt header</label>
        <textarea
          id="receiptHeader"
          name="receiptHeader"
          className="textarea"
          value={form.receiptHeader ?? ''}
          onChange={handleChange}
        />
        <label className="block text-sm font-medium" htmlFor="receiptFooter">Receipt footer</label>
        <textarea
          id="receiptFooter"
          name="receiptFooter"
          className="textarea"
          value={form.receiptFooter ?? ''}
          onChange={handleChange}
        />
        <label className="block text-sm font-medium" htmlFor="printerName">Printer name</label>
        <input
          id="printerName"
          name="printerName"
          type="text"
          className="input"
          value={form.printerName ?? ''}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary mt-4"
      >
        {saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}
