import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { ROUTER_URL } from "@/routes/router.const";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useMenuCartStore((s) => s.items);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const clearCart = useMenuCartStore((s) => s.clearCart);
  const { itemCount, subtotal, deliveryFee, total } = useMenuCartTotals();
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);
    await new Promise((r) => setTimeout(r, 1200));
    clearCart();
    setIsConfirming(false);
    toast.success("Đặt hàng thành công! 🎉", {
      description: "Chúng tôi sẽ liên hệ xác nhận qua số điện thoại trong vài phút.",
    });
    navigate(ROUTER_URL.MENU);
  }

  /* ── Empty cart ── */
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
        <p className="text-sm text-gray-500 mb-6">Hãy chọn thêm đồ uống để đặt hàng nhé!</p>
        <Link
          to={ROUTER_URL.MENU}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          ← Quay lại Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 lg:pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to={ROUTER_URL.HOME} className="hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600 transition-colors">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Xác nhận đơn hàng</h1>

        <div className="space-y-4">

          {/* ── Order items ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">
                Đơn hàng
                <span className="text-gray-400 font-normal ml-1">({itemCount} món)</span>
              </h2>
              <Link
                to={ROUTER_URL.MENU}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                + Thêm món
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div key={item.cartKey} className="px-5 py-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Size {item.options.size}
                      {" · "}{item.options.sugar} đường
                      {" · "}{item.options.ice}
                      {item.options.toppings.length > 0 && (
                        <> · {item.options.toppings.map((t) => t.name).join(", ")}</>
                      )}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.cartKey, item.quantity - 1)
                              : removeItem(item.cartKey)
                          }
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                          aria-label="Giảm số lượng"
                        >
                          {item.quantity === 1 ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          ) : "−"}
                        </button>
                        <span className="w-7 text-center text-xs font-semibold select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                      </div>

                      {/* Line price */}
                      <span className="text-sm font-bold text-gray-900">
                        {fmt(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pricing summary ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-2.5 text-sm">
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
                <div className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Thêm <strong>{fmt(150000 - subtotal)}</strong> để được miễn phí giao hàng</span>
                </div>
              )}

              <div className="h-px bg-gray-100 my-1" />

              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-extrabold text-amber-600 tracking-tight">
                  {fmt(total)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Payment method (bank transfer only) ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Phương thức thanh toán</h2>

            {/* Bank transfer card — pre-selected, no toggle */}
            <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl shrink-0">
                  🏦
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Chuyển khoản ngân hàng</p>
                  <p className="text-xs text-gray-500 mt-0.5">Quét mã QR hoặc chuyển khoản thủ công</p>
                </div>
                <div className="ml-auto w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Bank account info */}
              <div className="bg-white rounded-xl border border-amber-200 divide-y divide-gray-50 text-sm overflow-hidden">
                {[
                  { label: "Ngân hàng", value: "Vietcombank" },
                  { label: "Số tài khoản", value: "1234567890", mono: true },
                  { label: "Chủ tài khoản", value: "HYLUX COFFEE" },
                  { label: "Nội dung CK", value: `HYLUX ${Date.now().toString().slice(-6)}`, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-gray-500 text-xs">{label}</span>
                    <span className={`font-semibold text-gray-900 text-xs ${mono ? "font-mono tracking-wide" : ""}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-amber-700/80 mt-3 text-center leading-relaxed">
                Đơn hàng sẽ được xác nhận sau khi nhận được thanh toán.
                <br />Vui lòng chụp ảnh màn hình sau khi chuyển khoản.
              </p>
            </div>
          </div>
        </div>

        {/* ── Confirm button (desktop, inline) ── */}
        <div className="hidden lg:block mt-6">
          <ConfirmButton isConfirming={isConfirming} total={total} onClick={handleConfirm} />
        </div>
      </div>

      {/* ── Confirm button (mobile, sticky bottom) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
        <ConfirmButton isConfirming={isConfirming} total={total} onClick={handleConfirm} />
      </div>
    </div>
  );
}

/* ── Shared confirm button ── */
function ConfirmButton({
  isConfirming,
  total,
  onClick,
}: {
  isConfirming: boolean;
  total: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isConfirming}
      className={`
        w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm
        transition-all duration-200 shadow-sm
        ${isConfirming
          ? "bg-amber-300 cursor-not-allowed text-white"
          : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-amber-200"
        }
      `}
    >
      {isConfirming ? (
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
          Xác nhận thanh toán · {fmt(total)}
        </>
      )}
    </button>
  );
}
