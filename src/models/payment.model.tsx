// Note: Theo ERD, Payment không được định nghĩa như một bảng riêng
// Payment được xử lý thông qua Order với trường type (POS/ONLINE)
// và status của Order để theo dõi trạng thái thanh toán

// Import Order types để tham chiếu
import type { OrderType, OrderStatus } from "./order.model";

// Nếu cần tracking payment riêng, có thể dùng Order với các trường:
// - type: POS/ONLINE (phương thức thanh toán)
// - status: theo dõi trạng thái đơn hàng
// - total_amount: số tiền thanh toán

export type PaymentMethodType = OrderType; // "POS" | "ONLINE"
export type PaymentStatus = OrderStatus; // Status của order

// Payment view - Mapping từ Order để hiển thị thông tin thanh toán
export interface Payment {
  id: number; // order.id
  order_id: number;
  order_code: string;
  franchise_id: number;
  franchise_name?: string;
  franchise_code?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  method: PaymentMethodType; // order.type
  status: PaymentStatus; // order.status
  amount: number; // order.total_amount
  transaction_id?: string; // Có thể lưu trong note hoặc custom field
  created_at: string; // order.created_at
  updated_at: string; // order.updated_at
  confirmed_at?: string; // order.confirmed_at
  completed_at?: string; // order.completed_at
  cancelled_at?: string; // order.cancelled_at
}

// Payment Log có thể dùng OrderStatusLog
export interface PaymentLog {
  id: number;
  order_id: number;
  from_status: PaymentStatus;
  to_status: PaymentStatus;
  changed_by: number;
  note?: string;
  created_at: string;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  DRAFT: "Chưa thanh toán",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang xử lý",
  COMPLETED: "Thành công",
  CANCELLED: "Đã hủy",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  DRAFT: "bg-gray-50 text-gray-700 border-gray-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  POS: "Tại quầy",
  ONLINE: "Thanh toán online",
};
