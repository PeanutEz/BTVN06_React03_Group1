import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { OrderDisplay } from "@/models/order.model";
import { buildPaymentProcessUrl, ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";
import {
  resolvePaymentResultReason,
  type PaymentResultReason,
} from "@/utils/paymentResultState.util";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

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

type PaymentFailedLocationState = {
  reason?: PaymentResultReason;
  paymentMethod?: string;
  bankName?: string;
  customerReason?: string;
};

type PaymentFailedOrder = OrderDisplay & {
  payment_method?: string;
  bank_name?: string;
  cancel_reason?: string;
  cancel_note?: string;
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

function getPageCopy(reason: PaymentResultReason, paymentMethodText: string) {
  if (reason === "refunded") {
    return {
      badge: "Đã hủy và hoàn tiền",
      icon: "",
      badgeClassName: "border border-rose-200 bg-rose-100 text-rose-700",
      iconClassName: "bg-rose-100 text-rose-700",
      heroClassName: "border-rose-200 bg-rose-50/90",
      noteClassName: "border-rose-200 bg-white/90 text-rose-900",
      title: "Yêu cầu hoàn tiền đã được ghi nhận",
      description: "Đơn hàng của bạn đã được hủy.",
      secondaryDescription:
        "Nếu giao dịch đã trừ tiền, hệ thống sẽ hoàn về đúng phương thức thanh toán.",
      hintTitle: "Thông tin hoàn tiền",
      hint: `Khoản hoàn tiền sẽ được xử lý qua ${paymentMethodText}. Thời gian nhận lại tiền phụ thuộc vào ngân hàng và cổng thanh toán.`,
      primaryLabel: "Đặt lại món",
      showRetry: false,
    };
  }

  if (reason === "cancelled") {
    return {
      badge: "Đơn đã hủy",
      icon: "!",
      badgeClassName: "border border-amber-200 bg-amber-100 text-amber-700",
      iconClassName: "bg-amber-100 text-amber-700",
      heroClassName: "border-amber-200 bg-amber-50/90",
      noteClassName: "border-amber-200 bg-white/90 text-amber-900",
      title: "Đơn hàng đã được hủy thành công",
      description:
        "Đơn này sẽ không tiếp tục xử lý thanh toán nữa. Bạn vẫn có thể quay lại menu để tạo đơn mới bất cứ lúc nào.",
      secondaryDescription: "",
      hintTitle: "Gợi ý tiếp theo",
      hint: "Nếu bạn muốn đổi món, đổi địa chỉ hoặc đặt lại sau, hãy bắt đầu đơn mới từ trang menu.",
      primaryLabel: "Đặt lại món",
      showRetry: false,
    };
  }

  return {
    badge: "Thanh toán chưa hoàn tất",
    icon: "×",
    badgeClassName: "border border-rose-200 bg-rose-100 text-rose-700",
    iconClassName: "bg-rose-100 text-rose-700",
    heroClassName: "border-rose-200 bg-rose-50/90",
    noteClassName: "border-rose-200 bg-white/90 text-rose-900",
    title: "Thanh toán chưa thành công",
    description:
      "Hệ thống chưa ghi nhận thanh toán cho đơn hàng này. Bạn có thể kiểm tra lại thông tin và thực hiện thanh toán lần nữa.",
    secondaryDescription: "",
    hintTitle: "Thanh toán lại",
    hint: "Nút bên dưới sẽ đưa bạn trở lại trang payment/process với đúng phương thức thanh toán hiện tại.",
    primaryLabel: "Thanh toán lại",
    showRetry: true,
  };
}

export default function PaymentFailedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as PaymentFailedLocationState | null) ?? null;

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["payment-failed-order", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-failed-payment", orderId],
    queryFn: async () => {
      try {
        return await paymentClient.getPaymentByOrderId(orderId!);
      } catch {
        return null;
      }
    },
    enabled: !!orderId,
  });

  if (orderLoading || paymentLoading) {
    return <div className="min-h-[calc(100vh-7rem)] rounded-[32px] bg-[#f7f2ea]" />;
  }

  if (!order) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center rounded-[32px] bg-[#f7f2ea] px-4 py-10 sm:py-14">
        <div className="w-full max-w-md rounded-[28px] border border-[#3d2b1f]/10 bg-white p-8 text-center shadow-lg shadow-[#3d2b1f]/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#efe6d8] text-3xl">
            ?
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[#3d2b1f]">Không tìm thấy đơn hàng</h1>
          <p className="mt-2 text-sm leading-6 text-[#7b6654]">
            Liên kết này có thể đã hết hạn hoặc đơn hàng không còn tồn tại.
          </p>
          <Link
            to={ROUTER_URL.MENU}
            className="mt-6 inline-flex rounded-2xl bg-[#d4832a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a05e10]"
          >
            Quay lại menu
          </Link>
        </div>
      </div>
    );
  }

  const orderDetails = order as PaymentFailedOrder;
  const reason =
    resolvePaymentResultReason(
      orderDetails.status,
      payment?.status,
      locationState?.reason,
    ) ?? "failed";

  const paymentMethodRaw = String(
    locationState?.paymentMethod ??
      locationState?.bankName ??
      payment?.method ??
      orderDetails.payment_method ??
      orderDetails.bank_name ??
      "",
  ).trim();
  const bankNameRaw = String(locationState?.bankName ?? orderDetails.bank_name ?? "").trim();
  const paymentMethodText = paymentMethodLabel(paymentMethodRaw, bankNameRaw);
  const pageCopy = getPageCopy(reason, paymentMethodText);
  const displayAmount = Number(orderDetails.final_amount ?? orderDetails.total_amount ?? 0);
  const customerName = String(orderDetails.customer_name ?? orderDetails.customer?.name ?? "Khách hàng");
  const customerPhone = String(orderDetails.phone ?? orderDetails.customer?.phone ?? "—");
  const orderCancelledAt = fmtDateTime((orderDetails as OrderDisplay & { cancelled_at?: string }).cancelled_at);
  const franchiseName = String(orderDetails.franchise?.name ?? orderDetails.franchise_name ?? "Hylux Coffee");
  const providerTxnId = String(payment?.provider_txn_id ?? payment?.providerTxnId ?? "").trim();
  const customerReason = String(
    locationState?.customerReason ??
      payment?.refund_reason ??
      orderDetails.cancel_reason ??
      orderDetails.cancel_note ??
      orderDetails.note ??
      "",
  ).trim();
  const customerReasonLabel =
    reason === "cancelled" || reason === "refunded" ? "Lý do hủy" : "Lý do";
  const customerReasonClassName =
    reason === "cancelled"
      ? "border-amber-200/80 bg-amber-50/70 text-amber-900"
      : "border-rose-200/80 bg-rose-50/70 text-rose-900";

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
    <div className="relative flex min-h-[calc(100vh-7rem)] flex-col justify-center overflow-hidden rounded-[36px] bg-[#f7f2ea] px-0 py-10 text-[#3d2b1f] sm:py-14 lg:py-16">
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">
        <section className="rounded-[32px] border border-[#3d2b1f]/10 bg-white/95 p-6 shadow-xl shadow-[#3d2b1f]/5 backdrop-blur md:p-8">
          <div className={`rounded-[28px] border p-5 md:p-6 ${pageCopy.heroClassName}`}>
            <div className="flex items-start gap-4">
              {pageCopy.icon && (
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-4xl font-semibold ${pageCopy.iconClassName}`}>
                  {pageCopy.icon}
                </div>
              )}
              <div className="min-w-0">
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${pageCopy.badgeClassName}`}>
                  {pageCopy.badge}
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#2f2217]">
                  {pageCopy.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f4b3a] md:text-[15px]">
                  <span>
                    Đơn <span className="font-semibold text-[#a05e10]">#{orderDetails.code}</span> {pageCopy.description}
                  </span>
                  {pageCopy.secondaryDescription && (
                    <span className="mt-1 block">{pageCopy.secondaryDescription}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/80 px-4 py-4 text-sm text-[#5f4b3a]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a8070]">
                  Thông tin đơn hiện tại
                </p>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
                    <p className="text-lg font-semibold text-[#2f2217]">{customerName}</p>
                    <p className="mt-1 text-sm text-[#7b6654]">{customerPhone}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8a8070]">Mã đơn</span>
                    <span className="font-mono font-semibold text-[#a05e10]">#{orderDetails.code}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8a8070]">Số tiền</span>
                    <span className="font-semibold text-right text-[#2f2217]">{fmt(displayAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8a8070]">Phương thức</span>
                    <span className="font-semibold text-[#2f2217]">{paymentMethodText}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8a8070]">Chi nhánh</span>
                    <span className="font-semibold text-right text-[#2f2217]">{franchiseName}</span>
                  </div>
                  {providerTxnId && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[#8a8070]">Mã giao dịch</span>
                      <span className="max-w-[220px] break-all text-right font-mono text-xs font-semibold text-[#2f2217]">
                        {providerTxnId}
                      </span>
                    </div>
                  )}
                  {orderCancelledAt && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#8a8070]">Hủy lúc</span>
                      <span className="font-semibold text-right text-[#2f2217]">{orderCancelledAt}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-3xl border px-4 py-4 text-sm leading-6 ${pageCopy.noteClassName}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
                  {pageCopy.hintTitle}
                </p>
                <p className="mt-2">{pageCopy.hint}</p>
                {customerReason && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 ${customerReasonClassName}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                      {customerReasonLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6">{customerReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {pageCopy.showRetry && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="inline-flex items-center justify-center rounded-2xl bg-[#d4832a] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#a05e10]"
              >
                {pageCopy.primaryLabel}
              </button>
            )}
            <Link
              to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId!)}
              className="inline-flex items-center justify-center rounded-2xl border border-[#3d2b1f]/10 bg-white px-6 py-3.5 text-sm font-semibold text-[#3d2b1f] transition-colors hover:bg-[#f7f2ea]"
            >
              Xem trạng thái đơn
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
