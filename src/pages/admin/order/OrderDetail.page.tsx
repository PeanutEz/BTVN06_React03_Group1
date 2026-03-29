import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../models/order.model";
import { fetchOrderById, updateOrderStatus } from "../../../services/order.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import { useAuthStore } from "../../../store";
import { getOrderItemDisplayMeta } from "../../../utils/orderItemDisplay.util";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { adminProductService } from "../../../services/product.service";
import { fetchCustomerById } from "../../../services/customer.service";
import { getFranchiseById } from "../../../services/store.service";
import type { ApiFranchise } from "../../../services/store.service";
import type { CustomerDisplay } from "../../../models/customer.model";

function getOrderItemImage(item: Record<string, unknown>, imageMap: Record<string, string>): string | null {
  // Ưu tiên lấy từ imageMap (fetch từ product service)
  const pfId = String(item.product_franchise_id ?? "");
  if (pfId && imageMap[pfId]) return imageMap[pfId];
  // Fallback: field trực tiếp nếu API trả về
  const value = item.product_image_url ?? item.image_url ?? item.image ?? item.product_image ?? item.product_image_snapshot;
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

interface ToppingData { name: string; price: number; productFranchiseId: string; }

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function formatRawCartOptions(options: unknown): string {
  if (!Array.isArray(options)) return "";

  const aggregated = new Map<string, number>();
  options.forEach((option) => {
    if (!option || typeof option !== "object") return;
    const optionRecord = option as Record<string, unknown>;
    const nestedProduct =
      optionRecord.product && typeof optionRecord.product === "object"
        ? (optionRecord.product as Record<string, unknown>)
        : null;

    const optionName = firstNonEmptyText(
      optionRecord.name,
      optionRecord.option_name,
      optionRecord.label,
      optionRecord.product_name,
      optionRecord.product_name_snapshot,
      nestedProduct?.name,
    );
    if (!optionName) return;

    const rawQty = Number(optionRecord.quantity ?? optionRecord.qty ?? 1);
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    aggregated.set(optionName, (aggregated.get(optionName) ?? 0) + quantity);
  });

  if (aggregated.size === 0) return "";

  return Array.from(aggregated.entries())
    .map(([name, quantity]) => `${name} x${quantity}`)
    .join(", ");
}

function buildRawCartInlineMeta(item: Record<string, unknown>): string {
  const size = firstNonEmptyText(
    item.size,
    item.size_snapshot,
    item.option_size,
    item.size_name,
    item.size_label,
    item.variant_size,
  );
  const sugar = firstNonEmptyText(item.sugar, item.sugar_level, item.sugar_snapshot);
  const ice = firstNonEmptyText(item.ice, item.ice_level, item.ice_snapshot);

  const parts: string[] = [];
  if (size) {
    parts.push(/^size\s*:/i.test(size) ? size : `Size: ${size}`);
  }
  if (sugar) {
    parts.push(/đường/i.test(sugar) ? sugar : `Đường: ${sugar}`);
  }
  if (ice) {
    parts.push(/đá/i.test(ice) ? ice : `Đá: ${ice}`);
  }

  return parts.join(" • ");
}

/** Extract full topping data list from raw item.toppings */
function getToppingDataList(item: Record<string, unknown>): ToppingData[] {
  const raw = item.toppings;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      name: String((t as any).name ?? (t as any).topping_name ?? (t as any).product_name_snapshot ?? "").trim(),
      price: Number((t as any).price ?? (t as any).price_snapshot ?? 0),
      productFranchiseId: String((t as any).product_franchise_id ?? (t as any).productFranchiseId ?? "").trim(),
    }))
    .filter((t) => t.name);
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
  // topping name (lowercase) → { price, imageUrl }
  const [toppingMetaMap, setToppingMetaMap] = useState<Record<string, { price: number; imageUrl: string | null }>>({}); 
  const [customerDetail, setCustomerDetail] = useState<CustomerDisplay | null>(null);
  const [franchiseDetail, setFranchiseDetail] = useState<ApiFranchise | null>(null);
  const lastId = useRef<string | undefined>(undefined);

  /** Fetch topping price + image by searching product-franchise catalog by topping name */
  const loadToppingMetadata = async (items: any[], franchiseId: string) => {
    if (!franchiseId || !items.length) return;
    try {
      // Collect all unique topping names across all items
      const toppingNames = [...new Set(
        items.flatMap((item) => {
          const meta = getOrderItemDisplayMeta(item as Record<string, unknown>);
          return meta.toppings.map((t) => t.name.trim());
        }).filter(Boolean)
      )];
      if (!toppingNames.length) return;

      // Search all product-franchises for this franchise (no name filter = get all)
      const res = await adminProductFranchiseService.searchProductFranchises({
        searchCondition: { franchise_id: franchiseId, is_deleted: false, is_active: true },
        pageInfo: { pageNum: 1, pageSize: 200 },
      });
      const pfList = res.data ?? [];

      // Fetch product details for all unique product_ids
      const productIds = [...new Set(pfList.map((pf) => pf.product_id).filter(Boolean))];
      const productResults = await Promise.allSettled(
        productIds.map((id) => adminProductService.getProductById(id))
      );
      const productMap: Record<string, { name: string; image_url: string }> = {};
      productResults.forEach((r) => {
        if (r.status === "fulfilled" && r.value?.id) {
          productMap[r.value.id] = { name: r.value.name ?? "", image_url: r.value.image_url ?? "" };
        }
      });

      // Build map: product name (lowercase) → { price, imageUrl }
      const meta: Record<string, { price: number; imageUrl: string | null }> = {};
      for (const pf of pfList) {
        const product = productMap[pf.product_id];
        if (!product) continue;
        const key = product.name.trim().toLowerCase();
        if (!meta[key]) {
          meta[key] = { price: pf.price_base ?? 0, imageUrl: product.image_url || null };
        }
      }
      setToppingMetaMap(meta);
    } catch {
      // silent fallback
    }
  };

  // Fetch ảnh cho tất cả items (bao gồm cả toppings) sau khi có order
  const loadImages = async (items: any[]) => {
    if (!items.length) return;
    try {
      // Lấy tất cả product_franchise_id unique — cả item lẫn topping
      const itemPfIds = items.map((i) => String(i.product_franchise_id ?? "")).filter(Boolean);
      const toppingPfIds = items.flatMap((i) =>
        getToppingDataList(i as Record<string, unknown>).map((t) => t.productFranchiseId)
      ).filter(Boolean);
      const pfIds = [...new Set([...itemPfIds, ...toppingPfIds])];
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
      // Fetch customer detail
      const customerId = data.customer_id ?? data.customer?._id ?? data.customer?.id;
      if (customerId) {
        fetchCustomerById(String(customerId)).then(c => setCustomerDetail(c)).catch(() => {});
      }
      // Fetch franchise detail + topping metadata
      const franchiseId = data.franchise_id ?? data.franchise?._id ?? data.franchise?.id;
      if (franchiseId) {
        getFranchiseById(String(franchiseId)).then(f => setFranchiseDetail(f)).catch(() => {});
        loadToppingMetadata(data.items ?? [], String(franchiseId));
      }
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

  const canPrepare = order.status === "CONFIRMED"; return (
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
                  const itemRecord = item as Record<string, unknown>;
                  const productRecord =
                    itemRecord.product && typeof itemRecord.product === "object"
                      ? (itemRecord.product as Record<string, unknown>)
                      : null;

                  const productName = String(
                    item.product_name_snapshot ??
                      item.product_name ??
                      itemRecord.name ??
                      productRecord?.name ??
                      "Sản phẩm",
                  ).trim() || "Sản phẩm";

                  const rawUnitPrice = Number(
                    item.price_snapshot ??
                      item.price ??
                      itemRecord.unit_price ??
                      itemRecord.product_cart_price ??
                      0,
                  );
                  const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice > 0 ? rawUnitPrice : 0;

                  const rawQuantity = Number(item.quantity ?? itemRecord.qty ?? 1);
                  const qty = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

                  const rawLineTotal = Number(
                    item.line_total ??
                      item.subtotal ??
                      itemRecord.final_line_total ??
                      itemRecord.lineTotal ??
                      0,
                  );
                  const lineTotal =
                    Number.isFinite(rawLineTotal) && rawLineTotal > 0
                      ? rawLineTotal
                      : unitPrice * qty;

                  const imageUrl = getOrderItemImage(itemRecord, imageMap);
                  const meta = getOrderItemDisplayMeta(itemRecord);
                  const toppingDataList = getToppingDataList(itemRecord);
                  const rawNoteText = firstNonEmptyText(
                    itemRecord.note,
                    itemRecord.message,
                    itemRecord.note_snapshot,
                    itemRecord.selection_note,
                    itemRecord.special_instruction,
                  );
                  const rawInlineMeta = buildRawCartInlineMeta(itemRecord);
                  const rawOptionsText = formatRawCartOptions(itemRecord.options);

                  const displayMetaText =
                    meta.inlineMeta ||
                    rawInlineMeta ||
                    (meta.toppings.length === 0 && rawOptionsText ? `Topping: ${rawOptionsText}` : "");

                  const noteText = (meta.noteText || rawNoteText).trim();
                  const shouldShowNote =
                    !!noteText &&
                    (!displayMetaText || noteText.toLowerCase() !== displayMetaText.toLowerCase());

                  // Build lookup maps from raw toppings array (for price + productFranchiseId)
                  const toppingRawMap = Object.fromEntries(
                    toppingDataList.map((t) => [t.name.trim().toLowerCase(), t])
                  );
                  return (
                    <div key={item._id ?? item.id ?? `item-${idx}`}>
                      {/* Main row */}
                      <div className="grid grid-cols-12 items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.04]">
                        <div className="col-span-6 flex items-start gap-3">
                          {/* Product image */}
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08]">
                            {imageUrl ? (
                              <img src={imageUrl} alt={String(productName)} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">☕</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white/90 leading-snug break-words">{String(productName)}</p>
                            {displayMetaText && (
                              <p className="text-[11px] text-white/40 mt-0.5 break-words">{displayMetaText}</p>
                            )}
                            {shouldShowNote && (
                              <p className="text-[11px] text-white/35 mt-0.5 italic break-words">Ghi chú: "{noteText}"</p>
                            )}
                          </div>
                        </div>
                        <p className="col-span-2 pt-0.5 text-right text-sm text-white/55">
                          {unitPrice > 0 ? formatCurrency(unitPrice) : "--"}
                        </p>
                        <p className="col-span-2 pt-0.5 text-center">
                          <span className="inline-block rounded-lg bg-white/[0.08] px-2.5 py-0.5 text-sm font-bold text-white/80">×{qty}</span>
                        </p>
                        <p className="col-span-2 pt-0.5 text-right text-sm font-semibold text-amber-200">
                          {formatCurrency(lineTotal)}
                        </p>
                      </div>
                      {/* Topping rows — dùng meta.toppings (full source) + tra price/image từ raw */}
                      {meta.toppings.length > 0 && (
                        <div className="mb-1 space-y-0.5 pb-1">
                          {meta.toppings.map((tp, tIdx) => {
                            const raw = toppingRawMap[tp.name.trim().toLowerCase()];
                            const catalogMeta = toppingMetaMap[tp.name.trim().toLowerCase()];
                            const tpImageUrl = raw?.productFranchiseId
                              ? imageMap[raw.productFranchiseId] ?? catalogMeta?.imageUrl ?? null
                              : catalogMeta?.imageUrl ?? null;
                            const tpPrice = raw?.price || catalogMeta?.price || 0;
                            const tpQty = tp.quantity * qty;
                            return (
                              <div key={tIdx} className="grid grid-cols-12 items-center gap-3 px-2 py-1 rounded-lg bg-white/[0.02]">
                                <div className="col-span-6 flex items-center gap-3">
                                  {/* Topping image */}
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                                    {tpImageUrl
                                      ? <img src={tpImageUrl} alt={tp.name} className="w-full h-full object-cover" />
                                      : <span className="text-base">🧋</span>
                                    }
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white/20 shrink-0">└</span>
                                    <span className="text-xs text-white/50 truncate">{tp.name}</span>
                                  </div>                                </div>
                                <p className="col-span-2 text-right text-xs text-white/40">
                                  {tpPrice > 0 ? formatCurrency(tpPrice) : "—"}
                                </p>
                                <p className="col-span-2 text-center text-xs text-white/40">×{tpQty}</p>
                                <p className="col-span-2 text-right text-xs text-amber-100/80">
                                  {tpPrice > 0 ? formatCurrency(tpPrice * tpQty) : "—"}
                                </p>
                              </div>
                            );
                          })}
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

            {/* Bottom row: Store + Customer */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  {franchiseDetail?.logo_url && (
                    <div className="mb-3 flex justify-center">
                      <img src={franchiseDetail.logo_url} alt="logo" className="h-12 w-auto rounded-xl object-contain border border-white/10" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/35">Tên</p>
                    <p className="font-semibold text-white/90">{franchiseDetail?.name || order.franchise?.name || (order as any).franchise_name || "N/A"}</p>
                  </div>
                  {(franchiseDetail?.code || order.franchise?.code) && (
                    <div>
                      <p className="text-xs text-white/35">Mã chi nhánh</p>
                      <p className="font-semibold text-white/90">{franchiseDetail?.code || order.franchise?.code}</p>
                    </div>
                  )}
                  {franchiseDetail?.address && (
                    <div>
                      <p className="text-xs text-white/35">Địa chỉ</p>
                      <p className="text-sm text-white/70">{franchiseDetail.address}</p>
                    </div>
                  )}
                  {franchiseDetail?.hotline && (
                    <div>
                      <p className="text-xs text-white/35">Hotline</p>
                      <p className="font-semibold text-white/90">{franchiseDetail.hotline}</p>
                    </div>
                  )}
                  {(franchiseDetail?.opened_at || franchiseDetail?.closed_at) && (
                    <div>
                      <p className="text-xs text-white/35">Giờ mở cửa</p>
                      <p className="font-semibold text-white/90">{franchiseDetail.opened_at} – {franchiseDetail.closed_at}</p>
                    </div>
                  )}
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
                  {(customerDetail?.avatar_url) && (
                    <div className="mb-3 flex justify-center">
                      <img src={customerDetail.avatar_url} alt="avatar" className="size-14 rounded-full object-cover border border-white/10" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/35">Tên</p>
                    <p className="font-semibold text-white/90">{customerDetail?.name || order.customer?.name || (order as any).customer_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">SĐT</p>
                    <p className="font-semibold text-white/90">{customerDetail?.phone || order.customer?.phone || (order as any).phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">Email</p>
                    <p className="text-sm text-white/70 break-all">{customerDetail?.email || String(order.customer?.email || (order as any).email || "N/A")}</p>
                  </div>
                  {customerDetail?.address && (
                    <div>
                      <p className="text-xs text-white/35">Địa chỉ</p>
                      <p className="text-sm text-white/70">{customerDetail.address}</p>
                    </div>
                  )}
                  {(order.loyalty_points_used ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-white/35">Điểm tích lũy đã dùng</p>
                      <p className="font-semibold text-amber-400">{order.loyalty_points_used} điểm</p>
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
  variant?: "drawer" | "dialog";
}

export function OrderDetailModal({ orderId, onClose, onStatusChange, variant = "drawer" }: OrderDetailModalProps) {
  // Lock body scroll khi modal mở
  useEffect(() => {
    if (!orderId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, orderId]);

  if (!orderId) return null;

  const isDialog = variant === "dialog";

  return ReactDOM.createPortal(
    <div className={isDialog ? "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" : "fixed inset-0 z-50 flex"}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={
          isDialog
            ? "relative z-10 flex h-[92vh] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgb(10,15,30)] shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
            : "relative z-10 ml-auto flex h-full w-full flex-col overflow-hidden border-l border-white/10 bg-[rgb(10,15,30)] shadow-[-20px_0_60px_rgba(0,0,0,0.7)]"
        }
      >
        {/* Top bar */}
        <div
          className="flex shrink-0 items-center justify-between gap-4 px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            {!isDialog && (
              <>
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
              </>
            )}
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
          <div className={isDialog ? "px-5 py-5 sm:px-8 sm:py-6" : "mx-auto max-w-7xl px-6 py-6 sm:px-10 sm:py-8"}>
            <OrderDetailContent orderId={orderId} onClose={onClose} onStatusChange={onStatusChange} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Page (giữ lại để route cũ vẫn hoạt động) ────────────────────────────────
const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <OrderDetailContent orderId={id} />;
};

export default OrderDetailPage;
