import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ROUTER_URL } from "@/routes/router.const";
import { useCartStore } from "@/store";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    price,
  );

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart } = useCartStore();

  const totalQuantity = items.reduce((sum, x) => sum + x.quantity, 0);
  const subtotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng trống</h1>
          <p className="text-slate-600 mt-2 mb-6">
            Bạn chưa có sản phẩm nào trong giỏ. Hãy chọn vài món nhé!
          </p>
          <button
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            onClick={() => navigate(ROUTER_URL.PRODUCTS)}
          >
            Tiếp tục mua sắm
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Giỏ hàng</h1>
          <p className="text-slate-600 mt-1">
            {totalQuantity} sản phẩm • Tạm tính: <span className="font-semibold">{formatPrice(subtotal)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={ROUTER_URL.PRODUCTS}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
          >
            + Thêm sản phẩm
          </Link>
          <button
            className="px-4 py-2 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 font-semibold text-red-700"
            onClick={() => {
              clearCart();
              toast.success("Đã xóa toàn bộ giỏ hàng");
            }}
          >
            Xóa giỏ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-2xl shadow-md p-4 flex gap-4 items-center"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-xl object-cover bg-slate-100"
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-amber-600">{formatPrice(item.price)}</span>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(item.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    className="px-3 py-2 hover:bg-slate-50"
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    aria-label="Giảm số lượng"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 font-semibold min-w-[44px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    className="px-3 py-2 hover:bg-slate-50"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[110px]">
                  <p className="text-sm text-slate-500">Thành tiền</p>
                  <p className="font-bold text-slate-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                <button
                  className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                  onClick={() => {
                    removeFromCart(item.productId);
                    toast.success("Đã xóa sản phẩm khỏi giỏ");
                  }}
                  aria-label="Xóa sản phẩm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
          <h2 className="text-xl font-bold text-slate-900">Tổng cộng</h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-slate-700">
              <span>Tạm tính</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Phí giao hàng</span>
              <span className="font-semibold">{formatPrice(0)}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">Thanh toán</span>
              <span className="text-lg font-bold text-amber-600">{formatPrice(subtotal)}</span>
            </div>
          </div>

          <button
            className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold text-lg transition-colors"
            onClick={() => toast.message("Demo: Chưa tích hợp thanh toán/đặt hàng")}
          >
            Tiến hành đặt hàng
          </button>

          <p className="text-xs text-slate-500 mt-4">
            * Đây là demo giỏ hàng. Bạn có thể tiếp tục tích hợp bước checkout/đơn hàng theo API của dự án.
          </p>
        </div>
      </div>
    </div>
  );
}
