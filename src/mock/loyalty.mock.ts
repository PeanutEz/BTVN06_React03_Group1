// Mock data following DBML structure
export interface LoyaltyTransactionMock {
  id: string;
  customer_franchise_id: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  point_change: number;
  reason: string;
  order_id?: string;
  created_at: string;
}

export const mockLoyaltyTransactions: LoyaltyTransactionMock[] = [
  {
    id: "LT-001",
    customer_franchise_id: "CF-001",
    type: "EARN",
    point_change: 180,
    reason: "Tích điểm từ đơn hàng ORD-2024-001",
    order_id: "1",
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "LT-002",
    customer_franchise_id: "CF-001",
    type: "EARN",
    point_change: 95,
    reason: "Tích điểm từ đơn hàng ORD-2024-003",
    order_id: "3",
    created_at: "2024-01-17T08:50:00Z",
  },
  {
    id: "LT-003",
    customer_franchise_id: "CF-001",
    type: "REDEEM",
    point_change: -150,
    reason: "Đổi điểm lấy voucher giảm giá 50.000đ",
    created_at: "2024-01-20T14:30:00Z",
  },
  {
    id: "LT-004",
    customer_franchise_id: "CF-002",
    type: "EARN",
    point_change: 275,
    reason: "Tích điểm từ đơn hàng ORD-2024-002",
    order_id: "2",
    created_at: "2024-01-16T14:25:00Z",
  },
  {
    id: "LT-005",
    customer_franchise_id: "CF-003",
    type: "ADJUST",
    point_change: 10,
    reason: "Điều chỉnh điểm thủ công",
    created_at: "2024-01-18T10:00:00Z",
  },
];
