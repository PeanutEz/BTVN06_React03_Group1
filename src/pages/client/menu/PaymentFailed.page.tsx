import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTER_URL } from "@/routes/router.const";
import { useDeliveryStore } from "@/store/delivery.store";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function PaymentFailedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { hydrate, placedOrders } = useDeliveryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const order = placedOrders.find((o) => o.id === orderId);

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán chưa hoàn tất</h1>
        <p className="text-gray-500 mt-2">
          Đơn <span className="font-semibold text-amber-700">#{order.code}</span> vẫn chưa được thanh toán thành công.
        </p>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Mã giao dịch</span>
            <span className="font-mono font-semibold text-gray-900">
              {order.transaction?.transactionId ?? "--"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Số tiền</span>
            <span className="font-semibold text-gray-900">{fmt(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(ROUTER_URL.PAYMENT_PROCESS.replace(":orderId", order.id))}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            Thanh toán lại
          </button>

          <Link
            to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", order.id)}
            className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold"
          >
            Xem đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
