import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect } from "react";
import { ROUTER_URL } from "@/routes/router.const";
import { useCartStore } from "@/store";
import { useAuthStore } from "@/store/auth.store";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart } = useCartStore();
  const { user } = useAuthStore();

  // 🔐 Check đăng nhập (theo egg)
  useEffect(() => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để xem giỏ hàng");
      navigate(ROUTER_URL.LOGIN);
    }
  }, [user, navigate]);

  const totalQuantity = items.reduce((sum, x) => sum + x.quantity, 0);
  const subtotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng trống</h1>
          <p className="text-slate-600 mt-2 mb-6">
            Bạn chưa có sản phẩm nào trong giỏ. Hãy chọn vài món nhé!
          </p>
          <button
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            onClick={() => navigate(ROUTER_URL.PRODUCTS)}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Breadcrumb (theo egg) */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/order"
          className="text-gray-500 hover:text-amber-600 transition-colors"
        >
          Đặt hàng
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Giỏ hàng</span>
      </nav>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Giỏ hàng</h1>
          <p className="text-slate-600 mt-1">
            {totalQuantity} sản phẩm • Tạm tính:{" "}
            <span className="font-semibold">{formatPrice(subtotal)}</span>
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

      <div className="space-y-4">
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

            <div className="flex-1">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-amber-600 font-bold">
                {formatPrice(item.price)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  updateQuantity(item.productId, Math.max(1, item.quantity - 1))
                }
              >
                -
              </button>

              <span className="font-semibold">{item.quantity}</span>

              <button
                onClick={() =>
                  updateQuantity(item.productId, item.quantity + 1)
                }
              >
                +
              </button>

              <button
                onClick={() => {
                  removeFromCart(item.productId);
                  toast.success("Đã xóa sản phẩm");
                }}
                className="text-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}