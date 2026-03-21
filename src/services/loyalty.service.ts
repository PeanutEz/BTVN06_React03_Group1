import type { 
  LoyaltyRule, 
  LoyaltyTransaction, 
  LoyaltyTransactionType,
  LoyaltyOverview
} from "../models/loyalty.model";

import apiClient from "./api.client";

// Mock data

const mockLoyaltyTransactions: LoyaltyTransaction[] = [
  {
    id: 1,
    customer_franchise_id: 1,
    order_id: 1,
    type: "EARN",
    point_change: 180,
    reason: "Tích điểm từ đơn hàng ORD001 (2x Cà phê Phin + Croissant + Trà Sữa)",
    created_by: 5,
    is_deleted: false,
    created_at: "2026-02-01T11:00:00Z",
    updated_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 2,
    customer_franchise_id: 2,
    order_id: 2,
    type: "EARN",
    point_change: 275,
    reason: "Tích điểm từ đơn hàng ORD002 (2x Caramel Macchiato + 2x Tiramisu + Freeze Socola)",
    created_by: 1,
    is_deleted: false,
    created_at: "2026-01-31T09:15:00Z",
    updated_at: "2026-01-31T09:15:00Z",
  },
  {
    id: 3,
    customer_franchise_id: 3,
    order_id: 3,
    type: "EARN",
    point_change: 60,
    reason: "Tích điểm từ đơn hàng ORD003 (Cà phê Đen Đá + Bánh Mì)",
    created_by: 6,
    is_deleted: false,
    created_at: "2026-02-02T08:45:00Z",
    updated_at: "2026-02-02T08:45:00Z",
  },
  {
    id: 4,
    customer_franchise_id: 1,
    type: "REDEEM",
    point_change: -150,
    reason: "Đổi điểm lấy voucher giảm giá 50.000đ",
    created_by: 5,
    is_deleted: false,
    created_at: "2026-01-25T14:30:00Z",
    updated_at: "2026-01-25T14:30:00Z",
  },
  {
    id: 5,
    customer_franchise_id: 2,
    type: "ADJUST",
    point_change: 95,
    reason: "Tích điểm sinh nhật x2",
    created_by: 1,
    is_deleted: false,
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
  },
];

type LoyaltySearchPayload = Record<string, unknown>;

type LoyaltyPageInfo = {
  totalItems?: number;
  totalPages?: number;
  pageNum?: number;
  pageSize?: number;
};

export const searchLoyaltyRules = async (
  payload: LoyaltySearchPayload,
): Promise<{ items: LoyaltyRule[]; pageInfo: LoyaltyPageInfo }> => {
  try {
    const response = await apiClient.post("/loyalty-rules/search", payload);
    const rData = response.data?.data;
    
    // Some endpoints return flat arrays in data, others nest inside data.items
    const items = Array.isArray(rData) ? rData : (rData?.items || []);
    const pageInfo = response.data?.pageInfo || rData?.pageInfo || { totalItems: 0, totalPages: 1, pageNum: 1, pageSize: 10 };
    
    return { items, pageInfo };
  } catch (error) {
    console.error("searchLoyaltyRules error:", error);
    throw error;
  }
};

export const getLoyaltyRuleById = async (id: string): Promise<LoyaltyRule> => {
  try {
    const response = await apiClient.get(`/loyalty-rules/${id}`);
    return response.data?.data;
  } catch (error) {
    console.error("getLoyaltyRuleById error:", error);
    throw error;
  }
};

export const createLoyaltyRule = async (rule: Partial<LoyaltyRule>): Promise<LoyaltyRule> => {
  try {
    const response = await apiClient.post(`/loyalty-rules`, rule);
    return response.data?.data;
  } catch (error) {
    console.error("createLoyaltyRule error:", error);
    throw error;
  }
};

export const updateLoyaltyRule = async (id: string, rule: Partial<LoyaltyRule>): Promise<LoyaltyRule> => {
  try {
    const response = await apiClient.put(`/loyalty-rules/${id}`, rule);
    return response.data?.data;
  } catch (error) {
    console.error("updateLoyaltyRule error:", error);
    throw error;
  }
};

