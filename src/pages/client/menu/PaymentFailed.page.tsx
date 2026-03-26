import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { buildPaymentProcessUrl, ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

type FailedReason = "failed" | "cancelled" | "refunded";

type PaymentFailedLocationState = {
  reason?: FailedReason;
  paymentMethod?: string;
  bankName?: string;
};

function paymentMethodLabel(method?: string, bankName?: string): string {
  const raw = String(method ?? bankName ?? "").trim().toUpperCase();
  switch (raw) {
    case "COD":
    case "CASH":
      return "Tiền mặt (COD)";
    case "CARD":
    case "BANK":
    case "BANK_TRANSFER":
    case "VNPAY":
      return "VNPAY";
    case "MOMO":
      return "MoMo";
    default:
      return "Chưa xác định";
  }
}

function resolveReason(
  stateReason?: string,
  orderStatus?: string,
  paymentStatus?: string,
): FailedReason {
  if (stateReason === "cancelled" || stateReason === "refunded" || stateReason === "failed") {
    return stateReason;
  }

  const normalizedOrderStatus = String(orderStatus ?? "").trim().toUpperCase();
  const normalizedPaymentStatus = String(paymentStatus ?? "").trim().toUpperCase();

  if (normalizedPaymentStatus.includes("REFUND")) {
    return "refunded";
  }

  if (normalizedOrderStatus === "CANCELLED") {
    return "cancelled";
  }

  return "failed";
}

function getPageCopy(reason: FailedReason, paymentMethodText: string) {
  if (reason === "refunded") {
    return {
      icon: "↩",
      panelClassName: "border-emerald-200 bg-emerald-50",
      title: "Đã hủy và hoàn tiền",
      description: "Đơn hàng đã được hủy. Nếu giao dịch đã bị trừ tiền, hệ thống sẽ hoàn về đúng phương thức thanh toán.",
      hint: `Tiền hoàn sẽ được xử lý qua ${paymentMethodText}. Thời gian nhận lại tiền phụ thuộc vào ngân hàng và cổng thanh toán.`,
      primaryLabel: "Đặt lại món",
      showRetry: false,
    };
  }

  if (reason === "cancelled") {
    return {
      icon: "!",
      panelClassName: "border-amber-200 bg-amber-50",
      title: "Đã hủy đơn",
      description: "Đơn hàng đã được hủy thành công và không tiếp tục thanh toán.",
      hint: "Nếu bạn vẫn muốn đặt món, hãy quay lại menu và tạo đơn mới.",
      primaryLabel: "Đặt lại món",
      showRetry: false,
    };
  }

  return {
    icon: "X",
    panelClassName: "border-red-200 bg-red-50",
    title: "Thanh toán chưa hoàn tất",
    description: "Đơn hàng vẫn chưa được thanh toán thành công.",
    hint: "Nút thanh toán lại sẽ đưa bạn quay trở lại trang payment/process. Hiện tại không có API retry riêng.",
    primaryLabel: "Thanh toán lại",
    showRetry: true,
  };
}

export default function PaymentFailedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as PaymentFailedLocationState | null) ?? null;

  const { data: order } = useQuery({
    queryKey: ["payment-failed-order", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const { data: payment } = useQuery({
    queryKey: ["payment-failed-payment", orderId],
    queryFn: () => paymentClient.getPaymentByOrderId(orderId!),
    enabled: !!orderId,
  });

  const displayAmount = order?.final_amount ?? 0;

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">Đang tải...</div>
      </div>
    );
  }

  const reason = resolveReason(
    locationState?.reason,
    (order as any)?.status,
    payment?.status,
  );

  const paymentMethodRaw = String(
    locationState?.paymentMethod ??
    locationState?.bankName ??
    payment?.method ??
    (order as any)?.payment_method ??
    (order as any)?.bank_name ??
    "",
  ).trim();

  const bankNameRaw = String(
    locationState?.bankName ??
    (order as any)?.bank_name ??
    "",
  ).trim();

  const paymentMethodText = paymentMethodLabel(paymentMethodRaw, bankNameRaw);
  const pageCopy = getPageCopy(reason, paymentMethodText);

  const handlePrimaryAction = () => {
    if (!orderId) return;

    if (pageCopy.showRetry) {
      navigate(buildPaymentProcessUrl(orderId, paymentMethodRaw || bankNameRaw), {
        state: {
          checkoutPaymentMethod: paymentMethodRaw,
          checkoutBankName: bankNameRaw,
        },
      });
      return;
    }

    navigate(ROUTER_URL.MENU);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4 font-bold text-gray-900">{pageCopy.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900">{pageCopy.title}</h1>
        <p className="text-gray-500 mt-2">
          Đơn <span className="font-semibold text-amber-700">#{order.code}</span> {pageCopy.description}
        </p>

        <div className={`mt-6 rounded-2xl border p-4 text-left ${pageCopy.panelClassName}`}>
          {payment?.provider_txn_id && (
            <div className="flex justify-between text-sm mb-2 gap-4">
              <span className="text-gray-500">Mã giao dịch</span>
              <span className="font-mono font-semibold text-gray-900 text-right break-all">
                {payment.provider_txn_id}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2 gap-4">
            <span className="text-gray-500">Phương thức</span>
            <span className="font-semibold text-gray-900 text-right">{paymentMethodText}</span>
          </div>
          <div className="flex justify-between text-sm gap-4">
            <span className="text-gray-500">Số tiền</span>
            <span className="font-semibold text-gray-900">{fmt(displayAmount)}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600">
          {pageCopy.hint}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handlePrimaryAction}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {pageCopy.primaryLabel}
          </button>
          <Link
            to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId!)}
            className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold"
          >
            Xem đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
