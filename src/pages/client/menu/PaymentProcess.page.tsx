import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROUTER_URL } from "@/routes/router.const";
import { useDeliveryStore } from "@/store/delivery.store";
import {
  cancelPayment,
  retryPayment,
  verifyPayment,
} from "@/services/payment.service";
import { PAYMENT_STATUS_CONFIG } from "@/types/delivery.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);

export default function PaymentProcessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { hydrate, placedOrders, updateOrderPayment } = useDeliveryStore();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const foundOrder = useMemo(
    () => placedOrders.find((o) => o.id === orderId),
    [placedOrders, orderId],
  );

  if (!foundOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-2xl p-6 text-center max-w-md">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-xl font-bold text-gray-900">
            Không tìm thấy đơn hàng
          </h1>
          <p className="text-sm text-gray-500 mt-2 mb-5">
            Đơn hàng không tồn tại hoặc đã bị xoá.
          </p>

          <Link
            to={ROUTER_URL.MENU}
            className="inline-flex px-5 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
          >
            Quay lại menu
          </Link>
        </div>
      </div>
    );
  }

  const order = foundOrder;
  const paymentCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus];

  async function handleConfirmPaid() {
    const currentOrder = order;

    setSubmitting(true);

    try {
      const status = await verifyPayment(currentOrder);

      if (status === "PAID") {
        updateOrderPayment(currentOrder.id, "PAID", {
          ...currentOrder.transaction!,
          status: "PAID",
          paidAt: new Date().toISOString(),
        });

        toast.success("Thanh toán thành công!");

        navigate(
          ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", currentOrder.id),
        );

        return;
      }

      updateOrderPayment(currentOrder.id, "FAILED", {
        ...currentOrder.transaction!,
        status: "FAILED",
      });

      toast.error("Thanh toán thất bại");

      navigate(
        ROUTER_URL.PAYMENT_FAILED.replace(":orderId", currentOrder.id),
      );
    } catch (error) {
      console.error(error);
      toast.error("Không thể xác minh thanh toán");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    const currentOrder = order;

    setSubmitting(true);

    try {
      const next = await retryPayment(currentOrder);

      updateOrderPayment(currentOrder.id, "PENDING", {
        transactionId: next.transactionId,
        provider: currentOrder.paymentMethod,
        status: "PENDING",
        amount: currentOrder.total,
        createdAt: new Date().toISOString(),
        qrCodeUrl: next.qrCodeUrl,
        deeplink: next.deeplink,
        paymentUrl: next.paymentUrl,
        note: next.note,
      });

      toast.success("Đã tạo lại giao dịch thanh toán");
    } catch (error) {
      console.error(error);
      toast.error("Không thể thanh toán lại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelPayment() {
    const currentOrder = order;

    setSubmitting(true);

    try {
      const status = await cancelPayment();

      updateOrderPayment(currentOrder.id, status, {
        ...currentOrder.transaction!,
        status,
      });

      toast.success("Đã huỷ thanh toán");

      navigate(
        ROUTER_URL.PAYMENT_FAILED.replace(":orderId", currentOrder.id),
      );
    } catch (error) {
      console.error(error);
      toast.error("Không thể huỷ thanh toán");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-5">
          <Link to={ROUTER_URL.HOME} className="hover:text-gray-600">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600">
            Menu
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            Thanh toán #{order.code}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Hoàn tất thanh toán
                </h1>

                <p className="text-sm text-gray-500 mt-1">
                  Mã đơn{" "}
                  <span className="font-semibold text-amber-700">
                    {order.code}
                  </span>
                </p>
              </div>

              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                  paymentCfg.bg,
                  paymentCfg.color,
                )}
              >
                {paymentCfg.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Phương thức</p>

                  <p className="font-semibold text-gray-900">
                    {order.paymentMethod === "BANK" && "🏦 Chuyển khoản / QR"}
                    {order.paymentMethod === "MOMO" && "🟣 Ví MoMo"}
                    {order.paymentMethod === "ZALOPAY" && "🔵 ZaloPay"}
                    {order.paymentMethod === "SHOPEEPAY" && "🟠 ShopeePay"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Số tiền</p>

                  <p className="text-2xl font-bold text-amber-600">
                    {fmt(order.total)}
                  </p>
                </div>

                {order.transaction?.transactionId && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Mã giao dịch</p>

                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {order.transaction.transactionId}
                    </p>
                  </div>
                )}

                {order.transaction?.note && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    {order.transaction.note}
                  </div>
                )}

                {order.transaction?.deeplink && (
                  <a
                    href={order.transaction.deeplink}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-3 bg-gray-900 text-white font-semibold hover:bg-black"
                  >
                    Mở ứng dụng thanh toán
                  </a>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                {order.transaction?.qrCodeUrl ? (
                  <>
                    <img
                      src={order.transaction.qrCodeUrl}
                      alt="QR thanh toán"
                      className="w-64 h-64 rounded-xl border bg-white object-cover"
                    />

                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Quét mã QR để thanh toán đơn hàng
                    </p>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">💳</div>

                    <p className="text-sm text-gray-600">
                      Xác nhận thanh toán để tiếp tục xử lý đơn hàng
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleConfirmPaid}
                disabled={submitting}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Đang xác minh..." : "Tôi đã thanh toán"}
              </button>

              <button
                onClick={handleRetry}
                disabled={submitting}
                className="px-5 py-3 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 font-semibold disabled:opacity-60"
              >
                Thanh toán lại
              </button>

              <button
                onClick={handleCancelPayment}
                disabled={submitting}
                className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold disabled:opacity-60"
              >
                Huỷ thanh toán
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
            <h2 className="font-semibold text-gray-900 mb-4">
              Tóm tắt đơn hàng
            </h2>

            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.cartKey} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover border"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      x{item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính</span>
                <span>{fmt(order.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Phí giao hàng</span>
                <span>{fmt(order.deliveryFee)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">VAT</span>
                <span>{fmt(order.vatAmount)}</span>
              </div>

              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                <span>Tổng thanh toán</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}