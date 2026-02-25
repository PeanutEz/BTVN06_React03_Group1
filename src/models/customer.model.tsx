// Customer - Khách hàng toàn hệ thống
export interface Customer {
  id: number;
  phone: string; // unique
  email?: string; // nullable
  password_hash: string;
  name: string;
  avatar_url?: string;
  is_active: boolean; // default true
  is_deleted: boolean; // default false
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

// CustomerFranchise - Khách hàng theo cửa hàng
export type LoyaltyTier = "SILVER" | "GOLD" | "PLATINUM";

export interface CustomerFranchise {
  id: number;
  customer_id: number;
  franchise_id: number;
  loyalty_point: number; // default 0
  loyalty_tier: LoyaltyTier; // Silver/Gold/Platinum
  first_order_at?: string; // timestamp
  last_order_at?: string; // timestamp
  is_active: boolean; // default true
  is_deleted: boolean; // default false
  created_at: string; // timestamp
  updated_at: string; // timestamp
  
  // Relations (optional, for display purposes)
  customer?: Customer;
  franchise?: {
    id: number;
    code: string;
    name: string;
  };
}

// Display models for UI
export interface CustomerDisplay extends Customer {
  franchises?: CustomerFranchise[];
  orderCount?: number;
  totalSpent?: number;
}

export const LOYALTY_TIER_LABELS: Record<LoyaltyTier, string> = {
  SILVER: "Bạc",
  GOLD: "Vàng",
  PLATINUM: "Bạch Kim",
};

export const LOYALTY_TIER_COLORS: Record<LoyaltyTier, string> = {
  SILVER: "bg-gray-50 text-gray-700 border-gray-300",
  GOLD: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PLATINUM: "bg-purple-50 text-purple-700 border-purple-200",
};
