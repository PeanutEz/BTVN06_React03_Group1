import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { ROUTER_URL } from "@/routes/router.const";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);


interface MenuOrderPanelProps {
  /** Whether this panel is visible (mobile toggle) */
  visible?: boolean;
  onRequestClose?: () => void;
}

export default function MenuOrderPanel({ visible = true, onRequestClose }: MenuOrderPanelProps) {
  const navigate = useNavigate();
  const items = useMenuCartStore((s) => s.items);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const { itemCount, subtotal, deliveryFee, total } = useMenuCartTotals();

  // Empty cart
  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", !visible && "hidden lg:flex")}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-sm">Đơn hàng của bạn</h2>
          {onRequestClose && (
            <button onClick={onRequestClose} className="lg:hidden text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="text-5xl mb-3">🛒</div>
          <p className="font-semibold text-gray-700 mb-1 text-sm">Giỏ hàng trống</p>
          <p className="text-xs text-gray-400">Chọn đồ uống từ menu để đặt hàng nhé!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", !visible && "hidden lg:flex")}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
        <h2 className="font-bold text-gray-900 text-sm">
          Đơn hàng <span className="text-gray-400 font-normal">({itemCount} món)</span>
        </h2>
        {onRequestClose && (
          <button onClick={onRequestClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content: items + summary + button all flow together */}
      <div className="flex-1 overflow-y-auto">
        {/* Cart items */}
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.cartKey} className="px-4 py-3 flex gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-xs truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Size {item.options.size} · {item.options.sugar} đường · {item.options.ice}
                  {item.options.toppings.length > 0 &&
                    ` · ${item.options.toppings.map((t) => t.name).join(", ")}`}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        item.quantity > 1
                          ? updateQuantity(item.cartKey, item.quantity - 1)
                          : removeItem(item.cartKey)
                      }
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-xs"
                    >
                      {item.quantity === 1 ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      ) : "−"}
                    </button>
                    <span className="w-5 text-center text-[11px] font-semibold select-none">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{fmt(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="mx-4 my-3 bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs">
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
            <p className="text-[10px] text-gray-400">Miễn phí giao hàng cho đơn từ {fmt(150000)}</p>
          )}
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between font-bold text-sm text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-amber-600">{fmt(total)}</span>
          </div>
        </div>

        {/* CTA — sticky at bottom of scroll area */}
        <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
          <button
            onClick={() => navigate(ROUTER_URL.CHECKOUT)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Xác nhận đặt hàng · {fmt(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
