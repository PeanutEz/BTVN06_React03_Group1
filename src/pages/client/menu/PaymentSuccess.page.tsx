import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import LoadingLayout from "@/layouts/Loading.layout";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";
import { clientService } from "@/services/client.service";
import { getOrderItemDisplayMeta } from "@/utils/orderItemDisplay.util";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fmtDateTime = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

function resolveOrderProgressStep(status?: string): number {
  switch (String(status ?? "").toUpperCase()) {
    case "PENDING":
    case "DRAFT":
      return 1;
    case "CONFIRMED":
      return 2;
    case "PREPARING":
      return 3;
    case "READY_FOR_PICKUP":
    case "DELIVERING":
      return 4;
    case "COMPLETED":
      return 5;
    case "CANCELLED":
      return 0;
    default:
      return 1;
  }
}

function paymentMethodLabel(method?: string): string {
  switch (String(method ?? "").toUpperCase()) {
    case "COD":
    case "CASH":
      return "Tiền mặt (COD)";
    case "CARD":
    case "VNPAY":
    case "BANK":
    case "BANK_TRANSFER":
      return "VNPAY";
    case "MOMO":
      return "MoMo";
    default:
      return "Chưa xác định";
  }
}

function getOrderItemImage(item: Record<string, unknown>): string | null {
  const value = item.image_url ?? item.image ?? item.product_image ?? item.product_image_snapshot;
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
        done ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
          : active ? "bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm shadow-amber-200"
          : "bg-gray-100 text-gray-300",
      )}>
        {done
          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          : <div className={cn("w-2.5 h-2.5 rounded-full", active ? "bg-white" : "bg-gray-300")} />
        }
      </div>
      <span className={cn("text-[10px] font-semibold text-center leading-tight",
        done ? "text-emerald-600" : active ? "text-amber-600" : "text-gray-400"
      )}>
        {label}
      </span>
    </div>
  );
}

