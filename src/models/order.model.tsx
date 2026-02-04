// Order Types
export type OrderType = "POS" | "ONLINE";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED";

// OrderItem - Chi tiết sản phẩm trong đơn hàng
export interface OrderItem {
  id: number;
  order_id: number;
  product_franchise_id: number;
  product_name_snapshot: string; // Tên tại thời điểm mua
  price_snapshot: number; // Giá tại thời điểm mua
  quantity: number;
  line_total: number; // price × quantity
  is_deleted: boolean; // default false
  created_at: string;
  updated_at: string;
}

// Order - Đơn hàng
export interface Order {
  id: number;
  code: string; // unique
  franchise_id: number;
  customer_id: number;
  type: OrderType; // POS/ONLINE
  status: OrderStatus; // DRAFT / CONFIRMED / PREPARING / COMPLETED / CANCELLED
  total_amount: number; // Tổng tiền snapshot, không tính lại từ product
  confirmed_at?: string; // timestamp - Chốt đơn
  completed_at?: string; // timestamp - Hoàn tất
  cancelled_at?: string; // timestamp - Huỷ
  created_by?: number; // nullable -> Staff tạo (POS)
  is_deleted: boolean; // default false
  created_at: string;
  updated_at: string;
  
  // Relations (optional, for display purposes)
  items?: OrderItem[];
  franchise?: {
    id: number;
    code: string;
    name: string;
  };
  customer?: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  created_by_user?: {
    id: number;
    name: string;
  };
}

// OrderStatusLog - Lịch sử thay đổi trạng thái đơn hàng
export interface OrderStatusLog {
  id: number;
  order_id: number;
  from_status: OrderStatus;
  to_status: OrderStatus;
  changed_by: number;
  note?: string; // nullable -> optional
  created_at: string;
  updated_at: string;
  
  // Relations (optional)
  changed_by_user?: {
    id: number;
    name: string;
  };
}

// Display model for UI
export interface OrderDisplay extends Order {
  status_history?: OrderStatusLog[];
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  POS: "Tại quầy",
  ONLINE: "Online",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-50 text-gray-700 border-gray-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};
