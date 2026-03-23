
export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "REFUNDED"

export type PaymentMethodType =
  | "CASH"
  | "CARD"
  | "MOMO"
  | "VNPAY";

export interface Payment {
  id: string;
  code: string;

  order_id: string;
  franchise_id: string;
  customer_id: string;

  method: PaymentMethodType;
  status: PaymentStatus;

  amount: number;

  paid_at?: string;

  is_active: boolean;
  is_deleted: boolean;

  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  id: string;
  order_id: string;
  from_status: PaymentStatus;
  to_status: PaymentStatus;
  changed_by: string;
  note?: string;
  created_at: string;
}

export const mapPayment = (data: any): Payment => ({
  id: data._id,
  code: data.code,

  order_id: data.order_id,
  franchise_id: data.franchise_id,
  customer_id: data.customer_id,

  method: data.method,
  status: data.status,

  amount: data.amount,
  paid_at: data.paid_at,

  is_active: data.is_active,
  is_deleted: data.is_deleted,

  created_at: data.created_at,
  updated_at: data.updated_at,
});

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
  REFUNDED: "bg-gray-50 text-gray-700 border-gray-200",
};

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  MOMO: "MoMo",
  VNPAY: "VNPay",
};