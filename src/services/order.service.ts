import type { Order, OrderItem, OrderStatus, OrderType, OrderDisplay, OrderStatusLog } from "../models/order.model";

// Mock data
const mockOrders: Order[] = [
  {
    id: 1,
    code: "ORD001",
    franchise_id: 1,
    customer_id: 1,
    type: "POS",
    status: "COMPLETED",
    total_amount: 180000,
    confirmed_at: "2026-02-01T10:35:00Z",
    completed_at: "2026-02-01T11:00:00Z",
    created_by: 5, // Staff ID
    is_deleted: false,
    created_at: "2026-02-01T10:30:00Z",
    updated_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 2,
    code: "ORD002",
    franchise_id: 2,
    customer_id: 2,
    type: "ONLINE",
    status: "COMPLETED",
    total_amount: 275000,
    confirmed_at: "2026-01-30T14:25:00Z",
    completed_at: "2026-01-31T09:15:00Z",
    created_by: 6, // Staff ID
    is_deleted: false,
    created_at: "2026-01-30T14:20:00Z",
    updated_at: "2026-01-31T09:15:00Z",
  },
  {
    id: 3,
    code: "ORD003",
    franchise_id: 3,
    customer_id: 3,
    type: "POS",
    status: "CONFIRMED",
    total_amount: 60000,
    confirmed_at: "2026-02-02T08:50:00Z",
    created_by: 6, // Staff ID
    is_deleted: false,
    created_at: "2026-02-02T08:45:00Z",
    updated_at: "2026-02-02T08:50:00Z",
  },
  {
    id: 4,
    code: "ORD004",
    franchise_id: 1,
    customer_id: 1,
    type: "ONLINE",
    status: "PREPARING",
    total_amount: 145000,
    confirmed_at: "2026-02-03T15:30:00Z",
    created_by: 5, // Staff ID
    is_deleted: false,
    created_at: "2026-02-03T15:20:00Z",
    updated_at: "2026-02-03T15:35:00Z",
  },
  {
    id: 5,
    code: "ORD005",
    franchise_id: 2,
    customer_id: 2,
    type: "POS",
    status: "DRAFT",
    total_amount: 95000,
    created_by: 5,
    is_deleted: false,
    created_at: "2026-02-04T09:00:00Z",
    updated_at: "2026-02-04T09:00:00Z",
  },
];

