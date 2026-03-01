import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAuthStore } from "@/store/auth.store";
import { isBranchOpen } from "@/services/branch.service";
import BranchPickerModal from "@/components/menu/BranchPickerModal";
import MenuProductModal from "@/components/menu/MenuProductModal";
import { ROUTER_URL } from "@/routes/router.const";
import type { PlacedOrder, PaymentMethod, AppliedPromo } from "@/types/delivery.types";
import type { MenuCartItem } from "@/types/menu.types";
import { menuProducts } from "@/services/menu.service";

const VAT_RATE = 0.08; // 8% VAT

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

// ─── Mock promo codes ─────────────────────────────────────────────────────
const MOCK_PROMOS: Record<string, { label: string; type: "percent" | "fixed" | "freeship"; value: number }> = {
  "MOMO10": { label: "Giảm 10% (MoMo)", type: "percent", value: 10 },
  "HYLUX50K": { label: "Giảm 50.000đ", type: "fixed", value: 50000 },
  "FREESHIP": { label: "Miễn phí giao hàng", type: "freeship", value: 0 },
  "WELCOME20": { label: "Giảm 20% đơn đầu", type: "percent", value: 20 },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: "CASH",      label: "Tiền mặt (COD)",      icon: "💵", desc: "Thanh toán khi nhận hàng" },
  { value: "MOMO",      label: "Ví MoMo",              icon: "🟣", desc: "Thanh toán qua MoMo" },
  { value: "ZALOPAY",   label: "Ví ZaloPay",           icon: "🔵", desc: "Thanh toán qua ZaloPay" },
  { value: "SHOPEEPAY", label: "Ví ShopeePay",         icon: "🟠", desc: "Thanh toán qua ShopeePay" },
  { value: "BANK",      label: "Thẻ NH / Chuyển khoản", icon: "🏦", desc: "QR code / tài khoản ngân hàng" },
];

