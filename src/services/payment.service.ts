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
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";

export const fetchPayments = async (): Promise<AdminPayment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const orders = await fetchOrders();

  const payments: AdminPayment[] = orders
    .filter((order) => order.id !== undefined && order.customer_id !== undefined)
    .map((order) => ({
      id: Number(order.id),
      order_id: Number(order.id),
      order_code: order.code,
      franchise_id: Number(order.franchise_id ?? 0),
      franchise_name: order.franchise?.name,
      franchise_code: order.franchise?.code,
      customer_id: Number(order.customer_id),
      customer_name: order.customer?.name,
      customer_phone: order.customer?.phone,
      method: order.type,
      status: order.status as AdminPaymentStatus,
      amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at ?? order.created_at,
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
  bankName?: string;
}

export interface CreatePaymentResult {
  transactionId: string;
  status: PaymentStatus;
  bankName?: string;
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
    const bankLabel = payload.bankName ?? "Ngân hàng đã chọn";

    return {
      transactionId,
      status: "PENDING",
      bankName: bankLabel,
      qrCodeUrl: buildStaticPaymentQr({
        provider: payload.method,
        amount: payload.amount,
        orderRef: payload.orderId,
        bankName: bankLabel,
      }),
      note: `Quét QR tĩnh hoặc chuyển khoản thủ công qua ${bankLabel}`,
    };
  }

  if (payload.method === "MOMO") {
    return {
      transactionId,
      status: "PENDING",
      deeplink: `momo://payment/${transactionId}`,
      paymentUrl: `/payment/process/${payload.orderId}`,
      qrCodeUrl: buildStaticPaymentQr({
        provider: payload.method,
        amount: payload.amount,
        orderRef: payload.orderId,
      }),
      note: "Quét QR MoMo tĩnh hoặc mở ứng dụng để hoàn tất giao dịch",
    };
  }

  if (payload.method === "ZALOPAY") {
    return {
      transactionId,
      status: "PENDING",
      paymentUrl: `/payment/process/${payload.orderId}`,
      qrCodeUrl: buildStaticPaymentQr({
        provider: payload.method,
        amount: payload.amount,
        orderRef: payload.orderId,
      }),
      note: "Quét QR ZaloPay tĩnh để tiếp tục thanh toán",
    };
  }

  if (payload.method === "SHOPEEPAY") {
    return {
      transactionId,
      status: "PENDING",
      paymentUrl: `/payment/process/${payload.orderId}`,
      qrCodeUrl: buildStaticPaymentQr({
        provider: payload.method,
        amount: payload.amount,
        orderRef: payload.orderId,
      }),
      note: "Quét QR ShopeePay tĩnh để tiếp tục thanh toán",
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
    bankName: order.bankName,
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