export default function PaymentSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isNavigatingToTracking, setIsNavigatingToTracking] = useState(false);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleTrackOrderClick = async () => {
    if (!orderId || isNavigatingToTracking) return;

    setIsNavigatingToTracking(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order-status", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["payment-by-order-status", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-by-order", orderId] }),
      ]);
      navigate(ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId));
    } catch {
      setIsNavigatingToTracking(false);
    }
  };

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["payment-success-order", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
    staleTime: 30_000,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-success-payment", orderId],
    queryFn: () => paymentClient.getPaymentByOrderId(orderId!),
    enabled: !!orderId,
    staleTime: 30_000,
  });

  const franchiseId = String(
    (order as any)?.franchise_id ?? (order as any)?.franchise?._id ?? (order as any)?.franchise?.id ?? ""
  ).trim();

  const { data: loyaltyRules } = useQuery({
    queryKey: ["payment-success-loyalty-rule", franchiseId],
    queryFn: () => clientService.getLoyaltyRuleByFranchise(franchiseId),
    enabled: !!franchiseId,
    staleTime: 60_000,
  });

  const { data: customerLoyalty } = useQuery({
    queryKey: ["payment-success-customer-loyalty", franchiseId],
    queryFn: () => clientService.getCustomerLoyaltyByFranchise(franchiseId),
    enabled: !!franchiseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    // Poll for a short window after order creation so loyalty points
    // updated asynchronously by backend can appear immediately.
    refetchInterval: (() => {
      const createdAt = (order as any)?.created_at;
      if (!createdAt) return false;
      const createdAtMs = new Date(createdAt).getTime();
      if (!Number.isFinite(createdAtMs)) return false;
      return Date.now() - createdAtMs <= 2 * 60 * 1000 ? 3000 : false;
    })(),
  });

  const isLoading = orderLoading || paymentLoading;
  const displayAmount = (order as any)?.final_amount ?? (order as any)?.total_amount ?? 0;
  const subtotalAmount = Number((order as any)?.subtotal_amount ?? displayAmount ?? 0);
  const promotionDiscount = Number((order as any)?.promotion_discount ?? 0);
  const voucherDiscount = Number((order as any)?.voucher_discount ?? 0);
  const loyaltyDiscount = Number((order as any)?.loyalty_discount ?? 0);
  const loyaltyPointsEarnedFromOrderRaw = [
    (order as any)?.loyalty_points_earned,
    (order as any)?.earned_loyalty_points,
    (order as any)?.loyalty_point_earned,
    (order as any)?.points_earned,
  ].find((value) => Number.isFinite(Number(value)));
  const loyaltyPointsEarnedFromOrder = Number.isFinite(Number(loyaltyPointsEarnedFromOrderRaw))
    ? Math.max(0, Math.floor(Number(loyaltyPointsEarnedFromOrderRaw)))
    : null;

  const currentTierName = String(
    (customerLoyalty as any)?.current_tier ?? (customerLoyalty as any)?.tier ?? ""
  ).toUpperCase();

  const matchedTierRule = Array.isArray(loyaltyRules)
    ? loyaltyRules.find((rule: any) => {
      const tierName = String(rule?.tier_name ?? rule?.tier ?? "").toUpperCase();
      return currentTierName ? tierName === currentTierName : false;
    }) ?? loyaltyRules[0]
    : null;

  const earnAmountPerPoint = Number(
    (matchedTierRule as any)?.earn_amount_per_point ??
    (loyaltyRules as any)?.earn_amount_per_point ??
    10_000
  );
  const earnMultiplier = Number((matchedTierRule as any)?.earn_multiplier ?? 1);

  const loyaltyPointsEarnedCalculated =
    Number.isFinite(earnAmountPerPoint) && earnAmountPerPoint > 0
      ? Math.max(0, Math.floor((Number(displayAmount ?? 0) / earnAmountPerPoint) * (Number.isFinite(earnMultiplier) ? earnMultiplier : 1)))
      : 0;

  const loyaltyPointsEarned = loyaltyPointsEarnedFromOrder ?? loyaltyPointsEarnedCalculated;
  const loyaltyPointsSourceLabel = loyaltyPointsEarnedFromOrder !== null ? "Điểm đã cộng" : "Điểm cộng ước tính";
  const loyaltyCurrentPoints = Number((customerLoyalty as any)?.loyalty_points ?? 0);
  const knownDiscountTotal = Math.max(0, promotionDiscount) + Math.max(0, voucherDiscount) + Math.max(0, loyaltyDiscount);
  const inferredDiscountTotal = Math.max(0, subtotalAmount - Number(displayAmount ?? 0));
  const extraDiscount = knownDiscountTotal > 0 ? Math.max(0, inferredDiscountTotal - knownDiscountTotal) : 0;
  const genericDiscount = knownDiscountTotal === 0 ? inferredDiscountTotal : 0;
  const orderTypeRaw = String((order as any)?.type ?? "").toUpperCase();
  const isPickupFlow = orderTypeRaw === "POS" || orderTypeRaw === "PICKUP";
  const currentStep = resolveOrderProgressStep((order as any)?.status);
  const createdAt = fmtDateTime((order as any)?.created_at);
  const paymentCreatedAt = fmtDateTime(payment?.created_at);
  const paymentUpdatedAt = fmtDateTime(payment?.updated_at);
  const orderItems: any[] = (order as any)?.order_items ?? (order as any)?.items ?? [];
  const customerName = (order as any)?.customer_name ?? (order as any)?.customer?.name;
  const customerPhone = (order as any)?.phone ?? (order as any)?.customer?.phone;
  const paymentMethodText = paymentMethodLabel(payment?.method);
  const providerTxnId = String(payment?.provider_txn_id ?? payment?.providerTxnId ?? "");

  if (isNavigatingToTracking) {
    return <LoadingLayout />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Đang xác nhận đơn hàng...</p>
          <p className="text-gray-400 text-sm mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center max-w-sm shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h1>
          <p className="text-sm text-gray-500 mb-6">Đơn hàng không tồn tại hoặc đã bị xoá.</p>
          <Link to={ROUTER_URL.MENU} className="inline-flex px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all">
            Quay lại menu
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Đặt hàng", step: 1 },
    { label: "Xác nhận", step: 2 },
    { label: "Pha chế", step: 3 },
    { label: isPickupFlow ? "Sẵn sàng lấy" : "Đang giao", step: 4 },
    { label: "Hoàn thành", step: 5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-4">

        {/* ── Main receipt card ── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100 overflow-hidden border border-gray-100">

          {/* Emerald header */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-10 pb-14 text-center relative overflow-hidden">
            {/* Background blur blobs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/4" />

            {/* Icon */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">Đặt hàng thành công!</h1>
            <p className="text-emerald-100 mt-1.5 text-sm">
              Đơn <span className="font-bold text-white">#{(order as any).code}</span> đã được xác nhận
            </p>
          </div>

          {/* Zigzag tear edge */}
          <div className="flex -mt-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-4 bg-white"
                style={{
                  borderTopLeftRadius: i % 2 === 0 ? "9999px" : 0,
                  borderTopRightRadius: i % 2 !== 0 ? "9999px" : 0,
                  background: i % 2 === 0 ? "#10b981" : "white",
                }}
              />
            ))}
          </div>

          <div className="px-6 pb-6 space-y-5">

            {createdAt && (
              <div className="pt-2">
                <div className="bg-gray-50 rounded-2xl p-3.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Thời gian</p>
                  <p className="text-sm font-bold text-gray-900">{createdAt}</p>
                </div>
              </div>
            )}

            {/* Payment + customer detail */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2.5">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Chi tiết thanh toán</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Phương thức</span>
                <span className="font-semibold text-gray-800">{paymentMethodText}</span>
              </div>
              {providerTxnId && (
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-gray-500">Mã giao dịch</span>
                  <span className="font-mono text-xs font-bold text-blue-800 text-right break-all">{providerTxnId}</span>
                </div>
              )}
              {customerName && (
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-gray-500">Khách hàng</span>
                  <span className="font-semibold text-gray-800 text-right">{customerName}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Số điện thoại</span>
                  <span className="font-semibold text-gray-800">{customerPhone}</span>
                </div>
              )}
              {paymentCreatedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Tạo payment lúc</span>
                  <span className="font-semibold text-gray-800">{paymentCreatedAt}</span>
                </div>
              )}
              {paymentUpdatedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Cập nhật payment</span>
                  <span className="font-semibold text-gray-800">{paymentUpdatedAt}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {currentStep > 0 && (
              <div className="px-1">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Tiến trình đơn hàng</p>
                <div className="flex items-start">
                  {steps.map((s, i) => (
                    <div key={s.step} className="flex items-center flex-1">
                      <StepDot
                        label={s.label}
                        done={currentStep > s.step}
                        active={currentStep === s.step}
                      />
                      {i < steps.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 mb-5 mx-0.5 rounded-full transition-all",
                          currentStep > s.step ? "bg-emerald-400" : "bg-gray-150",
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-200" />

            {/* Order items */}
            {orderItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Sản phẩm đã đặt</p>
                {orderItems.slice(0, 4).map((item: any, idx: number) => {
                  const name = item.product_name_snapshot ?? item.product_name ?? item.name ?? "Sản phẩm";
                  const qty = item.quantity ?? 1;
                  const price = item.line_total ?? item.subtotal ?? ((item.price_snapshot ?? item.price ?? 0) * qty);
                  const imageUrl = getOrderItemImage(item as Record<string, unknown>);
                  const itemMeta = getOrderItemDisplayMeta(item as Record<string, unknown>);
                  return (
                    <div key={item._id ?? item.id ?? idx} className="flex items-start justify-between gap-2.5 text-sm py-1.5 px-2 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-base">☕</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-600 truncate min-w-0">
                            <span className="text-gray-400 text-xs mr-1.5 font-semibold">×{qty}</span>
                            {name}
                          </p>
                          {(itemMeta.inlineMeta || itemMeta.toppingsText) && (
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">
                              {[itemMeta.inlineMeta, itemMeta.toppingsText ? `Topping: ${itemMeta.toppingsText}` : ""]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 shrink-0">{fmt(price)}</span>
                    </div>
                  );
                })}
                {orderItems.length > 4 && (
                  <p className="text-xs text-gray-400 text-right">+{orderItems.length - 4} sản phẩm khác</p>
                )}
                <div className="space-y-1.5 pt-2 border-t border-gray-100 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{fmt(subtotalAmount)}</span>
                  </div>
                  {promotionDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm khuyến mãi</span>
                      <span>-{fmt(promotionDiscount)}</span>
                    </div>
                  )}
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm voucher</span>
                      <span>-{fmt(voucherDiscount)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm điểm tích lũy</span>
                      <span>-{fmt(loyaltyDiscount)}</span>
                    </div>
                  )}
                  {loyaltyPointsEarned > 0 && (
                    <div className="flex justify-between text-sky-700">
                      <span>{loyaltyPointsSourceLabel}</span>
                      <span>+{loyaltyPointsEarned} điểm</span>
                    </div>
                  )}
                  {loyaltyCurrentPoints > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng điểm hiện tại</span>
                      <span>{loyaltyCurrentPoints.toLocaleString("vi-VN")} điểm</span>
                    </div>
                  )}
                  {extraDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm khác</span>
                      <span>-{fmt(extraDiscount)}</span>
                    </div>
                  )}
                  {genericDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm giá</span>
                      <span>-{fmt(genericDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span className="text-gray-700">Tổng cộng</span>
                    <span className="text-amber-600">{fmt(displayAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleTrackOrderClick}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-200/60 transition-all active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Theo dõi đơn hàng
          </button>
          <Link
            to={ROUTER_URL.MENU}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-bold text-sm transition-all active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Tiếp tục đặt món
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">Cảm ơn bạn đã tin tưởng <span className="font-semibold text-amber-600">Hylux Coffee</span> ☕</p>
      </div>
    </div>
  );
}
