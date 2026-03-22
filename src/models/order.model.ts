// Order Types
export type OrderType = "POS" | "ONLINE";

// Order Status - Aligned with API Spec
// API Spec: PENDING → PREPARING → READY_FOR_PICKUP → DELIVERING → COMPLETED (+ CANCELLED)
// Legacy statuses (DRAFT, CONFIRMED) kept for backward compatibility
export type OrderStatus =
  | "PENDING"           // API Spec: Initial status after checkout
  | "DRAFT"             // Legacy: Same as PENDING (kept for backward compat)
  | "CONFIRMED"         // Legacy: Order confirmed by staff
  | "PREPARING"         // API Spec: Order being prepared
  | "READY_FOR_PICKUP"  // API Spec: Ready for pickup/delivery
  | "DELIVERING"        // API Spec: Order being delivered
  | "COMPLETED"         // API Spec: Order completed
  | "CANCELLED";        // API Spec: Order cancelled

// OrderItem - Chi tiết sản phẩm trong đơn hàng
export interface OrderItem {
  _id?: string;
  id?: string | number;
  order_id?: string | number;
  product_franchise_id?: string | number;
  product_id?: string | number;
  product_name_snapshot: string;
  product_name?: string; // Alternative field name from backend
  price_snapshot: number;
  price?: number; // Alternative field name from backend
  quantity: number;
  line_total: number;
  subtotal?: number; // Alternative field name from backend
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Order - Đơn hàng
export interface Order {
  _id?: string;
  id?: string | number;
  code: string;
  franchise_id?: string | number;
  customer_id?: string | number;
  type: OrderType;
  status: OrderStatus;
  total_amount: number;
  subtotal_amount?: number; // Subtotal from backend
  final_amount?: number; // Final amount from backend (often used instead of total_amount)
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_by?: string | number;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;

  // Backend fields (alternative formats)
  customer_name?: string; // Direct field from backend
  franchise_name?: string; // Direct field from backend
  phone?: string; // Customer phone
  loyalty_points_used?: number;
  loyalty_discount?: number;
  voucher_discount?: number;
  voucher_type?: string;
  voucher_value?: number;
  promotion_discount?: number;
  promotion_type?: string;
  promotion_value?: number;

  items?: OrderItem[]; // Standard format
  order_items?: OrderItem[]; // Backend format
  franchise?: {
    _id?: string;
    id?: string | number;
    code?: string;
    name: string;
  };
  customer?: {
    _id?: string;
    id?: string | number;
    name: string;
    phone?: string;
    email?: string;
  };
  created_by_user?: {
    _id?: string;
    id?: string | number;
    name: string;
  };
  [key: string]: unknown;
}

// OrderStatusLog
export interface OrderStatusLog {
  _id?: string;
  id?: string | number;
  order_id?: string | number;
  from_status: OrderStatus;
  to_status: OrderStatus;
  changed_by?: string | number;
  note?: string;
  created_at?: string;
  updated_at?: string;

  changed_by_user?: {
    _id?: string;
    id?: string | number;
    name: string;
  };
}

// Display model for UI — alias for Order (kept for backward compat)
export interface OrderDisplay extends Order {
  status_history?: OrderStatusLog[];
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  POS: "Tại quầy",
  ONLINE: "Online",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý",
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  READY_FOR_PICKUP: "Sẵn sàng lấy hàng",
  DELIVERING: "Đang giao hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  DRAFT: "bg-gray-50 text-gray-700 border-gray-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-orange-50 text-orange-700 border-orange-200",
  READY_FOR_PICKUP: "bg-amber-50 text-amber-700 border-amber-200",
  DELIVERING: "bg-purple-50 text-purple-700 border-purple-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

// Order status flow according to API spec
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "DELIVERING",
  "COMPLETED",
];
