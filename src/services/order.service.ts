import type { Order, OrderStatus } from "../models/order.model";

// Mock data
const mockOrders: Order[] = [
  {
    id: "ORD001",
    storeId: "STORE001",
    storeName: "WBS Coffee Nguyễn Huệ",
    storeCode: "WBS-NH",
    customerId: "CUST001",
    customerName: "Nguyễn Văn A",
    customerEmail: "nguyenvana@example.com",
    customerPhone: "0912345678",
    items: [
      {
        id: "1",
        productId: "P001",
        productName: "Cà phê Phin Việt Nam (Vừa)",
        productImage: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop",
        price: 45000,
        quantity: 2,
        subtotal: 90000,
      },
      {
        id: "2",
        productId: "P002",
        productName: "Bánh Croissant",
        productImage: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop",
        price: 35000,
        quantity: 1,
        subtotal: 35000,
      },
      {
        id: "3",
        productId: "P003",
        productName: "Trà Sữa Trân Châu Đường Đen (Size L)",
        productImage: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=100&h=100&fit=crop",
        price: 55000,
        quantity: 1,
        subtotal: 55000,
      },
    ],
    subtotal: 180000,
    total: 180000,
    paymentMethod: "CREDIT_CARD",
    status: "PAID",
    createDate: "2026-02-01T10:30:00Z",
    updateDate: "2026-02-01T11:00:00Z",
    statusHistory: [
      { status: "CREATED", date: "2026-02-01T10:30:00Z" },
      { status: "PAID", date: "2026-02-01T11:00:00Z" },
    ],
  },
  {
    id: "ORD002",
    storeId: "STORE002",
    storeName: "WBS Coffee Lê Lợi",
    storeCode: "WBS-LL",
    customerId: "CUST002",
    customerName: "Trần Thị B",
    customerEmail: "tranthib@example.com",
    customerPhone: "0987654321",
    items: [
      {
        id: "4",
        productId: "P004",
        productName: "Caramel Macchiato (Size L)",
        productImage: "https://images.unsplash.com/photo-1578374173703-f0efc0c2b5e6?w=100&h=100&fit=crop",
        price: 65000,
        quantity: 2,
        subtotal: 130000,
      },
      {
        id: "5",
        productId: "P005",
        productName: "Tiramisu",
        productImage: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=100&h=100&fit=crop",
        price: 45000,
        quantity: 2,
        subtotal: 90000,
      },
      {
        id: "6",
        productId: "P006",
        productName: "Freeze Socola (Size L)",
        productImage: "https://images.unsplash.com/photo-1542990253-a781e04c0082?w=100&h=100&fit=crop",
        price: 55000,
        quantity: 1,
        subtotal: 55000,
      },
    ],
    subtotal: 275000,
    total: 275000,
    paymentMethod: "BANK_TRANSFER",
    status: "COMPLETED",
    createDate: "2026-01-30T14:20:00Z",
    updateDate: "2026-01-31T09:15:00Z",
    statusHistory: [
      { status: "CREATED", date: "2026-01-30T14:20:00Z" },
      { status: "PAID", date: "2026-01-30T15:00:00Z" },
      { status: "COMPLETED", date: "2026-01-31T09:15:00Z" },
    ],
  },
  {
    id: "ORD003",
    storeId: "STORE003",
    storeName: "WBS Coffee Thảo Điền",
    storeCode: "WBS-TD",
    customerId: "CUST003",
    customerName: "Lê Văn C",
    customerEmail: "levanc@example.com",
    customerPhone: "0901234567",
    items: [
      {
        id: "7",
        productId: "P007",
        productName: "Cà phê Đen Đá (Vừa)",
        productImage: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&h=100&fit=crop",
        price: 35000,
        quantity: 1,
        subtotal: 35000,
      },
      {
        id: "8",
        productId: "P008",
        productName: "Bánh Mì Pate",
        productImage: "https://images.unsplash.com/photo-1605813868151-96e9e5c3edc0?w=100&h=100&fit=crop",
        price: 25000,
        quantity: 1,
        subtotal: 25000,
      },
    ],
    subtotal: 60000,
    total: 60000,
    paymentMethod: "COD",
    status: "CREATED",
    createDate: "2026-02-02T08:45:00Z",
    updateDate: "2026-02-02T08:45:00Z",
    statusHistory: [
      { status: "CREATED", date: "2026-02-02T08:45:00Z" },
    ],
  },
];

export const fetchOrders = async (): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockOrders;
};

export const fetchOrderById = async (id: string): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockOrders.find((order) => order.id === id) || null;
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus
): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const order = mockOrders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    order.updateDate = new Date().toISOString();
    order.statusHistory.push({
      status,
      date: new Date().toISOString(),
    });
  }
  return order || null;
};

export const searchOrders = async (query: string): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  return mockOrders.filter(
    (order) =>
      order.id.toLowerCase().includes(lowerQuery) ||
      order.customerName.toLowerCase().includes(lowerQuery) ||
      order.customerEmail.toLowerCase().includes(lowerQuery)
  );
};

export const filterOrders = async (
  status?: OrderStatus,
  startDate?: string,
  endDate?: string
): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockOrders.filter((order) => {
    if (status && order.status !== status) return false;
    if (startDate && new Date(order.createDate) < new Date(startDate)) return false;
    if (endDate && new Date(order.createDate) > new Date(endDate)) return false;
    return true;
  });
};
