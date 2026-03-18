import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAuthStore } from "@/store/auth.store";
import { ROUTER_URL } from "@/routes/router.const";
import type { PaymentMethod, AppliedPromo } from "@/types/delivery.types";
import { cartClient, type CartApiData, type ApiCartItem } from "@/services/cart.client";
import { orderClient } from "@/services/order.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function InputField({
  label, required, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string; }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2",
          error ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-amber-300 focus:border-amber-400 bg-white",
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: "CASH",      label: "Tiền mặt (COD)",      icon: "💵", desc: "Thanh toán khi nhận hàng" },
  { value: "MOMO",      label: "Ví MoMo",              icon: "🟣", desc: "Thanh toán qua MoMo" },
  { value: "ZALOPAY",   label: "Ví ZaloPay",           icon: "🔵", desc: "Thanh toán qua ZaloPay" },
  { value: "SHOPEEPAY", label: "Ví ShopeePay",         icon: "🟠", desc: "Thanh toán qua ShopeePay" },
  { value: "BANK",      label: "Thẻ NH / Chuyển khoản", icon: "🏦", desc: "QR code / tài khoản ngân hàng" },
];

interface DisplayItem {
  key: string;
  apiItemId?: string;
  name: string;
  image: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export default function MenuCheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const localItems = useMenuCartStore((s) => s.items);
  const cartId = useMenuCartStore((s) => s.cartId);
  const setCartId = useMenuCartStore((s) => s.setCartId);
  const clearCart = useMenuCartStore((s) => s.clearCart);

  const { selectedFranchiseName } = useDeliveryStore();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const resolved = useRef(false);

