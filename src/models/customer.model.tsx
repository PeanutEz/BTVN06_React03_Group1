export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD";

export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  tier: LoyaltyTier;
  loyaltyPoints: number;
  status: CustomerStatus;
  createDate: string;
  updateDate: string;
  orderCount?: number;
  totalSpent?: number;
}

export const LOYALTY_TIER_LABELS: Record<LoyaltyTier, string> = {
  BRONZE: "Đồng",
  SILVER: "Bạc",
  GOLD: "Vàng",
};

export const LOYALTY_TIER_COLORS: Record<LoyaltyTier, string> = {
  BRONZE: "bg-orange-50 text-orange-700 border-orange-200",
  SILVER: "bg-gray-50 text-gray-700 border-gray-300",
  GOLD: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngưng hoạt động",
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-gray-50 text-gray-700 border-gray-200",
};
