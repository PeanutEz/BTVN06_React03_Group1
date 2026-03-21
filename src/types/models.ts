// Type definitions based on DBML schema

// ============ Franchise ============
export interface Franchise {
  id: number;
  code: string;
  name: string;
  logo_url?: string;
  address: string;
  opened_at?: string;
  closed_at?: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Customer ============
export interface Customer {
  id: number;
  phone: string; // unique
  email?: string;
  password_hash: string;
  name: string;
  avatar_url?: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Customer Franchise ============
export type LoyaltyTier = "SILVER" | "GOLD" | "PLATINUM";

export interface CustomerFranchise {
  id: number;
  customer_id: number;
  franchise_id: number;
  loyalty_point: number; // default 0
  loyalty_tier: LoyaltyTier;
  first_order_at?: string;
  last_order_at?: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Order ============
export type OrderType = "POS" | "ONLINE";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED";

export interface Order {
  id: number;
  code: string; // unique
  franchise_id: number;
  customer_id: number;
  type: OrderType;
  status: OrderStatus;
  total_amount: number; // Tổng tiền snapshot
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_by?: number; // nullable -> Staff tạo (POS)
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Order Item ============
export interface OrderItem {
  id: number;
  order_id: number;
  product_franchise_id: number;
  product_name_snapshot: string; // Tên tại thời điểm mua
  price_snapshot: number; // Giá tại thời điểm mua
  quantity: number;
  line_total: number; // price × quantity
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Loyalty Transaction ============
export type LoyaltyTransactionType = "EARN" | "REDEEM" | "ADJUST";

export interface LoyaltyTransaction {
  id: number;
  customer_franchise_id: number;
  order_id?: number;
  type: LoyaltyTransactionType;
  point_change: number; // + / -
  reason: string;
  created_by: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Display Models (with relations) ============
export interface OrderWithRelations extends Order {
  items?: OrderItem[];
  customer?: Customer;
  franchise?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface CustomerFranchiseWithRelations extends CustomerFranchise {
  customer?: Customer;
  franchise?: Franchise;
}

export interface LoyaltyTransactionWithRelations extends LoyaltyTransaction {
  customer_franchise?: CustomerFranchiseWithRelations;
  order?: Order;
}

// ============ Dashboard Models ============
export interface LoyaltyDashboard {
  total_points: number;
  tier: LoyaltyTier;
  total_orders: number;
  total_spending: number;
  next_tier?: LoyaltyTier;
  points_to_next_tier?: number;
}

export interface LoyaltyPointsSummary {
  current_points: number;
  points_earned: number;
  points_redeemed: number;
  remaining: number;
}

export interface TierInfo {
  tier: LoyaltyTier;
  min_points: number;
  max_points?: number;
  condition: string;
  benefits: string[];
}

// ============ Static Page Models ============
export interface StaticPage {
  id: number;
  title: string;
  content: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// ============ Constants ============
export const LOYALTY_TIER_LABELS: Record<LoyaltyTier, string> = {
  SILVER: "Bạc",
  GOLD: "Vàng",
  PLATINUM: "Bạch Kim",
};

export const LOYALTY_TIER_COLORS: Record<LoyaltyTier, string> = {
  SILVER: "bg-gray-100 text-gray-800 border-gray-300",
  GOLD: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PLATINUM: "bg-purple-100 text-purple-800 border-purple-300",
};

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
  DRAFT: "default",
  CONFIRMED: "processing",
  PREPARING: "warning",
  COMPLETED: "success",
  CANCELLED: "error",
};

export const LOYALTY_TRANSACTION_TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  EARN: "Tích điểm",
  REDEEM: "Đổi điểm",
  ADJUST: "Điều chỉnh",
};

export const LOYALTY_TRANSACTION_TYPE_COLORS: Record<LoyaltyTransactionType, string> = {
  EARN: "success",
  REDEEM: "warning",
  ADJUST: "info",
};