  // Always fetch active cart on mount to ensure cartId is correct
  useEffect(() => {
    if (!isLoggedIn || !user || resolved.current) return;
    const customerId = String(
      (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? ""
    );
    if (!customerId) return;
    resolved.current = true;
    cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" })
      .then((carts) => {
        const first = (carts as CartApiData[])[0];
        const id = first?._id ?? first?.id;
        if (id) setCartId(String(id));
      })
      .catch(() => {});
  }, [isLoggedIn, user, setCartId]);

  // Fetch cart detail from API
  const { data: apiCart } = useQuery({
    queryKey: ["cart-detail", cartId],
    queryFn: () => cartClient.getCartDetail(cartId!),
    enabled: !!cartId && isLoggedIn,
    staleTime: 10_000,
  });

  const apiItems: DisplayItem[] = (apiCart?.items ?? []).map((item: ApiCartItem, idx: number) => {
    const qty = item.quantity ?? 1;
    const price = item.price_snapshot ?? item.price ?? 0;
    return {
      key: item._id ?? item.id ?? `api-${idx}`,
      apiItemId: item._id ?? item.id,
      name: item.product_name_snapshot ?? item.name ?? "Sản phẩm",
      image: item.image_url ?? "",
      size: item.size,
      quantity: qty,
      unitPrice: price,
      lineTotal: item.line_total ?? price * qty,
    };
  });

  const hasApiItems = apiItems.length > 0;

  const items: DisplayItem[] = hasApiItems
    ? apiItems
    : localItems.map((li) => ({
        key: li.cartKey,
        name: li.name,
        image: li.image,
        size: li.options.size,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.unitPrice * li.quantity,
      }));

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = hasApiItems
    ? (apiCart?.total_amount ?? items.reduce((s, i) => s + i.lineTotal, 0))
    : items.reduce((s, i) => s + i.lineTotal, 0);

  async function handleUpdateQuantity(item: DisplayItem, newQty: number) {
    if (newQty < 1) {
      handleRemoveItem(item);
      return;
    }
    if (item.apiItemId) {
      try {
        await cartClient.updateCartItemQuantity({ cart_item_id: item.apiItemId, quantity: newQty });
        queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
      } catch { toast.error("Không thể cập nhật số lượng"); }
    } else {
      useMenuCartStore.getState().updateQuantity(item.key, newQty);
    }
  }

  async function handleRemoveItem(item: DisplayItem) {
    if (item.apiItemId) {
      try {
        await cartClient.deleteCartItem(item.apiItemId);
        queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
        toast.success("Đã xóa sản phẩm");
      } catch { toast.error("Không thể xóa sản phẩm"); }
    } else {
      useMenuCartStore.getState().removeItem(item.key);
    }
  }

  // ─── Promo code state ───────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // ─── Form state ──────────────────────────────────────────────────────────
  const [form, setFormState] = useState({
    name: user?.name ?? "",
    phone: "",
    note: "",
    paymentMethod: "CASH" as PaymentMethod,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOrdering, setIsOrdering] = useState(false);

  // ─── Derived totals ──────────────────────────────────────────────────────
  const discountAmount = appliedPromo && appliedPromo.code !== "FREESHIP"
    ? appliedPromo.discountAmount
    : 0;

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const total = afterDiscount;

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }

  async function applyPromo() {
    if (!promoInput.trim() || !cartId) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      await cartClient.applyVoucher(cartId, promoInput.trim());
      setAppliedPromo({ code: promoInput.trim().toUpperCase(), label: promoInput.trim().toUpperCase(), discountAmount: 0 });
      setPromoInput("");
      toast.success(`Áp dụng mã thành công!`);
    } catch {
      setPromoError("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    } finally {
      setPromoLoading(false);
    }
  }

  async function removePromo() {
    setAppliedPromo(null);
    setPromoError("");
    if (cartId) {
      try { await cartClient.removeVoucher(cartId); } catch { /* ignore */ }
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const canPlace = items.length > 0 && !!cartId && termsAccepted;

  const blockReason = items.length === 0
    ? "Giỏ hàng trống"
    : !cartId
    ? "Không tìm thấy giỏ hàng. Vui lòng thêm sản phẩm từ menu."
    : !termsAccepted
    ? "Vui lòng đồng ý điều khoản để tiếp tục"
    : null;

  async function handleOrder() {
    if (!validate() || !canPlace || !cartId || isOrdering) return;

    setIsOrdering(true);
    try {
      // Step 1: Update cart with customer info (phone, note)
      await cartClient.updateCart(cartId, {
        phone: form.phone.trim(),
        message: form.note.trim() || undefined,
      });

      // Step 2: Checkout the cart via real API
      await cartClient.checkoutCart(cartId);

      // Step 3: Get the created order via cart ID
      const order = await orderClient.getOrderByCartId(cartId);
      const orderId = order?._id ?? order?.id ?? "";

      clearCart();

      if (!orderId) {
        toast.success("Đặt hàng thành công!");
        navigate(ROUTER_URL.MENU);
        return;
      }

      toast.success("Đặt hàng thành công! 🎉");
      navigate(ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", String(orderId)));
    } catch (error: unknown) {
      console.error(error);
      const msg = (error as any)?.response?.data?.message ?? "Không thể đặt hàng. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setIsOrdering(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <Link to={ROUTER_URL.MENU} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Quay lại Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to={ROUTER_URL.HOME} className="hover:text-gray-600">Trang chủ</Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 tracking-tight">Xác nhận đơn hàng</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">

            {/* FRANCHISE INFORMATION */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center px-5 py-4 border-b border-gray-50 gap-2">
                <span className="text-xl">🏪</span>
                <h2 className="font-semibold text-gray-900">Cửa hàng phục vụ</h2>
              </div>
              <div className="px-5 py-4 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">🍵</div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-900">{selectedFranchiseName ?? "Hylux"}</p>
                  <p className="text-xs text-emerald-600 font-medium">✓ Đơn hàng sẽ được xử lý tại cửa hàng này</p>
                  {cartId && (
                    <p className="text-xs text-gray-400 font-mono">Cart: {cartId.slice(-8)}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Cart items */}
            <section className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Sản phẩm <span className="text-gray-400 font-normal text-sm">({itemCount} món)</span></h2>
                <Link to={ROUTER_URL.MENU} className="text-sm text-amber-600 hover:text-amber-700 font-medium">+ Thêm món</Link>
              </div>
              {items.map((item) => (
                <div key={item.key} className="px-5 py-4 flex gap-4 group">
                  {item.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRemoveItem(item)}
                          title="Xóa"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {item.size && (
                      <p className="text-xs text-gray-400 mt-0.5">Size {item.size}</p>
                    )}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => item.quantity > 1 ? handleUpdateQuantity(item, item.quantity - 1) : handleRemoveItem(item)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">
                          {item.quantity === 1 ? "×" : "−"}
                        </button>
                        <span className="w-6 text-center text-xs font-semibold select-none">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(item.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Customer info */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 mb-1">Thông tin khách hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Họ và tên" required placeholder="Nguyễn Văn A" value={form.name}
                  onChange={(e) => setField("name", (e.target as HTMLInputElement).value)} error={errors.name} />
                <InputField label="Số điện thoại" required placeholder="0901234567" type="tel" value={form.phone}
                  onChange={(e) => setField("phone", (e.target as HTMLInputElement).value)} error={errors.phone} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea rows={2} placeholder="Ghi chu cho cua hang..." value={form.note}
                  onChange={(e) => setField("note", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 text-sm outline-none transition-all resize-none" />
              </div>
            </section>

            {/* Promo Code */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Mã giảm giá</h2>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 text-lg">🏷️</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{appliedPromo.code}</p>
                      <p className="text-xs text-emerald-600">{appliedPromo.label}</p>
                    </div>
                  </div>
                  <button onClick={removePromo} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
                    Huỷ
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    placeholder="Nhập mã giảm giá..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 text-sm outline-none transition-all uppercase"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    {promoLoading ? "⋯" : "Áp dụng"}
                  </button>
                </div>
              )}
              {promoError && <p className="mt-1.5 text-xs text-red-500">{promoError}</p>}
              <p className="mt-2 text-xs text-gray-400">Nhập mã voucher để được giảm giá</p>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method.value} onClick={() => setField("paymentMethod", method.value)}
                    className={cn("flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150",
                      form.paymentMethod === method.value ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "border-gray-200 hover:border-gray-300 bg-white")}>
                    <span className="text-xl shrink-0">{method.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{method.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{method.desc}</p>
                    </div>
                    <div className={cn("ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-all",
                      form.paymentMethod === method.value ? "border-amber-500 bg-amber-500" : "border-gray-300")} />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>
              {selectedFranchiseName && (
                <div className="mb-4 p-3 rounded-xl text-sm bg-amber-50 border border-amber-100">
                  <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">🏪 Cửa hàng</p>
                  <p className="text-gray-700 text-xs leading-relaxed">{selectedFranchiseName}</p>
                </div>
              )}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({itemCount} món)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {appliedPromo && appliedPromo.code !== "FREESHIP" && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá ({appliedPromo.code})</span>
                    <span>-{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Tổng tiền</span>
                  <span className="text-amber-600">{fmt(total)}</span>
                </div>
              </div>

              {/* Terms checkbox */}
              <label className="mt-4 flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                  Tôi đã đọc, hiểu và đồng ý với tất cả các{" "}
                  <span className="text-amber-600 hover:underline cursor-pointer">điều khoản, điều kiện và chính sách</span>{" "}
                  liên quan
                </span>
              </label>

              {blockReason && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{blockReason}</span>
                </div>
              )}
              <button
                onClick={handleOrder}
                disabled={isOrdering || !canPlace}
                className={cn(
                  "mt-3 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150",
                  isOrdering || !canPlace
                    ? "bg-gray-200 cursor-not-allowed text-gray-400"
                    : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200",
                )}
              >
                {isOrdering
                  ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Đang xử lý...
                    </>
                  )
                  : `Đặt hàng • ${fmt(total)}`
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
