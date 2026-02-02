export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export type PaymentMethodType = "COD" | "ONLINE";

export interface Payment {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  customerId: string;
  customerName: string;
  method: PaymentMethodType;
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  createDate: string;
  updateDate: string;
  logs: PaymentLog[];
}

export interface PaymentLog {
  id: string;
  status: PaymentStatus;
  message: string;
  timestamp: string;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Đang chờ",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  SUCCESS: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-blue-50 text-blue-700 border-blue-200",
};

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  COD: "COD",
  ONLINE: "Online",
};
