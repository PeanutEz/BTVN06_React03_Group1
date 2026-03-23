import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ROUTER_URL } from "@/routes/router.const";
import { PAYMENT_METHODS } from "@/const/payment-method.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

type ApiPaymentMethod = "COD" | "MOMO" | "CARD";

function normalizePaymentMethod(method?: string): ApiPaymentMethod | null {
  const raw = String(method ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (raw === "MOMO") return "MOMO";
  if (raw === "CARD" || raw === "VNPAY" || raw === "BANK" || raw === "BANK_TRANSFER") return "CARD";
  if (raw === "COD" || raw === "CASH") return "COD";
  return null;
}

function paymentStatusLabel(status?: string): string {
  switch (String(status ?? "").toUpperCase()) {
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return "Đã thanh toán";
    case "UNPAID":
      return "Chưa thanh toán";
    case "PENDING":
      return "Chờ thanh toán";
    case "REFUNDED":
      return "Đã hoàn tiền";
    case "FAILED":
      return "Thanh toán thất bại";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return "Chờ thanh toán";
  }
}

function paymentStatusClass(status?: string): string {
  switch (String(status ?? "").toUpperCase()) {
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    case "REFUNDED":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "UNPAID":
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function paymentMethodLabel(method: ApiPaymentMethod | null): string {
  if (method === "MOMO") return "MoMo";
  if (method === "CARD") return "VNPAY / Thẻ";
  if (method === "COD") return "Tiền mặt (COD)";
  return "Chưa có từ API";
}

function isPaidStatus(status?: string): boolean {
  return ["PAID", "CONFIRMED", "COMPLETED"].includes(String(status ?? "").toUpperCase());
}

function getErrorText(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes("404")) return "Đơn hàng hoặc thanh toán không tồn tại";
  if (error.message.includes("409")) return "Có yêu cầu khác đang xử lý, vui lòng thử lại";
  if (error.message.toLowerCase().includes("network")) return "Lỗi kết nối, vui lòng kiểm tra internet";
  return fallback;
}

export default function PaymentProcessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [providerTxnId, setProviderTxnId] = useState("");
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

  useEffect(() => {
    if (!paymentLoading && payment && isPaidStatus(payment.status) && orderId) {
      navigate(ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", orderId));
    }
  }, [paymentLoading, payment, orderId, navigate]);

  const orderItems = useMemo(() => {
    const raw = order as Record<string, unknown> | null;
    const direct = Array.isArray(order?.items) ? order.items : [];
    const fallback = Array.isArray(raw?.order_items) ? (raw?.order_items as typeof direct) : [];
    return direct.length > 0 ? direct : fallback;
  }, [order]);

  const isLoading = orderLoading || paymentLoading;
  const paymentId = payment?._id ?? payment?.id ?? "";
  const statusRaw = String(payment?.status ?? "").toUpperCase();
  const statusText = paymentStatusLabel(payment?.status);
  const statusClass = paymentStatusClass(payment?.status);
  const rawMethod = String(payment?.method ?? "").trim().toUpperCase();
  const method = normalizePaymentMethod(rawMethod);
  const methodText = paymentMethodLabel(method);

  const paymentMissing = !paymentId;
  const paymentFailed = statusRaw === "FAILED";
  const paymentRefunded = statusRaw === "REFUNDED";
  const paymentAlreadyPaid = isPaidStatus(statusRaw);
  const isPendingOrUnpaid = statusRaw === "PENDING" || statusRaw === "UNPAID";
  const requiresProviderTxn = method === "MOMO" || method === "CARD";

  const amount = order?.final_amount ?? order?.total_amount ?? 0;
  const canConfirm = !submitting && !paymentMissing && !paymentAlreadyPaid && !paymentFailed && !paymentRefunded;
  const canRefund = !submitting && !paymentMissing && !paymentAlreadyPaid && !paymentFailed && !paymentRefunded;

  async function handleConfirmPayment() {
    if (!paymentId || submitting) return;

    if (!method) {
      toast.error("Payment chưa có phương thức thanh toán từ backend");
      return;
    }

    if (!isPendingOrUnpaid) {
      toast.error("Chỉ xác nhận khi payment ở trạng thái chờ thanh toán");
      return;
    }

    if (requiresProviderTxn && !providerTxnId.trim()) {
      toast.error("Vui lòng nhập providerTxnId");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ Confirm payment with minimal required fields
      const result = await paymentClient.confirmPayment(paymentId, {
        method,
        providerTxnId: requiresProviderTxn ? providerTxnId.trim() : undefined,
      });

      if (!result) {
        toast.error("Không nhận được phản hồi từ server");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["payment-by-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["payment-success-payment", orderId] });

      if (isPaidStatus(result.status)) {
        toast.success("Thanh toán thành công");
        if (orderId) navigate(ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", orderId));
      } else {
        toast.error("Thanh toán chưa thành công");
        if (orderId) navigate(ROUTER_URL.PAYMENT_FAILED.replace(":orderId", orderId));
      }
    } catch (error) {
      toast.error(getErrorText(error, "Không thể xác nhận thanh toán"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefundPayment() {
    if (!paymentId || submitting) return;

    setSubmitting(true);
    try {
      await paymentClient.refundPayment(paymentId, { refund_reason: "Khách hàng yêu cầu hủy" });
      queryClient.invalidateQueries({ queryKey: ["payment-by-order", orderId] });
      toast.success("Đã hủy thanh toán");
      if (orderId) navigate(ROUTER_URL.PAYMENT_FAILED.replace(":orderId", orderId));
    } catch (error) {
      toast.error(getErrorText(error, "Không thể hủy thanh toán"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-sm text-gray-600">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-gray-200 rounded-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Không tìm thấy đơn hàng</h1>
          <p className="text-sm text-gray-600 mt-2">Đơn hàng không tồn tại hoặc đã bị xóa.</p>
          <Link
            to={ROUTER_URL.MENU}
            className="inline-flex mt-4 px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Quay lại menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-l-4 border-amber-500 pl-3">
          <h1 className="text-2xl font-semibold text-gray-900">Payment Process</h1>
          <p className="text-sm text-gray-600 mt-1">Xử lý thanh toán cho đơn #{order.code}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-6">
          <section className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>Thông tin payment</span>
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Mã đơn</span>
                <span className="font-medium text-gray-900">#{order.code}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Trạng thái</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusClass}`}>{statusText}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Phương thức</span>
                <span className="font-medium text-indigo-700">{methodText}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">API method raw</span>
                <span className="font-mono text-xs text-amber-700">{rawMethod || "(empty)"}</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-gray-600">Số tiền</span>
                <span className="font-semibold text-gray-900">{fmt(amount)}</span>
              </div>
            </div>

            {requiresProviderTxn && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">providerTxnId</label>
                <input
                  value={providerTxnId}
                  onChange={(e) => setProviderTxnId(e.target.value)}
                  placeholder="Nhập mã giao dịch"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            )}

            {paymentMissing && (
              <p className="mt-4 text-sm text-red-600">Không tìm thấy payment theo order này.</p>
            )}
            {paymentFailed && (
              <p className="mt-4 text-sm text-red-600">Payment đang ở trạng thái thất bại.</p>
            )}
            {paymentRefunded && (
              <p className="mt-4 text-sm text-gray-700">Payment đã được hoàn tiền hoặc hủy.</p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmPayment}
                disabled={!canConfirm}
                className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </button>
              <button
                onClick={handleRefundPayment}
                disabled={!canRefund}
                className="px-4 py-2 rounded-md border border-sky-200 bg-sky-50 text-sm font-medium text-sky-800 disabled:opacity-50"
              >
                Hủy / Hoàn tiền
              </button>
            </div>

            <Link
              to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", String(orderId ?? ""))}
              className="inline-block mt-4 text-sm text-amber-700 underline"
            >
              Xem trạng thái đơn hàng
            </Link>
          </section>

            <aside className="border border-gray-200 rounded-lg p-5 bg-white h-fit shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                <span>Tóm tắt đơn hàng</span>
              </h2>

            <div className="mt-4 space-y-2 max-h-[320px] overflow-auto">
              {orderItems.length === 0 && <p className="text-sm text-gray-600">Không có sản phẩm.</p>}
              {orderItems.map((item, idx) => {
                const name = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                const qty = item.quantity ?? 0;
                const lineTotal = item.line_total ?? (item.price_snapshot ?? 0) * qty;
                return (
                  <div key={item._id ?? item.id ?? `item-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500">x{qty}</p>
                    </div>
                    <span className="font-medium text-gray-900">{fmt(lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{fmt(order.subtotal_amount ?? amount)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>Tổng thanh toán</span>
                <span className="text-amber-700">{fmt(amount)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