export default function MenuCheckoutPage() {
  const navigate = useNavigate();
  const items = useMenuCartStore((s) => s.items);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const clearCart = useMenuCartStore((s) => s.clearCart);

  const {
    orderMode, selectedBranch, deliveryAddress,
    currentDeliveryFee, estimatedPrepMins, estimatedDeliveryMins,
    placeOrder,
  } = useDeliveryStore();
  const user = useAuthStore((s) => s.user);

  const branchOpen = selectedBranch ? isBranchOpen(selectedBranch) : false;
  const { itemCount, subtotal } = useMenuCartTotals(
    orderMode === "DELIVERY" ? currentDeliveryFee : 0,
  );

  // ─── Promo code state ───────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // ─── Edit item modal state ───────────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<MenuCartItem | null>(null);

  // ─── Form state ──────────────────────────────────────────────────────────
  const [showBranchPicker, setShowBranchPicker] = useState(false);
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
  const deliveryFee = appliedPromo?.code === "FREESHIP"
    ? 0
    : (orderMode === "DELIVERY" ? currentDeliveryFee : 0);

  const discountAmount = appliedPromo
    ? appliedPromo.code === "FREESHIP"
      ? currentDeliveryFee
      : appliedPromo.discountAmount
    : 0;

  const afterDiscount = Math.max(0, subtotal + deliveryFee - discountAmount);
  const vatAmount = Math.round(afterDiscount * VAT_RATE);
  const total = afterDiscount + vatAmount;

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    await new Promise((r) => setTimeout(r, 600)); // simulate API
    const code = promoInput.trim().toUpperCase();
    const promo = MOCK_PROMOS[code];
    if (!promo) {
      setPromoError("Mã giảm giá không hợp lệ hoặc đã hết hạn");
      setPromoLoading(false);
      return;
    }
    let discountAmt = 0;
    if (promo.type === "percent") discountAmt = Math.round(subtotal * promo.value / 100);
    else if (promo.type === "fixed") discountAmt = Math.min(promo.value, subtotal);
    else discountAmt = currentDeliveryFee; // freeship
    setAppliedPromo({ code, label: promo.label, discountAmount: discountAmt });
    setPromoInput("");
    setPromoLoading(false);
    toast.success(`Áp dụng mã "${code}" thành công!`);
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoError("");
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const canPlace =
    !!selectedBranch && branchOpen && items.length > 0 &&
    (orderMode === "PICKUP" || !!deliveryAddress.rawAddress) &&
    termsAccepted;

  const blockReason = !selectedBranch
    ? "Vui lòng chọn cửa hàng trước khi đặt hàng"
    : !branchOpen
    ? "Cửa hàng đang đóng cửa"
    : orderMode === "DELIVERY" && !deliveryAddress.rawAddress
    ? "Chưa xác nhận địa chỉ giao hàng"
    : !termsAccepted
    ? "Vui lòng đồng ý điều khoản để tiếp tục"
    : null;

  async function handleOrder() {
    if (!validate() || !canPlace || !selectedBranch) return;
    setIsOrdering(true);
    await new Promise((r) => setTimeout(r, 800));

    const orderId = `ORD-${Date.now()}`;
    const orderCode = `WBS${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const order: PlacedOrder = {
      id: orderId,
      code: orderCode,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      mode: orderMode,
      status: "PENDING",
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      ...(orderMode === "DELIVERY" && deliveryAddress.rawAddress
        ? { deliveryAddress: deliveryAddress.rawAddress }
        : {}),
      paymentMethod: form.paymentMethod,
      ...(appliedPromo ? { promo: appliedPromo } : {}),
      vatAmount,
      items: items.map((item) => ({
        cartKey: item.cartKey,
        productId: item.productId,
        name: item.name,
        image: item.image,
        options: item.options,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      deliveryFee,
      total,
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
      prepTimeMins: estimatedPrepMins,
      deliveryTimeMins: estimatedDeliveryMins,
      createdAt: now,
      statusUpdatedAt: now,
    };

    placeOrder(order);
    clearCart();
    setIsOrdering(false);
    toast.success("Đặt hàng thành công! 🎉");
    navigate(ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId));
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
      {showBranchPicker && (
        <BranchPickerModal onClose={() => { toast.success("Đã cập nhật phương thức nhận hàng"); setShowBranchPicker(false); }} />
      )}
      {editingItem && (() => {
        const product = menuProducts.find((p) => p.id === editingItem.productId) ?? null;
        return (
          <MenuProductModal
            product={product}
            onClose={() => setEditingItem(null)}
          />
        );
      })()}
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

            {/* RECEIVING INFORMATION */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{orderMode === "PICKUP" ? "🏪" : "🛵"}</span>
                  <h2 className="font-semibold text-gray-900">
                    {orderMode === "PICKUP" ? "Điểm lấy hàng" : "Địa chỉ giao hàng"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowBranchPicker(true)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold border border-amber-200 hover:border-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-all"
                >
                  Thay đổi
                </button>
              </div>
              {!selectedBranch ? (
                <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
                  <span className="text-4xl">📍</span>
                  <p className="text-gray-500 text-sm">Chưa chọn cửa hàng hoặc địa chỉ</p>
                  <button onClick={() => setShowBranchPicker(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all">
                    Chọn ngay
                  </button>
                </div>
              ) : orderMode === "PICKUP" ? (
                <div className="px-5 py-4 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">🏪</div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-900">{selectedBranch.name}</p>
                    <p className="text-sm text-gray-500">{selectedBranch.address}</p>
                    <p className="text-sm text-gray-400">{selectedBranch.openingHours.open} – {selectedBranch.openingHours.close}</p>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1", branchOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {branchOpen ? "Đang mở cửa" : "Đóng cửa"}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">⏱ Chuẩn bị: ~{estimatedPrepMins} phút</p>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">📍</div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Địa chỉ giao</p>
                      <p className="font-semibold text-gray-900 text-sm">{deliveryAddress.rawAddress || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">🏪</div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Cửa hàng xử lý</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedBranch.name}</p>
                      <p className="text-xs text-gray-400">{selectedBranch.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[{ label: "Chuẩn bị", value: `${estimatedPrepMins} phút` },
                      { label: "Giao hàng", value: `${estimatedDeliveryMins} phút` },
                      { label: "Tổng", value: `${estimatedPrepMins + estimatedDeliveryMins} phút` }
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-gray-400">{item.label}</p>
                        <p className="text-xs font-bold text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Cart items */}
            <section className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Sản phẩm <span className="text-gray-400 font-normal text-sm">({itemCount} món)</span></h2>
                <Link to={ROUTER_URL.MENU} className="text-sm text-amber-600 hover:text-amber-700 font-medium">+ Thêm món</Link>
              </div>
              {items.map((item) => (
                <div key={item.cartKey} className="px-5 py-4 flex gap-4 group">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit icon ✏️ */}
                        <button
                          onClick={() => setEditingItem(item)}
                          title="Chỉnh sửa"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete icon 🗑️ */}
                        <button
                          onClick={() => removeItem(item.cartKey)}
                          title="Xóa"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Size {item.options.size} • {item.options.sugar} — {item.options.ice}
                      {item.options.toppings.length > 0 && ` • ${
                        Object.entries(
                          item.options.toppings.reduce<Record<string, number>>(
                            (acc, t) => ({ ...acc, [t.name]: (acc[t.name] ?? 0) + 1 }),
                            {}
                          )
                        ).map(([name, qty]) => qty > 1 ? `${name} x${qty}` : name).join(", ")
                      }`}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartKey, item.quantity - 1) : removeItem(item.cartKey)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">
                          {item.quantity === 1 ? "×" : "−"}
                        </button>
                        <span className="w-6 text-center text-xs font-semibold select-none">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(item.unitPrice * item.quantity)}</span>
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
              <p className="mt-2 text-xs text-gray-400">Thử: MOMO10 · HYLUX50K · FREESHIP · WELCOME20</p>
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
              {selectedBranch && (
                <div className={cn("mb-4 p-3 rounded-xl text-sm", orderMode === "PICKUP" ? "bg-blue-50 border border-blue-100" : "bg-emerald-50 border border-emerald-100")}>
                  <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">
                    {orderMode === "PICKUP" ? "🏪 Điểm lấy hàng" : "🛵 Giao tới"}
                  </p>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    {orderMode === "PICKUP" ? selectedBranch.address : (deliveryAddress.rawAddress || selectedBranch.name)}
                  </p>
                </div>
              )}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({itemCount} món)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {orderMode === "DELIVERY" && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí giao hàng</span>
                    {deliveryFee === 0
                      ? <span className="text-emerald-600 font-medium">Miễn phí</span>
                      : <span>{fmt(deliveryFee)}</span>
                    }
                  </div>
                )}
                {appliedPromo && appliedPromo.code !== "FREESHIP" && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá ({appliedPromo.code})</span>
                    <span>-{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Thuế VAT (8%)</span>
                  <span>{fmt(vatAmount)}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Tổng tiền <span className="text-xs font-normal text-gray-400">(Đã bao gồm VAT)</span></span>
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
