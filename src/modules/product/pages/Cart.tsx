import { Link, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "@/routes/router.const";
import { useCartStore } from "@/store";
import { toast } from "sonner";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

export default function Cart() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  if (!items.length) {
    return (
      <div className="py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Giỏ hàng trống</h1>
          <p className="text-slate-600 mb-8">Hãy thêm một vài sản phẩm để bắt đầu mua sắm nhé.</p>
          <Link
            to={ROUTER_URL.PRODUCTS}
            className="inline-flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            Tiếp tục mua sắm
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Giỏ hàng</h1>
            <p className="text-slate-600 mt-1">Bạn đang có {totalItems()} sản phẩm trong giỏ.</p>
          </div>
          <button
            onClick={() => {
              clearCart();
              toast.success("Đã xóa toàn bộ giỏ hàng");
            }}
            className="text-sm font-semibold text-red-700 hover:text-red-800 hover:underline"
          >
            Xóa tất cả
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div
                key={it.product.id}
                className="bg-white rounded-2xl shadow-md border border-red-50 p-4 sm:p-5 flex gap-4"
              >
                <img
                  src={it.product.image}
                  alt={it.product.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 line-clamp-1">{it.product.name}</p>
                      <p className="text-sm text-slate-600 mt-1">{formatPrice(it.product.price)}</p>
                      <p className="text-xs text-slate-500 mt-1">Tồn kho: {it.product.stock}</p>
                    </div>
                    <button
                      onClick={() => {
                        removeFromCart(it.product.id);
                        toast.success("Đã xóa sản phẩm khỏi giỏ");
                      }}
                      className="text-slate-500 hover:text-red-700 transition-colors"
                      aria-label="Xóa"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(it.product.id, it.quantity - 1)}
                        className="px-4 py-2 hover:bg-slate-50 transition-colors"
                      >
                        -
                      </button>
                      <span className="px-5 py-2 font-semibold">{it.quantity}</span>
                      <button
                        onClick={() => setQuantity(it.product.id, it.quantity + 1)}
                        className="px-4 py-2 hover:bg-slate-50 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-bold text-red-800">
                      {formatPrice(it.quantity * it.product.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-red-50 p-6 h-fit sticky top-28">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Tóm tắt đơn hàng</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tạm tính</span>
                <span className="font-semibold">{formatPrice(totalPrice())}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Phí vận chuyển</span>
                <span className="font-semibold">{formatPrice(0)}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-slate-900 font-bold">Tổng cộng</span>
                <span className="text-red-800 font-extrabold text-lg">{formatPrice(totalPrice())}</span>
              </div>
            </div>

            <button
              onClick={() => {
                toast.message("Chuyển sang trang đặt hàng");
                navigate(ROUTER_URL.ORDER);
              }}
              className="mt-6 w-full bg-red-800 hover:bg-red-900 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Tiến hành đặt hàng
            </button>

            <Link
              to={ROUTER_URL.PRODUCTS}
              className="mt-3 w-full inline-flex justify-center text-sm font-semibold text-red-700 hover:text-red-800 hover:underline"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