// Toggle active status (usually done via PUT with full or partial payload)
export const changeLoyaltyRuleStatus = async (id: string, nextStatus: boolean, existingRule: LoyaltyRule): Promise<LoyaltyRule> => {
  return updateLoyaltyRule(id, { ...existingRule, is_active: nextStatus });
};

// Delete rule (soft delete if supported, or via PUT)
export const deleteLoyaltyRule = async (id: string, existingRule: LoyaltyRule): Promise<LoyaltyRule> => {
  return updateLoyaltyRule(id, { ...existingRule, is_deleted: true });
};

export const restoreLoyaltyRule = async (id: string, existingRule: LoyaltyRule): Promise<LoyaltyRule> => {
  return updateLoyaltyRule(id, { ...existingRule, is_deleted: false });
};

export const fetchLoyaltyTransactions = async (): Promise<LoyaltyTransaction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockLoyaltyTransactions.filter(t => !t.is_deleted);
};

type LoyaltyTransactionDisplay = LoyaltyTransaction & {
  franchise_name: string;
  franchise_code: string;
  order_code?: string;
};

// Helper function to add franchise and order info
const mapTransactionToDisplay = async (transaction: LoyaltyTransaction): Promise<LoyaltyTransactionDisplay> => {
  // Map franchise info based on customer_franchise_id
  const franchiseMap: Record<number, { name: string, code: string }> = {
    1: { name: "WBS Coffee Hoàn Kiếm", code: "WBS-HN-01" },
    2: { name: "WBS Coffee Quận 1", code: "WBS-HCM-01" },
    3: { name: "WBS Coffee Hải Châu", code: "WBS-DN-01" },
  };
  
  const franchise = franchiseMap[transaction.customer_franchise_id] || { name: "N/A", code: "N/A" };
  
  // Map order code
  const orderCodeMap: Record<number, string> = {
    1: "ORD001",
    2: "ORD002",
    3: "ORD003",
  };
  
  return {
    ...transaction,
    franchise_name: franchise.name,
    franchise_code: franchise.code,
    order_code: transaction.order_id ? orderCodeMap[transaction.order_id] : undefined,
  };
};

export const fetchLoyaltyTransactionsWithDetails = async (): Promise<LoyaltyTransactionDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const transactions = mockLoyaltyTransactions.filter(t => !t.is_deleted);
  return Promise.all(transactions.map(mapTransactionToDisplay));
};

export const fetchLoyaltyTransactionsByCustomerFranchise = async (
  customerFranchiseId: number
): Promise<LoyaltyTransaction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockLoyaltyTransactions.filter(
    t => t.customer_franchise_id === customerFranchiseId && !t.is_deleted
  );
};

export const createLoyaltyTransaction = async (
  data: Omit<LoyaltyTransaction, "id" | "created_at" | "updated_at">
): Promise<LoyaltyTransaction> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newTransaction: LoyaltyTransaction = {
    ...data,
    id: mockLoyaltyTransactions.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockLoyaltyTransactions.push(newTransaction);
  return newTransaction;
};

export const fetchLoyaltyOverview = async (): Promise<LoyaltyOverview> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    total_customers: 156,
    customers_by_tier: {
      BRONZE: 12,
      SILVER: 86,
      GOLD: 42,
      PLATINUM: 16,
    },
    total_points_issued: 285430,
    average_points_per_customer: 1830,
  };
};

export const filterLoyaltyTransactions = async (
  type?: LoyaltyTransactionType,
  _franchiseId?: number,
  startDate?: string,
  endDate?: string
): Promise<LoyaltyTransaction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockLoyaltyTransactions.filter((transaction) => {
    if (transaction.is_deleted) return false;
    if (type && transaction.type !== type) return false;
    if (startDate && new Date(transaction.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(transaction.created_at) > new Date(endDate)) return false;
    return true;
  });
};
