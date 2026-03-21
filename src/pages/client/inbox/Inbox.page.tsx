import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";
import {
  NOTIFICATION_TYPE_CONFIG,
  PRIORITY_CONFIG,
  type NotificationType,
  type Notification,
} from "@/types/notification.types";
import { formatTimeAgo } from "@/utils/index";
import { ROUTER_URL } from "@/routes/router.const";

const ALL_TYPES: NotificationType[] = ["ORDER", "PAYMENT", "SHIPPING", "PROMOTION", "NEWS", "SYSTEM", "SUPPORT"];

// ─── Smart redirect helper ────────────────────────────────────────────────────
function useSmartRedirect() {
  const navigate = useNavigate();
  return (notif: Notification) => {
    const { type, metadata } = notif;
    if (type === "ORDER" && metadata?.orderId) {
      navigate(ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", metadata.orderId));
    } else if (type === "PAYMENT") {
      toast.info(`Mã giao dịch: ${metadata?.paymentId ?? "—"}`);
    } else if (type === "SHIPPING" && metadata?.orderId) {
      navigate(ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", metadata.orderId));
    } else if (type === "PROMOTION" && metadata?.promoCode) {
      toast.success(`Mã giảm giá: ${metadata.promoCode}`, {
        description: "Dùng mã này tại trang thanh toán!",
        duration: 6000,
      });
    } else if (type === "NEWS" && metadata?.newsSlug) {
      toast.info("Chức năng xem tin tức sẽ sớm ra mắt!");
    } else if (type === "SUPPORT" && metadata?.supportTicketId) {
      toast.info(`Ticket hỗ trợ: ${metadata.supportTicketId}`);
    }
  };
}

// ─── Single notification card ─────────────────────────────────────────────────
function NotificationCard({
  notif,
  onRead,
  onDelete,
  onPin,
  onRedirect,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRedirect: (notif: Notification) => void;
}) {
  const cfg = NOTIFICATION_TYPE_CONFIG[notif.type];
  const priorityCfg = PRIORITY_CONFIG[notif.priority];

  async function handleCopy() {
    const content = [
      notif.title,
      notif.message,
      notif.metadata?.promoCode ? `Mã: ${notif.metadata.promoCode}` : "",
      notif.metadata?.orderId ? `Đơn hàng: ${notif.metadata.orderId}` : "",
      notif.metadata?.paymentId ? `Giao dịch: ${notif.metadata.paymentId}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Đã sao chép nội dung!", { description: "Nội dung thông báo đã được sao chép vào clipboard." });
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-4 transition-all duration-200 group",
        !notif.isRead ? `${cfg.bg} ${cfg.border}` : "bg-white border-gray-100 hover:border-gray-200",
        notif.isPinned && "ring-2 ring-amber-300",
      )}
    >
      {/* Pinned ribbon */}
      {notif.isPinned && (
        <div className="absolute top-0 right-0 text-amber-500 text-xs font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl bg-amber-50 border-l border-b border-amber-200">
          📌 Đã ghim
        </div>
      )}

      <div className="flex gap-3">
        {/* Type Icon */}
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0", cfg.bg, cfg.border, "border")}>
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold leading-tight", !notif.isRead ? "text-gray-900" : "text-gray-700")}>
                {notif.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                  {cfg.icon} {cfg.label}
                </span>
                {notif.priority === "HIGH" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full", priorityCfg.dot)} />
                    {priorityCfg.label}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{formatTimeAgo(notif.createdAt)}</span>
                {!notif.isRead && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Chưa đọc
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{notif.message}</p>

          {/* Promo code pill */}
          {notif.metadata?.promoCode && (
            <div className="mt-2 inline-flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-1.5">
              <span className="text-pink-700 font-bold text-sm tracking-widest">{notif.metadata.promoCode}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="text-pink-500 hover:text-pink-700 text-xs font-medium transition-colors"
              >
                📋 Sao chép mã
              </button>
            </div>
          )}

          {/* Order/Payment ref */}
          {(notif.metadata?.orderId || notif.metadata?.paymentId) && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {notif.metadata.orderId && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                  Đơn: <strong>#{notif.metadata.orderId}</strong>
                </span>
              )}
              {notif.metadata.paymentId && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                  GD: <strong>{notif.metadata.paymentId}</strong>
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Smart CTA */}
            {["ORDER", "SHIPPING"].includes(notif.type) && notif.metadata?.orderId && (
              <button
                onClick={() => { onRead(notif.id); onRedirect(notif); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Xem đơn hàng →
              </button>
            )}
            {notif.type === "PROMOTION" && notif.metadata?.promoCode && (
              <button
                onClick={() => { onRead(notif.id); onRedirect(notif); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition-colors"
              >
                🎁 Dùng ngay
              </button>
            )}
            {notif.type === "NEWS" && (
              <button
                onClick={() => { onRead(notif.id); onRedirect(notif); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                📰 Xem chi tiết
              </button>
            )}
            {notif.type === "SUPPORT" && (
              <button
                onClick={() => { onRead(notif.id); onRedirect(notif); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors"
              >
                💬 Xem ticket
              </button>
            )}

            {/* Utility actions */}
            {!notif.isRead && (
              <button
                onClick={() => onRead(notif.id)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
              >
                ✓ Đánh dấu đã đọc
              </button>
            )}
            <button
              onClick={handleCopy}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
            >
              📋 Sao chép
            </button>
            <button
              onClick={() => onPin(notif.id)}
              className={cn(
                "text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all",
                notif.isPinned
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50",
              )}
            >
              {notif.isPinned ? "📌 Bỏ ghim" : "📌 Ghim"}
            </button>
            <button
              onClick={() => {
                onDelete(notif.id);
                toast.success("Đã xoá thông báo");
              }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-100 hover:border-red-200 text-red-500 hover:bg-red-50 transition-all ml-auto"
            >
              🗑 Xoá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const {
    notifications, mutedTypes,
    markAsRead, markAllAsRead, deleteNotification, pinNotification,
    muteType, unmuteType, unreadCount,
  } = useNotificationStore();
  const smartRedirect = useSmartRedirect();

  const [activeType, setActiveType] = useState<NotificationType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Redirect if not logged in
  if (!user) {
    navigate(ROUTER_URL.LOGIN, { state: { from: ROUTER_URL.INBOX } });
    return null;
  }

  const filtered = useMemo(() => {
    return notifications
      .filter((n) => !n.isDeleted)
      .filter((n) => activeType === "ALL" || n.type === activeType)
      .filter((n) => !showUnreadOnly || !n.isRead)
      .filter((n) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.metadata?.promoCode ?? "").toLowerCase().includes(q) ||
          (n.metadata?.orderId ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notifications, activeType, search, showUnreadOnly]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const totalUnread = unreadCount();

  // Counts per type
  const countByType = useMemo(() => {
    const map: Partial<Record<NotificationType, number>> = {};
    notifications.filter((n) => !n.isDeleted && !n.isRead).forEach((n) => {
      map[n.type] = (map[n.type] ?? 0) + 1;
    });
    return map;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hộp thư thông báo</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalUnread > 0 ? `${totalUnread} thông báo chưa đọc` : "Tất cả đã đọc ✓"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={showUnreadOnly ? () => setShowUnreadOnly(false) : () => setShowUnreadOnly(true)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-xl border transition-all",
                showUnreadOnly ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
              )}
            >
              {showUnreadOnly ? "✓ Chưa đọc" : "Chưa đọc"}
            </button>
            <button
              onClick={() => { markAllAsRead(); toast.success("Đã đánh dấu tất cả là đã đọc"); }}
              disabled={totalUnread === 0}
              className="text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-600 bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✓ Đọc tất cả
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

          {/* ── LEFT: Filters ── */}
          <div className="space-y-4">

            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Tìm kiếm thông báo..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-red-400 text-sm outline-none transition-all"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Type filter */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Lọc theo loại</p>
              <div className="space-y-1">
                <button
                  onClick={() => { setActiveType("ALL"); setPage(1); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    activeType === "ALL" ? "bg-red-50 text-red-700 border border-red-200" : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <span>🔔 Tất cả</span>
                  {totalUnread > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold rounded-full px-1.5 py-0.5">{totalUnread}</span>
                  )}
                </button>
                {ALL_TYPES.map((type) => {
                  const cfg = NOTIFICATION_TYPE_CONFIG[type];
                  const cnt = countByType[type] ?? 0;
                  const muted = mutedTypes[type];
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <button
                        onClick={() => { setActiveType(type); setPage(1); }}
                        className={cn(
                          "flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all",
                          activeType === type ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : "text-gray-600 hover:bg-gray-50",
                          muted && "opacity-50",
                        )}
                      >
                        <span>{cfg.icon} {cfg.label}</span>
                        {cnt > 0 && !muted && (
                          <span className={cn("text-xs font-bold rounded-full px-1.5 py-0.5", cfg.bg, cfg.color)}>{cnt}</span>
                        )}
                      </button>
                      <button
                        onClick={() => muted ? unmuteType(type) : muteType(type)}
                        title={muted ? "Bật thông báo" : "Tắt thông báo"}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-xs"
                      >
                        {muted ? "🔕" : "🔔"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Tổng quan</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Tổng thông báo", value: notifications.filter((n) => !n.isDeleted).length },
                  { label: "Chưa đọc", value: totalUnread, highlight: totalUnread > 0 },
                  { label: "Đã ghim", value: notifications.filter((n) => n.isPinned && !n.isDeleted).length },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className={cn("font-bold", stat.highlight ? "text-red-600" : "text-gray-800")}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Notification list ── */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
                <p className="text-5xl mb-3">📭</p>
                <p className="text-gray-700 font-semibold">Không có thông báo</p>
                <p className="text-sm text-gray-400 mt-1">
                  {search ? `Không tìm thấy kết quả cho "${search}"` : "Hộp thư của bạn đang trống"}
                </p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-3 text-sm text-red-600 hover:underline">
                    Xoá tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 font-medium px-1">
                  {filtered.length} thông báo{activeType !== "ALL" ? ` • ${NOTIFICATION_TYPE_CONFIG[activeType].label}` : ""}
                </div>
                {paginated.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onRead={markAsRead}
                    onDelete={deleteNotification}
                    onPin={pinNotification}
                    onRedirect={smartRedirect}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="w-full py-3 rounded-2xl border border-dashed border-gray-300 hover:border-red-300 text-sm text-gray-500 hover:text-red-600 font-medium transition-all bg-white hover:bg-red-50"
                  >
                    Tải thêm ({filtered.length - paginated.length} thông báo còn lại)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
