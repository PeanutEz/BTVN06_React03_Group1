import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";
import { saveOrderPaymentIntent } from "@/utils/orderPaymentIntent.util";
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";
import { getOrderItemDisplayMeta } from "@/utils/orderItemDisplay.util";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fmtPercent = (n: number) => {
  const normalized = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `${normalized}%`;
};

const fmtDateTime = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function getOrderItemImage(item: Record<string, unknown>): string | null {
  const direct = item.product_image_url ?? item.image_url ?? item.image ?? item.product_image ?? item.product_image_snapshot;
  if (typeof direct === "string" && direct.trim()) return direct;
  return null;
}

type ApiPaymentMethod = "COD" | "MOMO" | "CARD";

type PaymentProcessLocationState = {
  checkoutPaymentMethod?: string;
  checkoutBankName?: string;
};

function normalizePaymentMethod(method?: string): ApiPaymentMethod | null {
  const raw = String(method ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (raw === "MOMO") return "MOMO";
  if (raw === "CARD" || raw === "VNPAY" || raw === "BANK" || raw === "BANK_TRANSFER") return "CARD";
  if (raw === "COD" || raw === "CASH") return "COD";
  return null;
}

function resolvePaymentMethodFromPathname(pathname?: string): ApiPaymentMethod | null {
  const raw = String(pathname ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("/payment/vnpay/process/")) return "CARD";
  if (raw.includes("/payment/cod/process/")) return "COD";
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
  if (method === "CARD") return "VNPAY";
  if (method === "COD") return "Tiền mặt (COD)";
  return "VNPAY";
}

function buildVnpayTxnId(orderCode?: string, paymentRef?: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const normalizedOrder = String(orderCode ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toUpperCase();
  const normalizedPayment = String(paymentRef ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toUpperCase()
    .slice(-6);
  const orderSegment = normalizedOrder || "ORDER";
  const paymentSegment = normalizedPayment || "PAY";
  return `VNPAY_${orderSegment}_${paymentSegment}_${stamp}`;
}

function hasPlaceholderTxnSegment(txnId?: string): boolean {
  const raw = String(txnId ?? "").toUpperCase();
  if (!raw.startsWith("VNPAY_")) return false;
  return raw.includes("_ORDER_") || raw.includes("_PAY_");
}

function isPaidStatus(status?: string): boolean {
  return ["PAID", "CONFIRMED", "COMPLETED"].includes(String(status ?? "").toUpperCase());
}

function isCodAcceptedStatus(status?: string): boolean {
  return ["UNPAID", "PENDING", "PAID", "CONFIRMED", "COMPLETED"].includes(
    String(status ?? "").toUpperCase(),
  );
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
  const location = useLocation();
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

  const franchiseId = String(
    (order as any)?.franchise_id ?? (order as any)?.franchise?._id ?? (order as any)?.franchise?.id ?? ""
  ).trim();

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
  const checkoutState = (location.state as PaymentProcessLocationState | null) ?? null;
  const methodFromPathname = resolvePaymentMethodFromPathname(location.pathname);
  const methodFromNavigation = normalizePaymentMethod(
    String(
      checkoutState?.checkoutPaymentMethod ??
      checkoutState?.checkoutBankName ??
      "",
    )
      .trim()
      .toUpperCase(),
  );
  const methodFromPayment = normalizePaymentMethod(
    String(payment?.method ?? "").trim().toUpperCase(),
  );
  const methodFromOrder = normalizePaymentMethod(
    String((order as any)?.payment_method ?? (order as any)?.method ?? (order as any)?.bank_name ?? "")
      .trim()
      .toUpperCase(),
  );
  const shouldPreferOrderMethod =
    !!methodFromOrder &&
    (!statusRaw || statusRaw === "PENDING" || statusRaw === "UNPAID") &&
    (!methodFromPayment || (methodFromPayment === "COD" && methodFromOrder !== "COD"));
  const shouldPreferPathMethod =
    !!methodFromPathname &&
    (!statusRaw || statusRaw === "PENDING" || statusRaw === "UNPAID") &&
    (!methodFromPayment || (methodFromPayment === "COD" && methodFromPathname !== "COD"));
  const shouldPreferNavigationMethod =
    !!methodFromNavigation &&
    (!statusRaw || statusRaw === "PENDING" || statusRaw === "UNPAID") &&
    (!methodFromPayment || (methodFromPayment === "COD" && methodFromNavigation !== "COD"));
  const effectiveMethod: ApiPaymentMethod =
    (shouldPreferNavigationMethod
      ? methodFromNavigation
      : shouldPreferPathMethod
        ? methodFromPathname
      : shouldPreferOrderMethod
        ? methodFromOrder
        : methodFromPayment) ??
    methodFromNavigation ??
    methodFromPathname ??
    methodFromOrder ??
    "COD";
  const methodText = paymentMethodLabel(effectiveMethod);
  const persistedBankName = String(
    checkoutState?.checkoutBankName ??
    (order as any)?.bank_name ??
    (effectiveMethod === "CARD" ? "VNPAY" : ""),
  ).trim();

  useEffect(() => {
    if (!orderId) return;
    saveOrderPaymentIntent(orderId, effectiveMethod, persistedBankName);
  }, [effectiveMethod, orderId, persistedBankName]);

  const paymentMissing = !paymentId;
  const paymentFailed = statusRaw === "FAILED";
  const paymentRefunded = statusRaw === "REFUNDED";
  const paymentAlreadyPaid = isPaidStatus(statusRaw);
  const isPendingOrUnpaid = !statusRaw || statusRaw === "PENDING" || statusRaw === "UNPAID";
  const requiresProviderTxn = effectiveMethod === "MOMO" || effectiveMethod === "CARD";

  const amount = order?.final_amount ?? order?.total_amount ?? 0;
  const providerTxnIdFromApi = String(payment?.provider_txn_id ?? payment?.providerTxnId ?? "").trim();
  const displayProviderTxnId = providerTxnIdFromApi || providerTxnId;
  const paymentCreatedAtText = fmtDateTime(payment?.created_at);
  const paymentUpdatedAtText = fmtDateTime(payment?.updated_at);
  const customerName = order?.customer_name ?? order?.customer?.name;
  const customerPhone = order?.phone ?? order?.customer?.phone;
  const franchiseName = order?.franchise_name ?? order?.franchise?.name;
  const subtotalAmount = Number(order?.subtotal_amount ?? amount ?? 0);
  const promotionDiscount = Number((order as any)?.promotion_discount ?? 0);
  const promotionTypeRaw = String((order as any)?.promotion_type ?? "").toUpperCase();
  const promotionValueRaw = Number((order as any)?.promotion_value ?? 0);
  const voucherDiscount = Number((order as any)?.voucher_discount ?? 0);
  const voucherTypeRaw = String((order as any)?.voucher_type ?? (order as any)?.voucher?.type ?? "").toUpperCase();
  const voucherValueRaw = Number((order as any)?.voucher_value ?? (order as any)?.voucher?.value ?? 0);
  const loyaltyDiscount = Number((order as any)?.loyalty_discount ?? 0);
  const promotionPercentText = (() => {
    if (promotionDiscount <= 0) return null;
    if ((promotionTypeRaw.includes("PERCENT") || promotionTypeRaw.includes("%")) && promotionValueRaw > 0) {
      return fmtPercent(promotionValueRaw);
    }
    return null;
  })();
  const voucherPercentText = (() => {
    if (voucherDiscount <= 0) return null;
    if ((voucherTypeRaw.includes("PERCENT") || voucherTypeRaw.includes("%")) && voucherValueRaw > 0) {
      return fmtPercent(voucherValueRaw);
    }
    return null;
  })();
  const knownDiscountTotal = Math.max(0, promotionDiscount) + Math.max(0, voucherDiscount) + Math.max(0, loyaltyDiscount);
  const inferredDiscountTotal = Math.max(0, subtotalAmount - Number(amount ?? 0));
  const extraDiscount = knownDiscountTotal > 0
    ? Math.max(0, inferredDiscountTotal - knownDiscountTotal)
    : 0;
  const genericDiscount = knownDiscountTotal === 0 ? inferredDiscountTotal : 0;
  const vnpayQrUrl = useMemo(() => {
    if (effectiveMethod !== "CARD") return undefined;
    return buildStaticPaymentQr({
      provider: "BANK",
      amount: Number(amount ?? 0),
      orderRef: String(order?.code ?? orderId ?? "ORDER"),
      bankName: "VNPAY",
    });
  }, [effectiveMethod, amount, order?.code, orderId]);
  const canConfirm = !submitting && !paymentMissing && !paymentAlreadyPaid && !paymentFailed && !paymentRefunded;

  useEffect(() => {
    if (effectiveMethod !== "CARD") return;
    const current = providerTxnId.trim();
    if (!current || hasPlaceholderTxnSegment(current)) {
      setProviderTxnId(buildVnpayTxnId(order?.code, paymentId));
    }
  }, [effectiveMethod, order?.code, paymentId, providerTxnId]);

  async function handleConfirmPayment() {
    if (!paymentId || submitting) return;

    if (!isPendingOrUnpaid) {
      toast.error("Chỉ xác nhận khi payment ở trạng thái chờ thanh toán");
      return;
    }

    const autoTxnId = requiresProviderTxn
      ? (providerTxnId.trim() || buildVnpayTxnId(order?.code, paymentId))
      : undefined;
    if (requiresProviderTxn && !providerTxnId.trim()) {
      setProviderTxnId(autoTxnId ?? "");
    }

    setSubmitting(true);
    try {
      // ✅ Confirm payment with minimal required fields
      const result = await paymentClient.confirmPayment(paymentId, {
        method: effectiveMethod,
        providerTxnId: autoTxnId,
      });

      if (!result) {
        toast.error("Không nhận được phản hồi từ server");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["payment-by-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["payment-success-payment", orderId] });
      if (franchiseId) {
        queryClient.invalidateQueries({ queryKey: ["payment-success-customer-loyalty", franchiseId] });
      }

      const isCodFlow = effectiveMethod === "COD";
      const isPaymentSuccess = isPaidStatus(result.status) || (isCodFlow && isCodAcceptedStatus(result.status));

      if (isPaymentSuccess) {
        toast.success(isCodFlow ? "Đã ghi nhận đơn COD" : "Thanh toán thành công");
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

  void handleRefundPayment;

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
              {franchiseName && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-3">
                  <span className="text-gray-600">Cửa hàng</span>
                  <span className="font-medium text-gray-900 text-right">{franchiseName}</span>
                </div>
              )}
              {customerName && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-3">
                  <span className="text-gray-600">Khách hàng</span>
                  <span className="font-medium text-gray-900 text-right">{customerName}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Số điện thoại</span>
                  <span className="font-medium text-gray-900">{customerPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Phương thức</span>
                <span className="font-medium text-indigo-700">{methodText}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Trạng thái</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusClass}`}>{statusText}</span>
              </div>
              {displayProviderTxnId && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Mã giao dịch</span>
                  <span className="font-mono text-xs text-amber-700">{displayProviderTxnId}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Số tiền</span>
                <span className="font-semibold text-gray-900">{fmt(amount)}</span>
              </div>
              {paymentCreatedAtText && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Tạo payment lúc</span>
                  <span className="font-medium text-gray-900">{paymentCreatedAtText}</span>
                </div>
              )}
              {paymentUpdatedAtText && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Cập nhật payment</span>
                  <span className="font-medium text-gray-900">{paymentUpdatedAtText}</span>
                </div>
              )}
            </div>

            {effectiveMethod === "CARD" && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🏦</span>
                  <p className="text-sm font-semibold text-amber-800">Quét mã QR để thanh toán VNPAY</p>
                </div>
                {vnpayQrUrl && (
                  <div className="rounded-xl border border-amber-200 bg-white p-3 flex items-center justify-center">
                    <div className="relative w-52 h-52">
                      <img src={vnpayQrUrl} alt="VNPAY QR" className="w-52 h-52 object-contain" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-xl bg-white border border-amber-100 shadow-sm p-1.5">
                          <img src="/logo-hylux.png" alt="Hylux" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-gray-600">Mã giao dịch VNPAY: <span className="font-mono font-semibold text-gray-800">{displayProviderTxnId || providerTxnId}</span></p>
              </div>
            )}

            {requiresProviderTxn && effectiveMethod !== "CARD" && (
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

            <div className="mt-6">
              <button
                onClick={handleConfirmPayment}
                disabled={!canConfirm}
                className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </button>
            </div>

            <Link
              to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", String(orderId ?? ""))}
              className="inline-block mt-4 text-sm text-amber-700 underline"
            >
              Xem trạng thái đơn hàng
            </Link>
          </section>

            <aside className="border border-amber-200 rounded-2xl p-5 bg-gradient-to-b from-amber-50/70 to-white h-fit shadow-md">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="inline-flex w-6 h-6 rounded-full bg-amber-100 items-center justify-center text-xs">🧾</span>
                <span>Tóm tắt đơn hàng</span>
              </h2>

            <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">
              {orderItems.length === 0 && <p className="text-sm text-gray-600">Không có sản phẩm.</p>}
              {orderItems.map((item, idx) => {
                const name = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                const qty = item.quantity ?? 0;
                const lineTotal = item.line_total ?? (item.price_snapshot ?? 0) * qty;
                const imageUrl = getOrderItemImage(item as Record<string, unknown>);
                const itemMeta = getOrderItemDisplayMeta(item as Record<string, unknown>);
                const fallbackMetaLine =
                  !itemMeta.size && itemMeta.inlineMeta ? itemMeta.inlineMeta : "";
                return (
                  <div
                    key={item._id ?? item.id ?? `item-${idx}`}
                    className="relative rounded-xl border border-amber-100 bg-white p-2.5 pr-24 text-sm"
                  >
                    {itemMeta.size && (
                      <span className="absolute top-2 right-2 inline-flex h-[18px] min-w-[22px] items-center justify-center rounded bg-slate-100 border border-slate-200 px-1 text-[9px] font-semibold text-slate-700 leading-none">
                        {itemMeta.size}
                      </span>
                    )}

                    <span className="absolute right-2 bottom-2 font-semibold text-amber-700 text-[13px]">
                      {fmt(lineTotal)}
                    </span>

                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {imageUrl ? (
                          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">☕</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 truncate font-medium">{name}</p>
                        {(itemMeta.sugar || itemMeta.ice) && (
                          <p className="text-[9px] text-gray-500 mt-0.5 truncate whitespace-nowrap">
                            {[itemMeta.sugar, itemMeta.ice].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {fallbackMetaLine && (
                          <p className="text-[9px] text-gray-500 mt-0.5 truncate whitespace-nowrap">
                            {fallbackMetaLine}
                          </p>
                        )}
                        {itemMeta.toppingsText && (
                          <p className="text-[9px] text-gray-500 mt-0.5 truncate whitespace-nowrap">
                            {`Topping: ${itemMeta.toppingsText}`}
                          </p>
                        )}
                        {itemMeta.noteText && (
                          <p className="text-[11px] text-gray-500 italic mt-0.5">
                            Ghi chú: {itemMeta.noteText}
                          </p>
                        )}
                        <span className="inline-flex mt-1 min-w-[22px] h-[18px] items-center justify-center rounded bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-700">
                          x{qty}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{fmt(subtotalAmount)}</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>
                    Giảm khuyến mãi
                    {promotionPercentText ? ` (${promotionPercentText})` : ""}
                  </span>
                  <span>-{fmt(promotionDiscount)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>
                    Giảm voucher
                    {voucherPercentText ? ` (${voucherPercentText})` : ""}
                  </span>
                  <span>-{fmt(voucherDiscount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Giảm điểm tích lũy</span>
                  <span>-{fmt(loyaltyDiscount)}</span>
                </div>
              )}
              {extraDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Giảm khác</span>
                  <span>-{fmt(extraDiscount)}</span>
                </div>
              )}
              {genericDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Giảm giá</span>
                  <span>-{fmt(genericDiscount)}</span>
                </div>
              )}
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
