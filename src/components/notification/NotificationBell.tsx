import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";
import { NOTIFICATION_TYPE_CONFIG } from "@/types/notification.types";
import { ROUTER_URL } from "@/routes/router.const";
import { formatTimeAgo } from "@/utils/index";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { hydrate, unreadCount, recentFive, markAsRead, markAllAsRead, isInitialized } =
    useNotificationStore();

  useEffect(() => {
    if (!isInitialized) hydrate();
  }, [isInitialized, hydrate]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = unreadCount();
  const recent = recentFive();

  function handleBellClick() {
    if (!user) {
      toast.error("Vui lòng đăng nhập để xem thông báo", {
        action: { label: "Đăng nhập", onClick: () => navigate(ROUTER_URL.LOGIN) },
      });
      return;
    }
    setOpen((v) => !v);
  }

  function handleNotifClick(id: string) {
    markAsRead(id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        aria-label="Hộp thư thông báo"
        className="hidden lg:flex items-center justify-center relative w-10 h-10 rounded-full border-2 border-red-600 hover:bg-red-50 text-red-700 transition-all duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none animate-in zoom-in">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[999] overflow-hidden origin-top-right animate-in slide-in-from-top-2 fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-red-700 to-red-600">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">Thông báo</span>
              {count > 0 && (
                <span className="bg-white text-red-600 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {count} mới
                </span>
              )}
            </div>
            <button
              onClick={() => { markAllAsRead(); toast.success("Đã đánh dấu tất cả là đã đọc"); }}
              className="text-red-200 hover:text-white text-xs font-medium transition-colors"
            >
              Đọc tất cả ✓
            </button>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {recent.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2">🔔</p>
                <p className="text-sm text-gray-500">Không có thông báo</p>
              </div>
            ) : (
              recent.map((notif) => {
                const cfg = NOTIFICATION_TYPE_CONFIG[notif.type];
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif.id)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex gap-3 group",
                      !notif.isRead && "bg-red-50/40",
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5", cfg.bg)}>
                      {cfg.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold text-gray-900 leading-tight truncate", !notif.isRead && "text-red-900")}>
                          {notif.title}
                        </p>
                        {notif.isPinned && <span className="text-amber-500 text-xs shrink-0">📌</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatTimeAgo(notif.createdAt)}</span>
                        {!notif.isRead && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              to={ROUTER_URL.INBOX}
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-semibold py-1 transition-colors"
            >
              Xem tất cả thông báo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
