// ─── Notification Types ──────────────────────────────────────────────────────

export type NotificationType =
  | "ORDER"
  | "PAYMENT"
  | "SHIPPING"
  | "PROMOTION"
  | "NEWS"
  | "SYSTEM"
  | "SUPPORT";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH";

export interface NotificationMetadata {
  orderId?: string;
  paymentId?: string;
  promotionId?: string;
  trackingId?: string;
  newsSlug?: string;
  supportTicketId?: string;
  promoCode?: string;
  redirectUrl?: string;
}

export interface Notification {
  id: string;
  userId: string;          // "ALL" for broadcast
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  priority: NotificationPriority;
  isRead: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;       // ISO string
  readAt?: string;
  expiresAt?: string;
}

// ─── Config per type ─────────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  ORDER:     { label: "Đơn hàng",      icon: "📦", color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  PAYMENT:   { label: "Thanh toán",    icon: "💳", color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  SHIPPING:  { label: "Vận chuyển",    icon: "🛵", color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  PROMOTION: { label: "Khuyến mãi",    icon: "🎁", color: "text-pink-700",   bg: "bg-pink-50",    border: "border-pink-200" },
  NEWS:      { label: "Tin tức",       icon: "📰", color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  SYSTEM:    { label: "Hệ thống",      icon: "⚙️", color: "text-gray-700",   bg: "bg-gray-50",    border: "border-gray-200" },
  SUPPORT:   { label: "Hỗ trợ",        icon: "💬", color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200" },
};

export const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { label: string; color: string; dot: string }
> = {
  HIGH:   { label: "Quan trọng", color: "text-red-600",   dot: "bg-red-500" },
  NORMAL: { label: "Bình thường", color: "text-gray-500",  dot: "bg-gray-400" },
  LOW:    { label: "Thấp",       color: "text-gray-400",  dot: "bg-gray-300" },
};
