import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROUTER_URL } from "@/routes/router.const";
import { PAYMENT_METHODS } from "@/const/payment-method.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function paymentStatusLabel(status?: string) {
  switch (status?.toUpperCase()) {
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return { label: "Đã thanh toán", bg: "bg-green-50", color: "text-green-700", border: "border-green-200" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", bg: "bg-blue-50", color: "text-blue-700", border: "border-blue-200" };
    case "FAILED":
      return { label: "Thanh toán thất bại", bg: "bg-red-50", color: "text-red-700", border: "border-red-200" };
    case "CANCELLED":
      return { label: "Đã huỷ", bg: "bg-gray-50", color: "text-gray-700", border: "border-gray-200" };
    default:
      return { label: "Chờ thanh toán", bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" };
  }
}

function isPaidStatus(status?: string) {
  return ["PAID", "CONFIRMED", "COMPLETED"].includes(String(status ?? "").toUpperCase());
}

export default function PaymentProcessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["payment-order", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-by-order", orderId],
    queryFn: () => paymentClient.getPaymentByOrderId(orderId!),
    enabled: !!orderId,
  });

  // ✅ Redirect to success if payment is already paid on load
  useEffect(() => {
    if (!paymentLoading && payment && isPaidStatus(payment.status) && orderId) {
      navigate(ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", orderId));
    }
  }, [payment?.status, paymentLoading, orderId, navigate]);

  const isLoading = orderLoading || paymentLoading;
  const paymentId = payment?._id ?? payment?.id ?? "";
  const statusCfg = paymentStatusLabel(payment?.status);
  const paymentMissing = !paymentId;
  const paymentAlreadyPaid = isPaidStatus(payment?.status);
  const paymentRefunded = String(payment?.status ?? "").toUpperCase() === "REFUNDED";
  const paymentFailed = String(payment?.status ?? "").toUpperCase() === "FAILED";
  const cannotProcess = paymentRefunded || paymentFailed;
  // ✅ Use final_amount from API directly (backend already calculated discount)
  const displayAmount = order?.final_amount ?? 0;

  async function handleConfirmPaid() {
    if (!paymentId || submitting) return;

    // ✅ NEW: Check current status is PENDING before confirming
    if (payment?.status?.toUpperCase() !== "PENDING") {
      toast.error("Chỉ có thể xác nhận thanh toán ở trạng thái chờ xử lý");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ Confirm payment with minimal required fields
      const result = await paymentClient.confirmPayment(paymentId, {
        method: payment?.method ?? PAYMENT_METHODS.CASH,
      });

      if (!result) {
        toast.error("Không nhận được phản hồi từ server");
        return;
      }

      const newStatus = result.status?.toUpperCase();
      if (!newStatus) {
        toast.error("Lỗi: không thể xác định trạng thái thanh toán");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["payment-by-order", orderId] });

      if (isPaidStatus(newStatus)) {
        toast.success("Thanh toán thành công!");
        if (orderId) navigate(ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", orderId));
      } else {
        toast.error("Thanh toán thất bại");
        if (orderId) navigate(ROUTER_URL.PAYMENT_FAILED.replace(":orderId", orderId));
      }
    } catch (error) {
      console.error(error);

      // ✅ Better error handling - differentiate error types
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          toast.error("Đơn hàng hoặc thanh toán không tồn tại");
        } else if (error.message.includes("409")) {
          toast.error("Xung đột: một yêu cầu khác đang xử lý");
        } else if (error.message.includes("Network")) {
          toast.error("Lỗi kết nối. Vui lòng kiểm tra internet và thử lại");
        } else {
          toast.error("Không thể xác minh thanh toán. Vui lòng thử lại");
        }
      } else {
        toast.error("Không thể xác minh thanh toán. Vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefund() {
    if (!paymentId || submitting) return;

    // ✅ Can't refund if already refunded or failed
    if (paymentRefunded || paymentFailed) {
      toast.error("Không thể hoàn tiền cho trạng thái này");
      return;
    }

    setSubmitting(true);
    try {
      await paymentClient.refundPayment(paymentId, { refund_reason: "Khách hàng yêu cầu huỷ" });
      queryClient.invalidateQueries({ queryKey: ["payment-by-order", orderId] });
      toast.success("Đã huỷ thanh toán");
      if (orderId) navigate(ROUTER_URL.PAYMENT_FAILED.replace(":orderId", orderId));
    } catch (error) {
      console.error(error);

      // ✅ Better error handling
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          toast.error("Thanh toán không tồn tại");
        } else if (error.message.includes("409")) {
          toast.error("Xung đột: một yêu cầu khác đang xử lý");
        } else {
          toast.error("Không thể huỷ thanh toán. Vui lòng thử lại");
        }
      } else {
        toast.error("Không thể huỷ thanh toán. Vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">Đang tải thanh toán...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-5">
          <Link to={ROUTER_URL.HOME} className="hover:text-gray-600">Trang chủ</Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán #{order.code}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hoàn tất thanh toán</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Mã đơn <span className="font-semibold text-amber-700">{order.code}</span>
                </p>
              </div>
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                {statusCfg.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Phương thức</p>
                  <p className="font-semibold text-gray-900">{payment?.method ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Số tiền</p>
                  <p className="text-2xl font-bold text-amber-600">{fmt(displayAmount)}</p>
                </div>
                {payment?.provider_txn_id && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Mã giao dịch</p>
                    <p className="font-mono text-sm font-semibold text-gray-900">{payment.provider_txn_id}</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">💳</div>
                  <p className="text-sm text-gray-600">Xác nhận thanh toán để tiếp tục xử lý đơn hàng</p>
                  {paymentMissing && (
                    <p className="text-xs text-red-500 mt-3 max-w-xs mx-auto">
                      Đơn hàng này chưa có bản ghi payment từ backend nên hiện chưa thể xác nhận hoặc hoàn tiền.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {paymentMissing && (
                <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Không tìm thấy payment theo order này. Theo bộ API hiện tại, frontend chỉ xử lý được payment đã tồn tại sẵn.
                </div>
              )}
              {paymentFailed && (
                <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  ⚠️ Thanh toán thất bại. Vui lòng quay lại menu và thử đặt lại đơn hàng.
                </div>
              )}
              {paymentRefunded && (
                <div className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  ℹ️ Thanh toán đã bị huỷ/hoàn tiền. Vui lòng liên hệ cửa hàng để được hỗ trợ.
                </div>
              )}
              <button
                onClick={handleConfirmPaid}
                disabled={submitting || paymentMissing || paymentAlreadyPaid || cannotProcess}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
              >
                {paymentAlreadyPaid ? "Đã thanh toán" : paymentFailed ? "Thất bại - không thể xác nhận" : paymentRefunded ? "Đã hoàn tiền - không thể xác nhận" : submitting ? "Đang xác minh..." : "Xác nhận đã thanh toán"}
              </button>
              <button
                onClick={handleRefund}
                disabled={submitting || paymentMissing || paymentRefunded || paymentFailed || paymentAlreadyPaid}
                className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold disabled:opacity-60"
              >
                Hoàn tiền / huỷ thanh toán
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
            <h2 className="font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>
            <div className="space-y-3">
              {(order.items ?? []).map((item, idx) => (
                <div key={item._id ?? item.id ?? `item-${idx}`} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.product_name_snapshot}</p>
                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{fmt(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t">
              <div className="flex justify-between font-bold text-sm text-gray-900">
                <span>Tổng thanh toán</span>
                <span className="text-amber-600">{fmt(displayAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