const mockOrderItems: OrderItem[] = [
  {
    id: 1,
    order_id: 1,
    product_franchise_id: 1,
    product_name_snapshot: "Cà phê Phin Việt Nam (Vừa)",
    price_snapshot: 45000,
    quantity: 2,
    line_total: 90000,
    is_deleted: false,
    created_at: "2026-02-01T10:30:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
  {
    id: 2,
    order_id: 1,
    product_franchise_id: 2,
    product_name_snapshot: "Bánh Croissant",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
    is_deleted: false,
    created_at: "2026-02-01T10:30:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
  {
    id: 3,
    order_id: 1,
    product_franchise_id: 3,
    product_name_snapshot: "Trà Sữa Trân Châu Đường Đen (Size L)",
    price_snapshot: 55000,
    quantity: 1,
    line_total: 55000,
    is_deleted: false,
    created_at: "2026-02-01T10:30:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
  {
    id: 4,
    order_id: 2,
    product_franchise_id: 4,
    product_name_snapshot: "Caramel Macchiato (Size L)",
    price_snapshot: 65000,
    quantity: 2,
    line_total: 130000,
    is_deleted: false,
    created_at: "2026-01-30T14:20:00Z",
    updated_at: "2026-01-30T14:20:00Z",
  },
  {
    id: 5,
    order_id: 2,
    product_franchise_id: 5,
    product_name_snapshot: "Tiramisu",
    price_snapshot: 45000,
    quantity: 2,
    line_total: 90000,
    is_deleted: false,
    created_at: "2026-01-30T14:20:00Z",
    updated_at: "2026-01-30T14:20:00Z",
  },
  {
    id: 6,
    order_id: 2,
    product_franchise_id: 6,
    product_name_snapshot: "Freeze Socola (Size L)",
    price_snapshot: 55000,
    quantity: 1,
    line_total: 55000,
    is_deleted: false,
    created_at: "2026-01-30T14:20:00Z",
    updated_at: "2026-01-30T14:20:00Z",
  },
  {
    id: 7,
    order_id: 3,
    product_franchise_id: 7,
    product_name_snapshot: "Cà phê Đen Đá (Vừa)",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
    is_deleted: false,
    created_at: "2026-02-02T08:45:00Z",
    updated_at: "2026-02-02T08:45:00Z",
  },
  {
    id: 8,
    order_id: 3,
    product_franchise_id: 8,
    product_name_snapshot: "Bánh Mì Pate",
    price_snapshot: 25000,
    quantity: 1,
    line_total: 25000,
    is_deleted: false,
    created_at: "2026-02-02T08:45:00Z",
    updated_at: "2026-02-02T08:45:00Z",
  },
  {
    id: 9,
    order_id: 4,
    product_franchise_id: 1,
    product_name_snapshot: "Latte (Size M)",
    price_snapshot: 55000,
    quantity: 2,
    line_total: 110000,
    is_deleted: false,
    created_at: "2026-02-03T15:20:00Z",
    updated_at: "2026-02-03T15:20:00Z",
  },
  {
    id: 10,
    order_id: 4,
    product_franchise_id: 2,
    product_name_snapshot: "Bánh Mousse Dâu",
    price_snapshot: 35000,
    quantity: 1,
    line_total: 35000,
    is_deleted: false,
    created_at: "2026-02-03T15:20:00Z",
    updated_at: "2026-02-03T15:20:00Z",
  },
  {
    id: 11,
    order_id: 5,
    product_franchise_id: 3,
    product_name_snapshot: "Trà Đào Cam Sả (Size M)",
    price_snapshot: 45000,
    quantity: 1,
    line_total: 45000,
    is_deleted: false,
    created_at: "2026-02-04T09:00:00Z",
    updated_at: "2026-02-04T09:00:00Z",
  },
  {
    id: 12,
    order_id: 5,
    product_franchise_id: 4,
    product_name_snapshot: "Americano (Size M)",
    price_snapshot: 50000,
    quantity: 1,
    line_total: 50000,
    is_deleted: false,
    created_at: "2026-02-04T09:00:00Z",
    updated_at: "2026-02-04T09:00:00Z",
  },
];

const mockOrderStatusLogs: OrderStatusLog[] = [
  {
    id: 1,
    order_id: 1,
    from_status: "DRAFT",
    to_status: "CONFIRMED",
    changed_by: 5,
    created_at: "2026-02-01T10:35:00Z",
    updated_at: "2026-02-01T10:35:00Z",
  },
  {
    id: 2,
    order_id: 1,
    from_status: "CONFIRMED",
    to_status: "PREPARING",
    changed_by: 5,
    created_at: "2026-02-01T10:40:00Z",
    updated_at: "2026-02-01T10:40:00Z",
  },
  {
    id: 3,
    order_id: 1,
    from_status: "PREPARING",
    to_status: "COMPLETED",
    changed_by: 5,
    created_at: "2026-02-01T11:00:00Z",
    updated_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 4,
    order_id: 2,
    from_status: "DRAFT",
    to_status: "CONFIRMED",
    changed_by: 1,
    created_at: "2026-01-30T14:25:00Z",
    updated_at: "2026-01-30T14:25:00Z",
  },
  {
    id: 5,
    order_id: 2,
    from_status: "CONFIRMED",
    to_status: "PREPARING",
    changed_by: 1,
    created_at: "2026-01-30T15:00:00Z",
    updated_at: "2026-01-30T15:00:00Z",
  },
  {
    id: 6,
    order_id: 2,
    from_status: "PREPARING",
    to_status: "COMPLETED",
    changed_by: 1,
    created_at: "2026-01-31T09:15:00Z",
    updated_at: "2026-01-31T09:15:00Z",
  },
  {
    id: 7,
    order_id: 3,
    from_status: "DRAFT",
    to_status: "CONFIRMED",
    changed_by: 6,
    created_at: "2026-02-02T08:50:00Z",
    updated_at: "2026-02-02T08:50:00Z",
  },
  {
    id: 8,
    order_id: 4,
    from_status: "DRAFT",
    to_status: "CONFIRMED",
    changed_by: 1,
    created_at: "2026-02-03T15:30:00Z",
    updated_at: "2026-02-03T15:30:00Z",
  },
  {
    id: 9,
    order_id: 4,
    from_status: "CONFIRMED",
    to_status: "PREPARING",
    changed_by: 1,
    created_at: "2026-02-03T15:35:00Z",
    updated_at: "2026-02-03T15:35:00Z",
  },
  {
    id: 10,
    order_id: 5,
    from_status: "DRAFT",
    to_status: "DRAFT",
    changed_by: 5,
    note: "Đơn hàng mới tạo",
    created_at: "2026-02-04T09:00:00Z",
    updated_at: "2026-02-04T09:00:00Z",
  },
];

export const fetchOrders = async (): Promise<OrderDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockOrders.map(order => ({
    ...order,
    items: mockOrderItems.filter(item => item.order_id === order.id && !item.is_deleted),
    status_history: mockOrderStatusLogs.filter(log => log.order_id === order.id),
    franchise: order.franchise_id === 1 
      ? { id: 1, code: "WBS-HN-01", name: "WBS Coffee Hoàn Kiếm" }
      : order.franchise_id === 2
        ? { id: 2, code: "WBS-HCM-01", name: "WBS Coffee Quận 1" }
        : { id: 3, code: "WBS-DN-01", name: "WBS Coffee Hải Châu" },
    customer: order.customer_id === 1
      ? { id: 1, name: "Nguyễn Văn An", phone: "0901234567", email: "nguyenvanan@email.com" }
      : order.customer_id === 2
        ? { id: 2, name: "Trần Thị Bình", phone: "0912345678", email: "tranthibinh@email.com" }
        : { id: 3, name: "Lê Hoàng Công", phone: "0923456789", email: "lehoangcong@email.com" },
    created_by_user: order.created_by 
      ? order.created_by === 5
        ? { id: 5, name: "Phạm Minh Đức (NV)" }
        : { id: 6, name: "Võ Thị Em (NV)" }
      : undefined,
  }));
};

// Helper function to map Order to OrderDisplay with all relations
const mapOrderToDisplay = (order: Order): OrderDisplay => {
  return {
    ...order,
    items: mockOrderItems.filter(item => item.order_id === order.id && !item.is_deleted),
    status_history: mockOrderStatusLogs.filter(log => log.order_id === order.id),
    franchise: order.franchise_id === 1 
      ? { id: 1, code: "WBS-HN-01", name: "WBS Coffee Hoàn Kiếm" }
      : order.franchise_id === 2
        ? { id: 2, code: "WBS-HCM-01", name: "WBS Coffee Quận 1" }
        : { id: 3, code: "WBS-DN-01", name: "WBS Coffee Hải Châu" },
    customer: order.customer_id === 1
      ? { id: 1, name: "Nguyễn Văn An", phone: "0901234567", email: "nguyenvanan@email.com" }
      : order.customer_id === 2
        ? { id: 2, name: "Trần Thị Bình", phone: "0912345678", email: "tranthibinh@email.com" }
        : { id: 3, name: "Lê Hoàng Công", phone: "0923456789", email: "lehoangcong@email.com" },
    created_by_user: order.created_by 
      ? order.created_by === 5
        ? { id: 5, name: "Phạm Minh Đức (NV)" }
        : { id: 6, name: "Võ Thị Em (NV)" }
      : undefined,
  };
};

export const fetchOrderById = async (id: number): Promise<OrderDisplay | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const order = mockOrders.find((o) => o.id === id);
  if (!order) return null;
  return mapOrderToDisplay(order);
};

export const createOrder = async (data: Omit<Order, "id" | "code" | "created_at" | "updated_at">): Promise<Order> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newOrder: Order = {
    ...data,
    id: mockOrders.length + 1,
    code: `ORD${String(mockOrders.length + 1).padStart(3, "0")}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockOrders.push(newOrder);
  return newOrder;
};

export const updateOrderStatus = async (
  id: number,
  status: OrderStatus,
  changedBy: number,
  note?: string
): Promise<OrderDisplay | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const order = mockOrders.find((o) => o.id === id);
  if (!order) return null;

  const oldStatus = order.status;
  order.status = status;
  order.updated_at = new Date().toISOString();

  // Update timestamp based on status
  if (status === "CONFIRMED") {
    order.confirmed_at = new Date().toISOString();
  } else if (status === "COMPLETED") {
    order.completed_at = new Date().toISOString();
  } else if (status === "CANCELLED") {
    order.cancelled_at = new Date().toISOString();
  }

  // Create status log
  const statusLog: OrderStatusLog = {
    id: mockOrderStatusLogs.length + 1,
    order_id: order.id,
    from_status: oldStatus,
    to_status: status,
    changed_by: changedBy,
    note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockOrderStatusLogs.push(statusLog);

  // Return full order display with all relations
  return mapOrderToDisplay(order);
};

export const searchOrders = async (query: string): Promise<OrderDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  const filtered = mockOrders.filter(
    (order) =>
      order.code.toLowerCase().includes(lowerQuery) ||
      order.id.toString().includes(query)
  );
  return filtered.map(order => ({
    ...order,
    items: mockOrderItems.filter(item => item.order_id === order.id && !item.is_deleted),
    status_history: mockOrderStatusLogs.filter(log => log.order_id === order.id),
  }));
};

export const filterOrders = async (
  status?: OrderStatus,
  type?: OrderType,
  franchiseId?: number,
  startDate?: string,
  endDate?: string
): Promise<OrderDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const filtered = mockOrders.filter((order) => {
    if (status && order.status !== status) return false;
    if (type && order.type !== type) return false;
    if (franchiseId && order.franchise_id !== franchiseId) return false;
    if (startDate && new Date(order.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(order.created_at) > new Date(endDate)) return false;
    return true;
  });
  return filtered.map(order => ({
    ...order,
    items: mockOrderItems.filter(item => item.order_id === order.id && !item.is_deleted),
    status_history: mockOrderStatusLogs.filter(log => log.order_id === order.id),
  }));
};
