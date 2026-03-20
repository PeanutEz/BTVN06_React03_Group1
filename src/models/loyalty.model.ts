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

export interface LoyaltyRule {
  _id?: string;
  id?: string;
  franchise_id?: string;
  earn_amount_per_point: number;
  redeem_value_per_point: number;
  min_redeem_points: number;
  max_redeem_points: number;
  tier_rules: TierRule[];
  description?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SearchLoyaltyRuleDto {
  searchCondition: {
    franchise_id?: string;
    earn_amount_per_point?: string | number;
    redeem_value_per_point?: string | number;
    tier?: string;
    is_active?: boolean;
    is_deleted?: boolean;
  };
  pageInfo: {
    pageNum: number;
    pageSize: number;
  };
}

export interface LoyaltyRulePaginatedResponse {
  items: LoyaltyRule[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TierBenefit {
  order_discount_percent: number;
  earn_multiplier: number;
  free_shipping: boolean;
}

export interface TierRule {
  tier: LoyaltyTier;
  min_points: number;
  max_points?: number;
  benefit: TierBenefit;
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
  earn_amount_per_point: 10000,
  redeem_value_per_point: 1000,
  min_redeem_points: 5,
  max_redeem_points: 1000,
  tier_rules: [
    {
      tier: "BRONZE",
      min_points: 0,
      max_points: 299,
      benefit: {
        order_discount_percent: 0,
        earn_multiplier: 1,
        free_shipping: false
      }
    },
    {
      tier: "SILVER",
      min_points: 300,
      max_points: 999,
      benefit: {
        order_discount_percent: 3,
        earn_multiplier: 1,
        free_shipping: false
      }
    },
    {
      tier: "GOLD",
      min_points: 1000,
      max_points: 1999,
      benefit: {
        order_discount_percent: 5,
        earn_multiplier: 1.25,
        free_shipping: false
      }
    },
    {
      tier: "PLATINUM",
      min_points: 2000,
      benefit: {
        order_discount_percent: 10,
        earn_multiplier: 1.5,
        free_shipping: true
      }
    },
  ],
};
