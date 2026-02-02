import type { LoyaltyTier } from "./customer.model";

export interface LoyaltyRule {
  id: string;
  pointsPerAmount: number; // Points per VND (e.g., 1 point per 1000 VND)
  tierRules: TierRule[];
}

export interface TierRule {
  tier: LoyaltyTier;
  minPoints: number;
  benefits: string[];
}

export interface LoyaltyHistory {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  pointsChange: number; // Positive for earned, negative for deducted
  reason: string;
  createDate: string;
  previousPoints: number;
  newPoints: number;
  previousTier?: LoyaltyTier;
  newTier?: LoyaltyTier;
}

export interface LoyaltyOverview {
  totalCustomers: number;
  customersByTier: Record<LoyaltyTier, number>;
  totalPointsIssued: number;
  averagePointsPerCustomer: number;
}

export const DEFAULT_LOYALTY_RULE: LoyaltyRule = {
  id: "1",
  pointsPerAmount: 0.001, // 1 point per 1000 VND
  tierRules: [
    {
      tier: "BRONZE",
      minPoints: 0,
      benefits: ["Tích điểm cơ bản", "Thông báo khuyến mãi", "Sinh nhật tặng voucher 20k"],
    },
    {
      tier: "SILVER",
      minPoints: 1000,
      benefits: ["Tích điểm x1.5", "Giảm giá 5% mọi đơn", "Sinh nhật tặng voucher 50k", "Ưu tiên phục vụ"],
    },
    {
      tier: "GOLD",
      minPoints: 5000,
      benefits: ["Tích điểm x2", "Giảm giá 10% mọi đơn", "Sinh nhật tặng bánh miễn phí", "Phục vụ VIP", "Ưu đãi đặc biệt hàng tháng"],
    },
  ],
};
