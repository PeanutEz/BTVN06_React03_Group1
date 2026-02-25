import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
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
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "MOMO" | "VNPAY">("COD");

  // 🔐 Check đăng nhập (theo egg)
  useEffect(() => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để xem giỏ hàng");
      navigate(ROUTER_URL.LOGIN);
    }
  }, [user, navigate]);

  const totalQuantity = items.reduce((sum, x) => sum + x.quantity, 0);
  const subtotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const shippingFee = useMemo(() => (subtotal > 300000 ? 0 : 15000), [subtotal]);
  const discount = useMemo(() => (subtotal >= 500000 ? Math.floor(subtotal * 0.05) : 0), [subtotal]);
  const finalTotal = subtotal + shippingFee - discount;

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
            onClick={() => navigate(ROUTER_URL.MENU)}
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
          to={ROUTER_URL.MENU}
          className="text-gray-500 hover:text-amber-600 transition-colors"
        >
          Menu
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
            to={ROUTER_URL.MENU}
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Checkout thanh toán</h2>

          <p className="text-sm text-slate-600 mb-3">Chọn phương thức thanh toán</p>
          <div className="space-y-2">
            {[
              { key: "COD", label: "Thanh toán khi nhận hàng (COD)", note: "Thanh toán tiền mặt khi nhận đơn" },
              { key: "MOMO", label: "Ví MoMo", note: "Quét QR hoặc thanh toán qua ứng dụng MoMo" },
              { key: "VNPAY", label: "VNPay", note: "Thanh toán qua thẻ ATM / Visa / Mastercard" },
            ].map((method) => (
              <label
                key={method.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  paymentMethod === method.key
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-amber-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  checked={paymentMethod === method.key}
                  onChange={() => setPaymentMethod(method.key as "COD" | "MOMO" | "VNPAY")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-900">{method.label}</span>
                  <span className="block text-sm text-slate-500">{method.note}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <aside className="bg-white rounded-2xl shadow-md p-5 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tóm tắt đơn hàng</h3>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span>{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Giảm giá</span>
              <span>{discount > 0 ? `- ${formatPrice(discount)}` : formatPrice(0)}</span>
            </div>
          </div>

          <div className="my-4 h-px bg-slate-200" />

          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-slate-900">Tổng thanh toán</span>
            <span className="text-xl font-bold text-amber-600">{formatPrice(finalTotal)}</span>
          </div>

          <button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold transition-colors"
            onClick={() => {
              toast.success(`Đặt hàng thành công với phương thức ${paymentMethod}`);
              clearCart();
              navigate(ROUTER_URL.MENU);
            }}
          >
            Tiến hành thanh toán
          </button>
        </aside>
      </section>
    </div>
  );
}