import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components";
import type { CustomerDisplay } from "../../../models/customer.model";
import {
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_COLORS,
} from "../../../models/customer.model";
import { changeCustomerStatus, fetchCustomerById } from "../../../services/customer.service";
import { fetchOrders } from "../../../services/order.service";
import type { OrderDisplay } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../../models/order.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

type Tab = "info" | "orders";

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  onEdit?: (customer: CustomerDisplay) => void;
}

function AvatarLarge({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-20 rounded-full object-cover ring-4 ring-white/30 shadow-lg"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <div className="size-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/30 shadow-lg">
      {initials}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.10] last:border-0">
      <span className="text-sm text-white/60 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-white/95 text-right">{children}</span>
    </div>
  );
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const glassStyle = {
  background: "rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  boxShadow:
    "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
};

export default function CustomerDetailModal({
  customerId,
  onClose,
}: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDisplay | null>(null);
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const data = await fetchCustomerById(customerId);
        if (!data || controller.signal.aborted) return;
        setCustomer(data);
        setIsActive(data.is_active);
        const allOrders = await fetchOrders();
        if (controller.signal.aborted) return;
        setOrders(allOrders.filter((o) => String(o.customer_id) === String(data.id)));
      } catch {
        // silently handled
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [customerId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleToggleStatus = async (newValue: boolean) => {
    if (!customer) return;
    setSaving(true);
    try {
      await changeCustomerStatus(customer.id, newValue);
      setIsActive(newValue);
      setCustomer((prev) => prev ? { ...prev, is_active: newValue } : prev);
      showSuccess(newValue ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hoá tài khoản");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Thay đổi trạng thái thất bại";
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayName = customer?.name || "...";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop — nhạt để màu nền admin hiện qua, tạo hiệu ứng glassmorphism */}
      <div className="absolute inset-0 bg-black/25" />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl animate-slide-in overflow-hidden"
        style={glassStyle}
      >

        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600/60 to-primary-700/50 px-6 pt-6 pb-14 shrink-0 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {!loading && customer && (
            <div className="flex items-center gap-4">
              <AvatarLarge name={displayName} url={customer.avatar_url} />
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow">{displayName}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                      isActive
                        ? "bg-green-500/25 text-green-300 border-green-400/40"
                        : "bg-white/[0.08] text-white/60 border-white/[0.15]"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-white/40"}`} />
                    {isActive ? "Hoạt động" : "Ngưng"}
                  </span>
                  {customer.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500/25 text-blue-300 border border-blue-400/40">
                      Đã xác thực
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {loading && <div className="h-20 animate-pulse rounded-xl bg-white/10" />}
        </div>

        {/* Tabs */}
        <div className="flex -mt-5 px-6 bg-white/[0.05] relative z-10 rounded-t-2xl shrink-0 border-b border-white/[0.10]">
          {(["info", "orders"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? "border-primary-400 text-primary-300"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t === "info"
                ? "Thông tin"
                : `Đơn hàng${orders.length ? ` (${orders.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.08]" />
              ))}
            </div>
          )}

          {!loading && !customer && (
            <div className="flex h-40 items-center justify-center text-white/50 text-sm">
              Không tìm thấy thông tin khách hàng
            </div>
          )}

          {!loading && customer && tab === "info" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Liên hệ</p>
                <InfoRow label="Họ tên">{customer.name || "—"}</InfoRow>
                <InfoRow label="Email">{customer.email || "—"}</InfoRow>
                <InfoRow label="Số điện thoại">{customer.phone || "—"}</InfoRow>
              </div>

              <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Tài khoản</p>
                <InfoRow label="Ngày tạo">
                  {new Date(customer.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </InfoRow>
                <InfoRow label="Cập nhật">
                  {new Date(customer.updated_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </InfoRow>
                <InfoRow label="Xác thực email">
                  {customer.is_verified ? (
                    <span className="text-blue-300 font-semibold">Đã xác thực</span>
                  ) : (
                    <span className="text-white/50">Chưa xác thực</span>
                  )}
                </InfoRow>
                <div className="flex items-center justify-between gap-4 pt-2.5">
                  <span className="text-sm text-white/60 shrink-0">Trạng thái</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleToggleStatus(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                      isActive ? "bg-green-500" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Thống kê</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white/[0.07] p-4 text-center border border-white/[0.10]">
                    <p className="text-2xl font-bold text-white">{orders.length}</p>
                    <p className="text-xs text-white/55 mt-1">Tổng đơn hàng</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.07] p-4 text-center border border-white/[0.10]">
                    <p className="text-lg font-bold text-green-400">
                      {formatCurrency(orders.reduce((s, o) => s + o.total_amount, 0))}
                    </p>
                    <p className="text-xs text-white/55 mt-1">Tổng chi tiêu</p>
                  </div>
                </div>
              </div>

              {customer.franchises && customer.franchises.length > 0 && (
                <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Thành viên</p>
                  <div className="divide-y divide-white/[0.08]">
                    {customer.franchises.map((cf) => (
                      <div key={cf.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-white/90">{cf.franchise?.name || "Cửa hàng"}</p>
                          <p className="text-xs text-white/50">{cf.franchise?.code}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary-400">{cf.loyalty_point.toLocaleString()} pts</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${LOYALTY_TIER_COLORS[cf.loyalty_tier]}`}>
                            {LOYALTY_TIER_LABELS[cf.loyalty_tier]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && customer && tab === "orders" && (
            <div>
              {orders.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-white/50">
                  <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Chưa có đơn hàng nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.12]">
                  <table className="min-w-full divide-y divide-white/[0.10] text-sm">
                    <thead className="bg-white/[0.07]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/55">Mã đơn</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/55">Ngày tạo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/55">Tổng tiền</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/55">Trạng thái</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.08]">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-white/[0.06] transition-colors">
                          <td className="px-4 py-3 font-semibold text-primary-400">{order.code}</td>
                          <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white/90">{formatCurrency(order.total_amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order.id}`}
                              onClick={onClose}
                            >
                              <Button size="sm" variant="outline">Xem</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && customer && (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.10] px-6 py-4 shrink-0 bg-white/[0.05]">
            <p className="text-xs text-white/50">
              Cập nhật lần cuối: {new Date(customer.updated_at).toLocaleString("vi-VN")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
