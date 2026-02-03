import type { Payment, PaymentStatus, PaymentMethodType } from "../models/payment.model";

// Mock data
const mockPayments: Payment[] = [
  {
    id: "PAY001",
    orderId: "ORD001",
    storeId: "STORE001",
    storeName: "WBS Coffee Nguyễn Huệ",
    storeCode: "WBS-NH",
    customerId: "CUST001",
    customerName: "Nguyễn Văn A",
    method: "ONLINE",
    status: "SUCCESS",
    amount: 180000,
    transactionId: "TXN2026020111001234",
    createDate: "2026-02-01T10:30:00Z",
    updateDate: "2026-02-01T11:00:00Z",
    logs: [
      {
        id: "LOG001",
        status: "PENDING",
        message: "Đang chờ xử lý thanh toán",
        timestamp: "2026-02-01T10:30:00Z",
      },
      {
        id: "LOG002",
        status: "SUCCESS",
        message: "Thanh toán thành công qua thẻ",
        timestamp: "2026-02-01T11:00:00Z",
      },
    ],
  },
  {
    id: "PAY002",
    orderId: "ORD002",
    storeId: "STORE002",
    storeName: "WBS Coffee Lê Lợi",
    storeCode: "WBS-LL",
    customerId: "CUST002",
    customerName: "Trần Thị B",
    method: "ONLINE",
    status: "SUCCESS",
    amount: 275000,
    transactionId: "TXN2026013015005678",
    createDate: "2026-01-30T14:20:00Z",
    updateDate: "2026-01-30T15:00:00Z",
    logs: [
      {
        id: "LOG003",
        status: "PENDING",
        message: "Đang chờ xử lý thanh toán",
        timestamp: "2026-01-30T14:20:00Z",
      },
      {
        id: "LOG004",
        status: "SUCCESS",
        message: "Thanh toán qua chuyển khoản ngân hàng thành công",
        timestamp: "2026-01-30T15:00:00Z",
      },
    ],
  },
  {
    id: "PAY003",
    orderId: "ORD003",
    storeId: "STORE003",
    storeName: "WBS Coffee Thảo Điền",
    storeCode: "WBS-TD",
    customerId: "CUST003",
    customerName: "Lê Văn C",
    method: "COD",
    status: "PENDING",
    amount: 60000,
    createDate: "2026-02-02T08:45:00Z",
    updateDate: "2026-02-02T08:45:00Z",
    logs: [
      {
        id: "LOG005",
        status: "PENDING",
        message: "Đang chờ giao hàng và thu tiền",
        timestamp: "2026-02-02T08:45:00Z",
      },
    ],
  },
];

export const fetchPayments = async (): Promise<Payment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockPayments;
};

export const fetchPaymentById = async (id: string): Promise<Payment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockPayments.find((payment) => payment.id === id) || null;
};

export const fetchPaymentByOrderId = async (orderId: string): Promise<Payment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockPayments.find((payment) => payment.orderId === orderId) || null;
};

export const updatePaymentStatus = async (
  id: string,
  status: PaymentStatus
): Promise<Payment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const payment = mockPayments.find((p) => p.id === id);
  if (payment) {
    payment.status = status;
    payment.updateDate = new Date().toISOString();
    payment.logs.push({
      id: `LOG${Date.now()}`,
      status,
      message: `Cập nhật trạng thái: ${status}`,
      timestamp: new Date().toISOString(),
    });
  }
  return payment || null;
};

export const filterPayments = async (
  method?: PaymentMethodType,
  status?: PaymentStatus
): Promise<Payment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockPayments.filter((payment) => {
    if (method && payment.method !== method) return false;
    if (status && payment.status !== status) return false;
    return true;
  });
};
