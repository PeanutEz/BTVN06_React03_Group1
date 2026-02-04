// Mock data following DBML structure
export interface OrderMock {
  id: string;
  code: string;
  franchise_id: string;
  customer_id: string;
  type: "POS" | "ONLINE";
  status: "DRAFT" | "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED";
  total_amount: number;
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface OrderItemMock {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  line_total: number;
}

export const mockOrders: OrderMock[] = [
  {
    id: "1",
    code: "ORD-2024-001",
    franchise_id: "FRANCHISE-001",
    customer_id: "CUSTOMER-001",
    type: "ONLINE",
    status: "COMPLETED",
    total_amount: 180000,
    created_at: "2024-01-15T10:30:00Z",
    confirmed_at: "2024-01-15T10:35:00Z",
    completed_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "2",
    code: "ORD-2024-002",
    franchise_id: "FRANCHISE-001",
    customer_id: "CUSTOMER-002",
    type: "POS",
    status: "PREPARING",
    total_amount: 275000,
    created_at: "2024-01-16T14:20:00Z",
    confirmed_at: "2024-01-16T14:25:00Z",
  },
  {
    id: "3",
    code: "ORD-2024-003",
    franchise_id: "FRANCHISE-002",
    customer_id: "CUSTOMER-001",
    type: "ONLINE",
    status: "CONFIRMED",
    total_amount: 95000,
    created_at: "2024-01-17T08:45:00Z",
    confirmed_at: "2024-01-17T08:50:00Z",
  },
  {
    id: "4",
    code: "ORD-2024-004",
    franchise_id: "FRANCHISE-001",
    customer_id: "CUSTOMER-003",
    type: "POS",
    status: "CANCELLED",
    total_amount: 120000,
    created_at: "2024-01-17T15:00:00Z",
    cancelled_at: "2024-01-17T15:10:00Z",
  },
  {
    id: "5",
    code: "ORD-2024-005",
    franchise_id: "FRANCHISE-002",
    customer_id: "CUSTOMER-002",
    type: "ONLINE",
    status: "DRAFT",
    total_amount: 65000,
    created_at: "2024-01-18T09:00:00Z",
  },
];

export const mockOrderItems: OrderItemMock[] = [
  {
    id: "1",
    order_id: "1",
    product_id: "PRODUCT-001",
    product_name_snapshot: "Cà phê Phin Việt Nam (Vừa)",
    price_snapshot: 45000,
    quantity: 2,
    line_total: 90000,
  },
  {
    id: "2",
    order_id: "1",
    product_id: "PRODUCT-002",
    product_name_snapshot: "Bánh Croissant",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
  },
  {
    id: "3",
    order_id: "1",
    product_id: "PRODUCT-003",
    product_name_snapshot: "Trà Sữa Trân Châu Đường Đen (Size L)",
    price_snapshot: 55000,
    quantity: 1,
    line_total: 55000,
  },
  {
    id: "4",
    order_id: "2",
    product_id: "PRODUCT-004",
    product_name_snapshot: "Caramel Macchiato (Size L)",
    price_snapshot: 65000,
    quantity: 2,
    line_total: 130000,
  },
  {
    id: "5",
    order_id: "2",
    product_id: "PRODUCT-005",
    product_name_snapshot: "Tiramisu",
    price_snapshot: 45000,
    quantity: 2,
    line_total: 90000,
  },
  {
    id: "6",
    order_id: "2",
    product_id: "PRODUCT-006",
    product_name_snapshot: "Freeze Socola (Size L)",
    price_snapshot: 55000,
    quantity: 1,
    line_total: 55000,
  },
  {
    id: "7",
    order_id: "3",
    product_id: "PRODUCT-007",
    product_name_snapshot: "Cà phê Đen Đá (Vừa)",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
  },
  {
    id: "8",
    order_id: "3",
    product_id: "PRODUCT-008",
    product_name_snapshot: "Bánh Mì Pate",
    price_snapshot: 25000,
    quantity: 1,
    line_total: 25000,
  },
  {
    id: "9",
    order_id: "3",
    product_id: "PRODUCT-009",
    product_name_snapshot: "Nước Ép Cam",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
  },
];
