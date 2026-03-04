import type { LoyaltyTier } from "./customer.model";

// LoyaltyTransaction - Lịch sử giao dịch điểm thưởng
export type LoyaltyTransactionType = "EARN" | "REDEEM" | "ADJUST";

export interface LoyaltyTransaction {
  id: number;
  customer_franchise_id: number; // FK to customer_franchise
  order_id?: number; // nullable - FK to order
  type: LoyaltyTransactionType; // EARN / REDEEM / ADJUST
  point_change: number; // + / -
  reason: string;
  created_by: number; // Staff / Manager
  is_deleted: boolean; // default false
  created_at: string;
  updated_at: string;
  
  // Relations (optional, for display)
  customer_franchise?: {
    id: number;
    customer_id: number;
    franchise_id: number;
    loyalty_point: number;
    loyalty_tier: LoyaltyTier;
    customer?: {
      id: number;
      name: string;
      phone: string;
    };
  };
  order?: {
    id: number;
    code: string;
    total_amount: number;
  };
  created_by_user?: {
    id: number;
    name: string;
  };
}

// Display model with before/after data
export interface LoyaltyTransactionDisplay extends LoyaltyTransaction {
  customer_name?: string;
  customer_phone?: string;
  previous_points?: number;
  new_points?: number;
  previous_tier?: LoyaltyTier;
  new_tier?: LoyaltyTier;
}

// Loyalty Rules Configuration
export interface LoyaltyRule {
  id: number;
  points_per_amount: number; // Points per VND (e.g., 1 point per 1000 VND)
  tier_rules: TierRule[];
}

export interface TierRule {
  tier: LoyaltyTier;
  min_points: number;
  benefits: string[];
}

// Loyalty Overview cho Dashboard
export interface LoyaltyOverview {
  total_customers: number;
  customers_by_tier: Record<LoyaltyTier, number>;
  total_points_issued: number;
  average_points_per_customer: number;
}

export const LOYALTY_TRANSACTION_TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  EARN: "Tích điểm",
  REDEEM: "Đổi điểm",
  ADJUST: "Điều chỉnh",
};

export const LOYALTY_TRANSACTION_TYPE_COLORS: Record<LoyaltyTransactionType, string> = {
  EARN: "bg-green-50 text-green-700 border-green-200",
  REDEEM: "bg-orange-50 text-orange-700 border-orange-200",
  ADJUST: "bg-blue-50 text-blue-700 border-blue-200",
};

export const DEFAULT_LOYALTY_RULE: LoyaltyRule = {
  id: 1,
  points_per_amount: 0.001, // 1 point per 1000 VND
  tier_rules: [
    {
      tier: "SILVER",
      min_points: 0,
      benefits: ["Tích điểm cơ bản", "Thông báo khuyến mãi", "Sinh nhật tặng voucher 50k"],
    },
    {
      tier: "GOLD",
      min_points: 1000,
      benefits: ["Tích điểm x1.5", "Giảm giá 5% mọi đơn", "Sinh nhật tặng voucher 100k", "Ưu tiên phục vụ"],
    },
    {
      tier: "PLATINUM",
      min_points: 5000,
      benefits: ["Tích điểm x2", "Giảm giá 10% mọi đơn", "Sinh nhật tặng bánh miễn phí", "Phục vụ VIP", "Ưu đãi đặc biệt hàng tháng"],
    },
  ],
};
