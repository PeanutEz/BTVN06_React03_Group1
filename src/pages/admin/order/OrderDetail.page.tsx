import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
} from "../../../models/order.model";
import { fetchOrderById, updateOrderStatus } from "../../../services/order.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import { useAuthStore } from "../../../store";
import { getOrderItemDisplayMeta } from "../../../utils/orderItemDisplay.util";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { adminProductService } from "../../../services/product.service";

function getOrderItemImage(item: Record<string, unknown>, imageMap: Record<string, string>): string | null {
  // Ưu tiên lấy từ imageMap (fetch từ product service)
  const pfId = String(item.product_franchise_id ?? "");
  if (pfId && imageMap[pfId]) return imageMap[pfId];
  // Fallback: field trực tiếp nếu API trả về
  const value = item.image_url ?? item.image ?? item.product_image ?? item.product_image_snapshot;
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

// ─── Shared detail content (dùng cho cả page và modal) ──────────────────────
interface OrderDetailContentProps {
  orderId: string;
  onClose?: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailContent({ orderId, onClose, onStatusChange }: OrderDetailContentProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<OrderDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  // product_franchise_id → image_url
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const lastId = useRef<string | undefined>(undefined);

  // Fetch ảnh cho tất cả items sau khi có order
  const loadImages = async (items: any[]) => {
    if (!items.length) return;
    try {
      // Lấy tất cả product_franchise_id unique
      const pfIds = [...new Set(items.map((i) => String(i.product_franchise_id ?? "")).filter(Boolean))];
      if (!pfIds.length) return;

      // Fetch từng pf → lấy product_id → fetch product → lấy image_url
      const pfResults = await Promise.allSettled(
        pfIds.map((id) => adminProductFranchiseService.getProductFranchiseById(id))
      );

      const productIds = [...new Set(
        pfResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<any>).value?.product_id)
          .filter(Boolean)
      )];

      if (!productIds.length) return;

      const productResults = await Promise.allSettled(
        productIds.map((id) => adminProductService.getProductById(id))
      );

      // Build map: product_id → image_url
      const productImageMap: Record<string, string> = {};
      productResults.forEach((r) => {
        if (r.status === "fulfilled" && r.value?.id && r.value?.image_url) {
          productImageMap[r.value.id] = r.value.image_url;
        }
      });

      // Build final map: product_franchise_id → image_url
      const map: Record<string, string> = {};
      pfResults.forEach((r) => {
        if (r.status === "fulfilled") {
          const pf = (r as PromiseFulfilledResult<any>).value;
          if (pf?.id && pf?.product_id && productImageMap[pf.product_id]) {
            map[pf.id] = productImageMap[pf.product_id];
          }
        }
      });
      setImageMap(map);
    } catch {
      // silent — ảnh không load được thì dùng fallback
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      if (!data) {
        showError("Không tìm thấy đơn hàng");
        if (onClose) onClose();
        else navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`);
        return;
      }
      setOrder(data);
      loadImages(data.items ?? []);
    } catch (error) {
      console.error("Lỗi tải chi tiết đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId === lastId.current) return;
    lastId.current = orderId;
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handlePreparing = async () => {
    if (!order || !orderId || order.status === "PREPARING") return;
    setUpdating(true);
    try {
      const adminId = user?.user?.id || user?.id || "1";
      const updated = await updateOrderStatus(orderId, "PREPARING", adminId);
      setOrder(prev => prev ? { ...prev, status: "PREPARING", ...(updated ?? {}) } : prev);
      showSuccess("Đã chuyển sang Đang chuẩn bị");
      onStatusChange?.(orderId, "PREPARING");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi cập nhật trạng thái";
      showError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  const canPrepare =
    order.status !== "PREPARING" &&
    order.status !== "READY_FOR_PICKUP" &&
    order.status !== "DELIVERING" &&
    order.status !== "COMPLETED" &&
    order.status !== "CANCELLED"; return (
      <div className="space-y-6 text-white">
        {/* ── Hero Header ── */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.10) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/40">Đơn hàng</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{order.code}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
                  {ORDER_TYPE_LABELS[order.type]}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/40">{new Date(order.created_at).toLocaleString("vi-VN")}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-white/40 uppercase tracking-wide">Tổng thanh toán</p>
                <p className="text-2xl font-bold text-primary-400">{formatCurrency(order.final_amount ?? order.total_amount)}</p>
              </div>
              {canPrepare && (
                <Button onClick={handlePreparing} loading={updating} disabled={updating} className="shrink-0">
                  🍳 Chuyển sang Đang chuẩn bị
                </Button>
              )}
            </div>
          </div>
        </div>      {/* ── Main grid ── */}
        <div className="space-y-5">
          <div className="space-y-5">

            {/* Products */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Sản phẩm
              </h2>

              {/* Table header */}
              <div className="mb-2 grid grid-cols-12 gap-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                <span className="col-span-6">Tên sản phẩm</span>
                <span className="col-span-2 text-right">Đơn giá</span>
                <span className="col-span-2 text-center">SL</span>
                <span className="col-span-2 text-right">Thành tiền</span>
              </div>            <div className="divide-y divide-white/[0.06]">
                {(order.items ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-white/30">Chưa có sản phẩm</p>
                )}
                {(order.items ?? []).map((item, idx) => {
                  const productName = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                  const price = item.price_snapshot ?? item.price ?? 0;
                  const qty = item.quantity ?? 0;
                  const lineTotal = item.line_total ?? item.subtotal ?? (price * qty);
                  const imageUrl = getOrderItemImage(item as Record<string, unknown>, imageMap);
                  const meta = getOrderItemDisplayMeta(item as Record<string, unknown>);
                  return (
                    <div key={item._id ?? item.id ?? `item-${idx}`}>
                      {/* Main row */}
                      <div className="grid grid-cols-12 items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.04]">
                        <div className="col-span-6 flex items-center gap-3">
                          {/* Product image */}
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08]">
                            {imageUrl ? (
                              <img src={imageUrl} alt={String(productName)} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">☕</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white/90 leading-snug">{String(productName)}</p>
                            {meta.inlineMeta && (
                              <p className="text-[11px] text-white/40 mt-0.5">{meta.inlineMeta}</p>
                            )}
                            {(item as any).note && (
                              <p className="text-[11px] text-white/35 mt-0.5 italic">"{String((item as any).note)}"</p>
                            )}
                          </div>
                        </div>
                        <p className="col-span-2 text-right text-sm text-white/55">{formatCurrency(price)}</p>
                        <p className="col-span-2 text-center">
                          <span className="inline-block rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-sm font-bold text-white/80">×{qty}</span>
                        </p>
                        <p className="col-span-2 text-right font-bold text-white/90">{formatCurrency(lineTotal)}</p>
                      </div>
                      {/* Topping rows */}
                      {meta.toppings.length > 0 && (
                        <div className="mb-1 ml-[52px] space-y-0.5 pb-1">
                          {meta.toppings.map((tp, tIdx) => (
                            <div key={tIdx} className="grid grid-cols-12 items-center gap-3 px-2 py-1 rounded-lg bg-white/[0.02]">
                              <div className="col-span-6 flex items-center gap-2 pl-1">
                                <span className="text-white/20">└</span>
                                <span className="text-xs text-white/50">{tp.name}</span>
                              </div>
                              <p className="col-span-2 text-right text-xs text-white/30">—</p>
                              <p className="col-span-2 text-center text-xs text-white/40">×{tp.quantity * qty}</p>
                              <p className="col-span-2 text-right text-xs text-white/30">—</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtotal row */}
              {(order.items ?? []).length > 0 && (
                <div className="mt-3 flex justify-end border-t border-white/[0.06] pt-3">
                  <div className="space-y-1.5 text-sm min-w-[220px]">                  {(order.subtotal_amount ?? 0) > 0 && (
                    <div className="flex justify-between gap-8 text-white/50">
                      <span>Tạm tính</span>
                      <span>{formatCurrency(order.subtotal_amount ?? 0)}</span>
                    </div>
                  )}
                    {(order.promotion_discount ?? 0) > 0 && (
                      <div className="flex justify-between gap-8 text-emerald-400">
                        <span>Khuyến mãi</span>
                        <span>-{formatCurrency(order.promotion_discount ?? 0)}</span>
                      </div>
                    )}
                    {(order.voucher_discount ?? 0) > 0 && (
                      <div className="flex justify-between gap-8 text-emerald-400">
                        <span>Voucher</span>
                        <span>-{formatCurrency(order.voucher_discount ?? 0)}</span>
                      </div>
                    )}
                    {(order.loyalty_discount ?? 0) > 0 && (
                      <div className="flex justify-between gap-8 text-emerald-400">
                        <span>Điểm thưởng</span>
                        <span>-{formatCurrency(order.loyalty_discount ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 border-t border-white/10 pt-2 text-base font-bold">
                      <span className="text-white/70">Tổng cộng</span>
                      <span className="text-primary-400">{formatCurrency(order.final_amount ?? order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom row: Store + Customer + Timestamps */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Store */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Chi nhánh
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-white/35">Tên</p>
                    <p className="font-semibold text-white/90">{order.franchise?.name || (order as any).franchise_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">Mã</p>
                    <p className="font-mono text-sm text-white/70">{String(order.franchise?.code || (order as any).franchise_code || "N/A")}</p>
                  </div>
                  {order.created_by_user && (
                    <div>
                      <p className="text-xs text-white/35">Nhân viên tạo</p>
                      <p className="font-semibold text-white/90">{order.created_by_user.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Khách hàng
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-white/35">Tên</p>
                    <p className="font-semibold text-white/90">{order.customer?.name || (order as any).customer_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">SĐT</p>
                    <p className="font-semibold text-white/90">{order.customer?.phone || (order as any).phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">Email</p>
                    <p className="text-sm text-white/70 break-all">{String(order.customer?.email || (order as any).email || "N/A")}</p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Thời gian
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-white/35">Ngày tạo</p>
                    <p className="font-semibold text-white/90">{new Date(order.created_at).toLocaleString("vi-VN")}</p>
                  </div>
                  {order.confirmed_at && (
                    <div>
                      <p className="text-xs text-white/35">Xác nhận</p>
                      <p className="font-semibold text-white/90">{new Date(order.confirmed_at).toLocaleString("vi-VN")}</p>
                    </div>
                  )}
                  {order.completed_at && (
                    <div>
                      <p className="text-xs text-white/35">Hoàn thành</p>
                      <p className="font-semibold text-emerald-400">{new Date(order.completed_at).toLocaleString("vi-VN")}</p>
                    </div>
                  )}
                  {order.cancelled_at && (
                    <div>
                      <p className="text-xs text-white/35">Hủy</p>
                      <p className="font-semibold text-red-400">{new Date(order.cancelled_at).toLocaleString("vi-VN")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>        </div>
        </div>
      </div>
    );
}

// ─── Popup Modal wrapper(dùng từ OrderList) ─────────────────────────────────
interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailModal({ orderId, onClose, onStatusChange }: OrderDetailModalProps) {
  // Lock body scroll khi modal mở
  useEffect(() => {
    if (!orderId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [orderId]);

  if (!orderId) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Full-screen panel — solid background, không để lộ content phía sau */}
      <div
        className="relative z-10 ml-auto flex h-full w-full flex-col overflow-hidden"
        style={{
          background: "rgb(10, 15, 30)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex shrink-0 items-center justify-between gap-4 px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>
            <div className="h-5 w-px bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Chi tiết đơn hàng</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10 sm:py-8">
            <OrderDetailContent orderId={orderId} onClose={onClose} onStatusChange={onStatusChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page (giữ lại để route cũ vẫn hoạt động) ────────────────────────────────
const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <OrderDetailContent orderId={id} />;
};

export default OrderDetailPage;
