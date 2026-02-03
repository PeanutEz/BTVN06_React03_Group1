import type { LoyaltyRule, LoyaltyHistory, LoyaltyOverview } from "../models/loyalty.model";
import { DEFAULT_LOYALTY_RULE } from "../models/loyalty.model";

// Mock data
let currentRule: LoyaltyRule = { ...DEFAULT_LOYALTY_RULE };

const mockLoyaltyHistory: LoyaltyHistory[] = [
  {
    id: "LH001",
    customerId: "CUST001",
    customerName: "Nguyễn Văn A",
    orderId: "ORD001",
    pointsChange: 180,
    reason: "Tích điểm từ đơn hàng ORD001 (2x Cà phê Phin + Croissant + Trà Sữa)",
    createDate: "2026-02-01T11:00:00Z",
    previousPoints: 5020,
    newPoints: 5200,
    previousTier: "GOLD",
    newTier: "GOLD",
  },
  {
    id: "LH002",
    customerId: "CUST002",
    customerName: "Trần Thị B",
    orderId: "ORD002",
    pointsChange: 275,
    reason: "Tích điểm từ đơn hàng ORD002 (2x Caramel Macchiato + 2x Tiramisu + Freeze Socola)",
    createDate: "2026-01-31T09:15:00Z",
    previousPoints: 1225,
    newPoints: 1500,
    previousTier: "SILVER",
    newTier: "SILVER",
  },
  {
    id: "LH003",
    customerId: "CUST003",
    customerName: "Lê Văn C",
    orderId: "ORD003",
    pointsChange: 60,
    reason: "Tích điểm từ đơn hàng ORD003 (Cà phê Đen Đá + Bánh Mì)",
    createDate: "2026-02-02T08:45:00Z",
    previousPoints: 390,
    newPoints: 450,
    previousTier: "BRONZE",
    newTier: "BRONZE",
  },
  {
    id: "LH004",
    customerId: "CUST001",
    customerName: "Nguyễn Văn A",
    pointsChange: -150,
    reason: "Đổi điểm lấy voucher giảm giá 50.000đ",
    createDate: "2026-01-25T14:30:00Z",
    previousPoints: 5170,
    newPoints: 5020,
    previousTier: "GOLD",
    newTier: "GOLD",
  },
  {
    id: "LH005",
    customerId: "CUST002",
    customerName: "Trần Thị B",
    pointsChange: 95,
    reason: "Tích điểm sinh nhật x2",
    createDate: "2026-01-20T10:00:00Z",
    previousPoints: 1130,
    newPoints: 1225,
    previousTier: "SILVER",
    newTier: "SILVER",
  },
];

export const fetchLoyaltyRule = async (): Promise<LoyaltyRule> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return currentRule;
};

export const updateLoyaltyRule = async (rule: LoyaltyRule): Promise<LoyaltyRule> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  currentRule = { ...rule };
  return currentRule;
};

export const fetchLoyaltyHistory = async (): Promise<LoyaltyHistory[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockLoyaltyHistory;
};

export const fetchLoyaltyOverview = async (): Promise<LoyaltyOverview> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    totalCustomers: 156,
    customersByTier: {
      BRONZE: 98,
      SILVER: 42,
      GOLD: 16,
    },
    totalPointsIssued: 285430,
    averagePointsPerCustomer: 1830,
  };
};

export const addLoyaltyHistory = async (
  customerId: string,
  customerName: string,
  pointsChange: number,
  reason: string,
  orderId?: string
): Promise<LoyaltyHistory> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newHistory: LoyaltyHistory = {
    id: `LH${String(mockLoyaltyHistory.length + 1).padStart(3, "0")}`,
    customerId,
    customerName,
    orderId,
    pointsChange,
    reason,
    createDate: new Date().toISOString(),
    previousPoints: 0, // Would be calculated from customer data
    newPoints: pointsChange, // Would be calculated from customer data
  };
  mockLoyaltyHistory.push(newHistory);
  return newHistory;
};
