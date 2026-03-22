import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function getPaymentStatusLabel(status?: string) {
  switch (status?.toUpperCase()) {
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return "Đã thanh toán";
    case "REFUNDED":
      return "Đã hoàn tiền";
    case "FAILED":
      return "Thanh toán thất bại";
    case "CANCELLED":
      return "Đã huỷ";
    case "PENDING":
      return "Chờ thanh toán";
    default:
      return "Chờ thanh toán";
  }
}

export default function PaymentSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["payment-success-order", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-success-payment", orderId],
    queryFn: () => paymentClient.getPaymentByOrderId(orderId!),
    enabled: !!orderId,
  });

  const isLoading = orderLoading || paymentLoading;
  const displayAmount = order?.final_amount ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">Đang tải thông tin thanh toán...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl p-6 text-center max-w-md">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-xl font-bold text-gray-900">Không tìm thấy đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-2 mb-5">Đơn hàng không tồn tại hoặc đã bị xoá.</p>
          <Link to={ROUTER_URL.MENU} className="inline-flex px-5 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
            Quay lại menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán thành công</h1>
        <p className="text-gray-500 mt-2">
          Giao dịch cho đơn <span className="font-semibold text-amber-700">#{order.code}</span> đã được xác nhận.
        </p>

        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
          {payment?.provider_txn_id && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Mã giao dịch</span>
              <span className="font-mono font-semibold text-gray-900">{payment.provider_txn_id}</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Số tiền</span>
            <span className="font-semibold text-gray-900">{fmt(displayAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Trạng thái</span>
            {/* ✅ Use payment status from API, fallback to PAID if payment missing */}
            <span className="font-semibold text-green-700">{getPaymentStatusLabel(payment?.status ?? "PAID")}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId!)}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            Xem trạng thái đơn hàng
          </Link>
          <Link
            to={ROUTER_URL.MENU}
            className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold"
          >
            Tiếp tục đặt món
          </Link>
        </div>
      </div>
    </div>
  );
}
