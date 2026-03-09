import type {
  Payment as AdminPayment,
  PaymentStatus as AdminPaymentStatus,
  PaymentMethodType,
} from "../models/payment.model";
import { fetchOrders } from "./order.service";

import type {
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/types/delivery.types";

export const fetchPayments = async (): Promise<AdminPayment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const orders = await fetchOrders();

  const payments = orders.map((order) => ({
    id: order.id,
    order_id: order.id,
    order_code: order.code,
    franchise_id: order.franchise_id,
    franchise_name: order.franchise?.name,
    franchise_code: order.franchise?.code,
    customer_id: order.customer_id,
    customer_name: order.customer?.name,
    customer_phone: order.customer?.phone,
    method: order.type,
    status: order.status as AdminPaymentStatus,
    amount: order.total_amount,
    created_at: order.created_at,
    updated_at: order.updated_at,
    confirmed_at: order.confirmed_at,
    completed_at: order.completed_at,
    cancelled_at: order.cancelled_at,
  }));

  return payments;
};

export const fetchPaymentById = async (id: number): Promise<AdminPayment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();
  return payments.find((payment) => payment.id === id) || null;
};

export const fetchPaymentByOrderId = async (orderId: number): Promise<AdminPayment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();
  return payments.find((payment) => payment.order_id === orderId) || null;
};

export const filterPayments = async (
  method?: PaymentMethodType,
  status?: AdminPaymentStatus,
  franchiseId?: number,
  startDate?: string,
  endDate?: string,
): Promise<AdminPayment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();

  return payments.filter((payment) => {
    if (method && payment.method !== method) return false;
    if (status && payment.status !== status) return false;
    if (franchiseId && payment.franchise_id !== franchiseId) return false;
    if (startDate && new Date(payment.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(payment.created_at) > new Date(endDate)) return false;
    return true;
  });
};

export const updatePaymentStatus = async (
  id: number,
  status: AdminPaymentStatus,
): Promise<AdminPayment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const payments = await fetchPayments();
  const payment = payments.find((p) => p.id === id);
  if (!payment) return null;

  return {
    ...payment,
    status,
    updated_at: new Date().toISOString(),
  };
};

export interface CreatePaymentPayload {
  orderId: string;
  method: PaymentMethod;
  amount: number;
}

export interface CreatePaymentResult {
  transactionId: string;
  status: PaymentStatus;
  qrCodeUrl?: string;
  deeplink?: string;
  paymentUrl?: string;
  note?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<CreatePaymentResult> {
  await sleep(700);

  const transactionId = `TXN-${Date.now()}`;

  if (payload.method === "BANK") {
    return {
      transactionId,
      status: "PENDING",
      qrCodeUrl: `https://dummyimage.com/320x320/f3f4f6/111827&text=QR+${payload.orderId}`,
      note: "Quét QR để thanh toán đơn hàng",
    };
  }

  if (payload.method === "MOMO") {
    return {
      transactionId,
      status: "PENDING",
      deeplink: `momo://payment/${transactionId}`,
      paymentUrl: `/payment/process/${payload.orderId}`,
      note: "Mở MoMo để hoàn tất giao dịch",
    };
  }

  if (payload.method === "ZALOPAY") {
    return {
      transactionId,
      status: "PENDING",
      paymentUrl: `/payment/process/${payload.orderId}`,
      note: "Tiếp tục qua ZaloPay",
    };
  }

  if (payload.method === "SHOPEEPAY") {
    return {
      transactionId,
      status: "PENDING",
      paymentUrl: `/payment/process/${payload.orderId}`,
      note: "Tiếp tục qua ShopeePay",
    };
  }

  return {
    transactionId,
    status: "UNPAID",
    note: "Đơn COD chưa thanh toán",
  };
}

export async function verifyPayment(order: PlacedOrder): Promise<PaymentStatus> {
  await sleep(1200);

  if (order.paymentMethod === "CASH") return "UNPAID";
  if (order.paymentStatus === "CANCELLED") return "CANCELLED";

  return "PAID";
}

export async function retryPayment(order: PlacedOrder): Promise<CreatePaymentResult> {
  return createPayment({
    orderId: order.id,
    method: order.paymentMethod,
    amount: order.total,
  });
}

export async function cancelPayment(): Promise<PaymentStatus> {
  await sleep(400);
  return "CANCELLED";
}

export async function getPaymentStatus(order: PlacedOrder): Promise<PaymentStatus> {
  await sleep(300);
  return order.paymentStatus;
}
