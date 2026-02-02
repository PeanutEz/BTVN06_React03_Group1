export type OrderStatus = "CREATED" | "PAID" | "COMPLETED" | "CANCELLED";

export type PaymentMethod = "COD" | "ONLINE" | "CREDIT_CARD" | "BANK_TRANSFER";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createDate: string;
  updateDate: string;
  statusHistory: {
    status: OrderStatus;
    date: string;
    note?: string;
  }[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Đã tạo",
  PAID: "Đã thanh toán",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: "bg-blue-50 text-blue-700 border-blue-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-purple-50 text-purple-700 border-purple-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng",
  ONLINE: "Thanh toán online",
  CREDIT_CARD: "Thẻ tín dụng",
  BANK_TRANSFER: "Chuyển khoản",
};
