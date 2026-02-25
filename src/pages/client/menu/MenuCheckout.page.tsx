import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import type { CheckoutForm } from "@/types/menu.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const INIT_FORM: CheckoutForm = {
  name: "",
  phone: "",
  address: "",
  note: "",
  paymentMethod: "CASH",
};

function InputField({
  label,
  required,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-200 bg-red-50"
            : "border-gray-200 focus:ring-amber-300 focus:border-amber-400 bg-white",
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function MenuCheckoutPage() {
  const navigate = useNavigate();
  const items = useMenuCartStore((s) => s.items);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const clearCart = useMenuCartStore((s) => s.clearCart);
  const { itemCount, subtotal, deliveryFee, total } = useMenuCartTotals();

  const [form, setForm] = useState<CheckoutForm>(INIT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [isOrdering, setIsOrdering] = useState(false);

  function setField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ";
    if (!form.address.trim()) e.address = "Vui lòng nhập địa chỉ giao hàng";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleOrder() {
    if (!validate()) return;
    setIsOrdering(true);
    await new Promise((r) => setTimeout(r, 1400));
    clearCart();
    setIsOrdering(false);
    toast.success("Đặt hàng thành công! 🎉", {
      description: "Chúng tôi sẽ liên hệ xác nhận trong vài phút.",
    });
    navigate("/menu");
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 text-sm mb-6">Hãy chọn thêm đồ uống để đặt hàng nhé!</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            ← Quay lại Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-600 transition-colors">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 tracking-tight">
          Xác nhận đơn hàng
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* ── Left ── */}
          <div className="space-y-6">
            {/* Cart items */}
            <section className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Sản phẩm <span className="text-gray-400 font-normal text-sm">({itemCount} món)</span>
                </h2>
                <Link to="/menu" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  + Thêm món
                </Link>
              </div>

              {items.map((item) => (
                <div key={item.cartKey} className="px-5 py-4 flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Size {item.options.size} • {item.options.sugar} đường • {item.options.ice}
                      {item.options.toppings.length > 0 &&
                        ` • ${item.options.toppings.map((t) => t.name).join(", ")}`}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.cartKey, item.quantity - 1)
                              : removeItem(item.cartKey)
                          }
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {item.quantity === 1 ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          ) : (
                            "−"
                          )}
                        </button>
                        <span className="w-6 text-center text-xs font-semibold select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {fmt(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Delivery info */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 mb-1">Thông tin giao hàng</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Họ và tên"
                  required
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => setField("name", (e.target as HTMLInputElement).value)}
                  error={errors.name}
                />
                <InputField
                  label="Số điện thoại"
                  required
                  placeholder="0901234567"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", (e.target as HTMLInputElement).value)}
                  error={errors.phone}
                />
              </div>

              <InputField
                label="Địa chỉ giao hàng"
                required
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                value={form.address}
                onChange={(e) => setField("address", (e.target as HTMLInputElement).value)}
                error={errors.address}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú cho cửa hàng (không cần thiết)..."
                  value={form.note}
                  onChange={(e) => setField("note", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 text-sm outline-none transition-all resize-none"
                />
              </div>
            </section>

            {/* Payment method */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { value: "CASH", label: "Tiền mặt", icon: "💵", desc: "Thanh toán khi nhận hàng" },
                    { value: "BANK", label: "Chuyển khoản", icon: "🏦", desc: "QR code / tài khoản ngân hàng" },
                  ] as const
                ).map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setField("paymentMethod", method.value)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150",
                      form.paymentMethod === method.value
                        ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                        : "border-gray-200 hover:border-gray-300 bg-white",
                    )}
                  >
                    <span className="text-2xl shrink-0">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{method.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{method.desc}</p>
                    </div>
                    <div
                      className={cn(
                        "ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-all",
                        form.paymentMethod === method.value
                          ? "border-amber-500 bg-amber-500"
                          : "border-gray-300",
                      )}
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: Summary ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({itemCount} món)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí giao hàng</span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-medium">Miễn phí</span>
                  ) : (
                    <span>{fmt(deliveryFee)}</span>
                  )}
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                    Miễn phí giao hàng cho đơn từ {fmt(150000)}
                  </p>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Tổng cộng</span>
                  <span className="text-amber-600">{fmt(total)}</span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                disabled={isOrdering}
                className={cn(
                  "mt-6 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150",
                  isOrdering
                    ? "bg-amber-300 cursor-not-allowed text-white"
                    : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200",
                )}
              >
                {isOrdering ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Xác nhận đặt hàng
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Bằng cách đặt hàng, bạn đồng ý với
                <span className="text-amber-600 cursor-pointer hover:underline ml-1">Điều khoản dịch vụ</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
