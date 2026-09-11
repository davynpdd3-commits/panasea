"use client";

import { useState } from "react";
import { Trash2, Plus, Minus, FileText, CheckCircle2, Clock } from "lucide-react";
import { usePos } from "./PosContext";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { useEffect } from "react";

interface PosCartProps {
  initialHeldOrders: any[];
}

export function PosCart({ initialHeldOrders }: PosCartProps) {
  const { 
    cart, 
    updateCartItem, 
    removeCartItem, 
    clearCart, 
    cartSubtotal, 
    cartTotal,
    getProduct,
    getVariant,
    getAddon,
    heldOrderId,
    setHeldOrderId,
    addToCart
  } = usePos();
  
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashTendered, setCashTendered] = useState(0);
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [qrPolling, setQrPolling] = useState<NodeJS.Timeout | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
useEffect(() => {
  if (heldOrderId) {
    setShowPaymentModal(true);
  }
}, [heldOrderId]);
  // Create order from cart and set heldOrderId before opening payment modal
  const startCheckout = async () => {
    if (cart.length === 0) {
      showToast("Keranjang kosong, tidak ada pesanan.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderPayload = {
        status: "OPEN" as const,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          notes: item.notes,
          addons: item.addons.map((addonId) => ({ addonId })),
        })),
      };
      const created = await apiRequest<any>("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      });
      // API returns the full order object
      setHeldOrderId(created.id);
      // Modal will be opened via useEffect when heldOrderId changes
    } catch (e: any) {
      showToast(e.message || "Gagal membuat pesanan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open payment modal instead of direct checkout
  // openPaymentModal is now invoked after order creation via startCheckout
  const openPaymentModal = () => {
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod("CASH");
    setCashTendered(0);
    setQrPaymentId(null);
    setQrProcessing(false);
    if (qrPolling) {
      clearInterval(qrPolling);
      setQrPolling(null);
    }
  };

  const processCash = async () => {
    if (!heldOrderId) {
      showToast("Tidak ada order yang sedang diproses", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await apiRequest<any>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          orderId: heldOrderId,
          paymentMethod: "CASH",
          amountTendered: cashTendered,
        }),
      });
      setReceiptOrder(result.order ?? result);
      showToast("Pembayaran tunai berhasil", "success");
      clearCart();
      closePaymentModal();
    } catch (e: any) {
      showToast(e.message || "Gagal memproses pembayaran tunai", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateQris = async () => {
    if (!heldOrderId) {
      showToast("Tidak ada order yang sedang diproses", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await apiRequest<any>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          orderId: heldOrderId,
          paymentMethod: "QRIS",
        }),
      });
      const paymentId = result.payment?.id ?? result.id;
      setQrPaymentId(paymentId);
      setQrProcessing(true);
      // start polling for confirmation every 3s
      const interval = setInterval(async () => {
        try {
          const statusRes = await apiRequest<any>(`/api/payments/${paymentId}`);
          if (statusRes.status === "PAID") {
            clearInterval(interval);
            setQrProcessing(false);
            setReceiptOrder(statusRes.order ?? statusRes);
            showToast("Pembayaran QRIS berhasil", "success");
            clearCart();
            closePaymentModal();
          }
        } catch (_) {}
      }, 3000);
      setQrPolling(interval as any);
    } catch (e: any) {
      showToast(e.message || "Gagal memulai pembayaran QRIS", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelQris = async () => {
    if (!qrPaymentId) return;
    setIsSubmitting(true);
    try {
      await apiRequest<any>(`/api/payments/${qrPaymentId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel" }),
      });
      showToast("Pembayaran QRIS dibatalkan", "error");
      closePaymentModal();
    } catch (e: any) {
      showToast(e.message || "Gagal membatalkan QRIS", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = () => {
    clearCart();
    setShowConfirmCancel(false);
  };

  const resumeHeldOrder = (order: any) => {
    clearCart();
    setHeldOrderId(order.id);
    order.items.forEach((item: any) => {
      addToCart({
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        notes: item.notes || undefined,
        addons: item.addons.map((a: any) => a.addonId),
      });
    });
    setShowHeldOrders(false);
  };

  if (receiptOrder) {
    return (
      <div className="flex h-full flex-col p-6 items-center justify-center text-center">
        <CheckCircle2 className="w-16 h-16 text-coffee-600 mb-4" />
        <h2 className="text-2xl font-display text-ink mb-2">Pesanan Selesai</h2>
        <p className="text-ink-muted mb-6">No. Pesanan: {receiptOrder.orderNumber}</p>
        
        <div className="w-full bg-cream rounded-lg p-4 mb-6 text-left text-sm max-h-[40vh] overflow-y-auto">
          {(receiptOrder?.items || []).map((item: any) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="font-medium">{item.quantity} x {item.product.name}</p>
                {item.variant && <p className="text-ink-muted text-xs">{item.variant.name}</p>}
                {item.addons.map((a: any) => (
                  <p key={a.id} className="text-ink-muted text-xs">+ {a.addon.name}</p>
                ))}
              </div>
              <div className="font-medium">{formatRupiah(item.lineTotal)}</div>
            </div>
          ))}
          <div className="flex justify-between pt-4 mt-2 border-t font-bold text-ink">
              <span>Total</span>
              <span>{formatRupiah(receiptOrder.grandTotal)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span>Metode Pembayaran</span>
              <span>{receiptOrder.payment?.paymentMethod}</span>
            </div>
            {receiptOrder.payment?.paymentMethod === "CASH" && (
              <>
                <div className="flex justify-between">
                  <span>Uang Dibayar</span>
                  <span>{formatRupiah(receiptOrder.payment.amountTendered)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembalian</span>
                  <span>{formatRupiah(receiptOrder.payment.changeAmount)}</span>
                </div>
              </>
            )}
        </div>

        <Button className="w-full" onClick={() => setReceiptOrder(null)}>
          Pesanan Baru
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col relative">
      <div className="p-4 border-b border-border bg-surface shrink-0 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">
          {heldOrderId ? "Mengubah Pesanan" : "Pesanan Saat Ini"}
        </h2>
        <div className="flex items-center gap-3">
          {initialHeldOrders.length > 0 && (
            <button 
              onClick={() => setShowHeldOrders(true)}
              className="text-xs text-coffee-600 hover:underline flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              {initialHeldOrders.length} Tertunda
            </button>
          )}
          {cart.length > 0 && (
            <button 
              onClick={() => setShowConfirmCancel(true)}
              className="text-xs text-warning hover:underline"
            >
              Batalkan
            </button>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-ink-muted text-center flex-col">
          <FileText className="w-12 h-12 mb-3 text-ink-muted/30" />
          <p>Belum ada pesanan.</p>
          <p className="text-sm mt-1">Pilih produk di sebelah kiri untuk memulai.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item) => {
            const product = getProduct(item.productId);
            const variant = item.variantId ? getVariant(item.productId, item.variantId) : null;
            
            let unitPrice = variant ? variant.price : (product?.price || 0);
            let addonsPrice = item.addons.reduce((sum, id) => sum + (getAddon(id)?.price || 0), 0);
            const lineTotal = (unitPrice + addonsPrice) * item.quantity;

            return (
              <div key={item.id} className="bg-cream p-3 rounded-lg border border-border">
                <div className="flex justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-ink leading-tight">{product?.name}</p>
                    {variant && <p className="text-xs text-ink-muted mt-0.5">{variant.name}</p>}
                    {item.addons.map(id => (
                      <p key={id} className="text-xs text-ink-muted mt-0.5">+ {getAddon(id)?.name}</p>
                    ))}
                    {item.notes && <p className="text-xs italic text-ink-muted mt-1">&quot;{item.notes}&quot;</p>}
                  </div>
                  <div className="font-medium text-ink whitespace-nowrap">
                    {formatRupiah(lineTotal)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                      className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-ink"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                      className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-ink"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="p-1 text-ink-subtle hover:text-warning"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Summary & Actions */}
      <div className="bg-surface p-4 border-t border-border shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-ink-subtle">
            <span>Subtotal</span>
            <span>{formatRupiah(cartSubtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-ink pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatRupiah(cartTotal)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="secondary" 
              disabled={cart.length === 0 || isSubmitting}
              onClick={startCheckout}
              className="w-full text-coffee-700 hover:text-coffee-800"
            >
              Bayar
            </Button>
        </div>
      </div>

      {showConfirmCancel && (
        <Modal
          open={true}
          onClose={() => setShowConfirmCancel(false)}
          title="Batalkan Pesanan?"
        >
          <p className="text-sm text-ink-muted mb-6">
            Seluruh item di keranjang akan dihapus. Anda yakin?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmCancel(false)}>Tutup</Button>
            <Button variant="danger" onClick={handleCancelOrder}>Ya, Batalkan</Button>
          </div>
        </Modal>
      )}
      {showPaymentModal && (
        <Modal
          open={true}
          onClose={closePaymentModal}
          title="Pembayaran"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CASH"
                  checked={paymentMethod === "CASH"}
                  onChange={() => setPaymentMethod("CASH")}
                  className="mr-2"
                />
                Tunai
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="QRIS"
                  checked={paymentMethod === "QRIS"}
                  onChange={() => setPaymentMethod("QRIS")}
                  className="mr-2"
                />
                QRIS
              </label>
            </div>

            {paymentMethod === "CASH" && (
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Jumlah uang diterima</label>
                <input
                  type="number"
                  min={0}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(parseInt(e.target.value) || 0)}
                  className="border p-2 rounded"
                />
              </div>
            )}

            {paymentMethod === "QRIS" && (
              <div className="flex flex-col items-center space-y-2">
                {qrProcessing ? (
                  <p className="text-sm text-ink-muted">Menunggu konfirmasi QRIS...</p>
                ) : (
                  <p className="text-sm text-ink-muted">Tekan &quot;Mulai&quot; untuk memulai pembayaran QRIS.</p>
                )}
                {!qrPaymentId && (
                  <Button onClick={initiateQris} disabled={isSubmitting} className="w-full">
                    Mulai QRIS
                  </Button>
                )}
                {qrPaymentId && (
                  <Button onClick={cancelQris} disabled={isSubmitting} variant="danger" className="w-full">
                    Batalkan QRIS
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={closePaymentModal} disabled={isSubmitting}>Batal</Button>
              {paymentMethod === "CASH" && (
                <Button onClick={processCash} disabled={isSubmitting || cashTendered <= 0}>Bayar</Button>
              )}
              {paymentMethod === "QRIS" && qrPaymentId && (
                <Button onClick={() => {}} disabled={true}>Menunggu...</Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showHeldOrders && (
        <Modal
          open={true}
          onClose={() => setShowHeldOrders(false)}
          title="Pesanan Tertunda"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {initialHeldOrders.length === 0 ? (
              <p className="text-sm text-ink-muted">Tidak ada pesanan tertunda.</p>
            ) : (
              initialHeldOrders.map((o) => (
                <div key={o.id} className="p-4 rounded-lg border border-border bg-cream flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-ink">{o.orderNumber}</h4>
                      <p className="text-xs text-ink-muted mt-1">
                        {new Date(o.updatedAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-bold text-coffee-700">{formatRupiah(o.grandTotal)}</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => resumeHeldOrder(o)}
                  >
                    Ambil Pesanan
                  </Button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
