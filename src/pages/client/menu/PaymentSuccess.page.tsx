import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { paymentClient } from "@/services/payment.client";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fmtDateTime = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

function getPaymentStatusMeta(status?: string): { label: string; color: string } {
  switch (status?.toUpperCase()) {
    case "PAID": case "CONFIRMED": case "COMPLETED":
      return { label: "Đã thanh toán", color: "text-emerald-700 bg-emerald-100" };
    case "PENDING":
      return { label: "Chờ thanh toán", color: "text-amber-700 bg-amber-100" };
    case "FAILED":
      return { label: "Thanh toán thất bại", color: "text-red-700 bg-red-100" };
    case "CANCELLED":
      return { label: "Đã huỷ", color: "text-gray-600 bg-gray-100" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", color: "text-blue-700 bg-blue-100" };
    default:
      return { label: "Chờ thanh toán", color: "text-amber-700 bg-amber-100" };
  }
}

function getOrderStatusMeta(status?: string): { label: string; color: string; step: number } {
  switch (status?.toUpperCase()) {
    case "PENDING": case "DRAFT":
      return { label: "Chờ xác nhận", color: "text-amber-700 bg-amber-100", step: 1 };
    case "CONFIRMED":
      return { label: "Đã xác nhận", color: "text-blue-700 bg-blue-100", step: 2 };
    case "PREPARING":
      return { label: "Đang pha chế", color: "text-purple-700 bg-purple-100", step: 2 };
    case "READY_FOR_PICKUP":
      return { label: "Sẵn sàng lấy", color: "text-teal-700 bg-teal-100", step: 3 };
    case "DELIVERING":
      return { label: "Đang giao", color: "text-indigo-700 bg-indigo-100", step: 3 };
    case "COMPLETED":
      return { label: "Hoàn thành", color: "text-emerald-700 bg-emerald-100", step: 4 };
    case "CANCELLED":
      return { label: "Đã huỷ", color: "text-red-700 bg-red-100", step: 0 };
    default:
      return { label: "Đang xử lý", color: "text-gray-600 bg-gray-100", step: 1 };
  }
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

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

  const isLoading = orderLoading || paymentLoading;
  const displayAmount = (order as any)?.final_amount ?? (order as any)?.total_amount ?? 0;
  const paymentMeta = getPaymentStatusMeta(payment?.status);
  const orderMeta = getOrderStatusMeta((order as any)?.status);
  const createdAt = fmtDateTime((order as any)?.created_at);
  const orderItems: any[] = (order as any)?.order_items ?? (order as any)?.items ?? [];
  const franchiseName = (order as any)?.franchise_name ?? (order as any)?.franchise?.name;

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
    { label: "Pha chế", step: 2 },
    { label: "Giao hàng", step: 3 },
    { label: "Hoàn thành", step: 4 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">

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

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 rounded-2xl p-3.5">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Mã đơn hàng</p>
                <p className="text-sm font-bold text-gray-900">#{(order as any).code}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-3.5">
                <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider mb-1">Tổng tiền</p>
                <p className="text-sm font-extrabold text-amber-600">{fmt(displayAmount)}</p>
              </div>
              {franchiseName && (
                <div className="bg-gray-50 rounded-2xl p-3.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Cửa hàng</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{franchiseName}</p>
                </div>
              )}
              {createdAt && (
                <div className="bg-gray-50 rounded-2xl p-3.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Thời gian</p>
                  <p className="text-sm font-bold text-gray-900">{createdAt}</p>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-stretch gap-3">
              <div className="flex-1 flex items-center gap-2.5 bg-gray-50 rounded-2xl px-4 py-3">
                <span className="text-xl shrink-0">💳</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">Thanh toán</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", paymentMeta.color)}>
                    {paymentMeta.label}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2.5 bg-gray-50 rounded-2xl px-4 py-3">
                <span className="text-xl shrink-0">📦</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">Trạng thái</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", orderMeta.color)}>
                    {orderMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {orderMeta.step > 0 && (
              <div className="px-1">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Tiến trình đơn hàng</p>
                <div className="flex items-start">
                  {steps.map((s, i) => (
                    <div key={s.step} className="flex items-center flex-1">
                      <StepDot
                        label={s.label}
                        done={orderMeta.step > s.step}
                        active={orderMeta.step === s.step}
                      />
                      {i < steps.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 mb-5 mx-0.5 rounded-full transition-all",
                          orderMeta.step > s.step ? "bg-emerald-400" : "bg-gray-150",
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Txn ID */}
            {payment?.provider_txn_id && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-xs text-blue-600 font-medium">Mã giao dịch</span>
                <span className="text-xs font-mono font-bold text-blue-800 truncate ml-2 max-w-[160px]">{payment.provider_txn_id}</span>
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
                  return (
                    <div key={item._id ?? item.id ?? idx} className="flex items-center justify-between text-sm py-0.5">
                      <span className="text-gray-600 truncate flex-1 mr-3">
                        <span className="text-gray-400 text-xs mr-1.5 font-semibold">×{qty}</span>
                        {name}
                      </span>
                      <span className="font-semibold text-gray-900 shrink-0">{fmt(price)}</span>
                    </div>
                  );
                })}
                {orderItems.length > 4 && (
                  <p className="text-xs text-gray-400 text-right">+{orderItems.length - 4} sản phẩm khác</p>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-700">Tổng cộng</span>
                  <span className="text-amber-600">{fmt(displayAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", orderId!)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-200/60 transition-all active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Theo dõi đơn hàng
          </Link>
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
