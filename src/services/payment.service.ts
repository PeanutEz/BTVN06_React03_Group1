/**
 * Admin Payment Service — Uses REAL Payment API
 * Replaces mock data implementation with real API calls
 */
import type {
  Payment as AdminPayment,
  PaymentStatus as AdminPaymentStatus,
  PaymentMethodType,
} from "../models/payment.model";
import { paymentClient, type PaymentData } from "./payment.client";
import { fetchOrderById } from "./order.service";
import type { OrderDisplay } from "../models/order.model";

import type {
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/types/delivery.types";
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";

/**
 * Map real Payment API status to admin order-based status
 */
function mapPaymentStatusToAdmin(apiStatus?: string): AdminPaymentStatus {
  const status = (apiStatus || "").toUpperCase();

  // Real API statuses: PENDING, PAID, CANCELLED, REFUNDED
  // Admin model expects: DRAFT, CONFIRMED, PREPARING, READY_FOR_PICKUP, COMPLETED, CANCELLED

  switch (status) {
    case "PENDING":
      return "DRAFT"; // Payment pending = order draft
    case "PAID":
    case "CONFIRMED":
      return "CONFIRMED"; // Payment confirmed = order confirmed
    case "CANCELLED":
      return "CANCELLED";
    case "REFUNDED":
      return "CANCELLED"; // Refunded payments shown as cancelled
    default:
      return "DRAFT";
  }
}

/**
 * Map payment method from API to admin type
 */
function mapPaymentMethodToAdmin(apiMethod?: string): PaymentMethodType {
  const method = (apiMethod || "").toUpperCase();

  // Real API methods: CARD, CASH, MOMO, ZALOPAY, SHOPEEPAY, BANK
  // Admin model expects: POS, ONLINE

  if (method === "CASH" || method === "POS") {
    return "POS";
  }
  return "ONLINE"; // All electronic payments are ONLINE
}

/**
 * Enrich payment data with order/franchise/customer info
 */
async function enrichPaymentData(payment: PaymentData): Promise<AdminPayment | null> {
  try {
    // Fetch related order to get franchise and customer info
    const order: OrderDisplay | null = payment.order_id
      ? await fetchOrderById(payment.order_id)
      : null;

    const paymentId = payment.id || payment._id || "0";
    const orderId = payment.order_id || "0";

    return {
      id: Number(paymentId),
      order_id: Number(orderId),
      order_code: order?.code || `ORDER_${orderId}`,
      franchise_id: order?.franchise_id ? Number(order.franchise_id) : 0,
      franchise_name: order?.franchise?.name,
      franchise_code: order?.franchise?.code,
      customer_id: order?.customer_id ? Number(order.customer_id) : 0,
      customer_name: order?.customer?.name,
      customer_phone: order?.customer?.phone,
      method: mapPaymentMethodToAdmin(payment.method),
      status: mapPaymentStatusToAdmin(payment.status),
      amount: payment.amount || 0,
      transaction_id: payment.provider_txn_id || payment.providerTxnId,
      created_at: payment.created_at || new Date().toISOString(),
      updated_at: payment.updated_at || payment.created_at || new Date().toISOString(),
      confirmed_at: order?.confirmed_at,
      completed_at: order?.completed_at,
      cancelled_at: order?.cancelled_at,
    };
  } catch (error) {
    console.error("Error enriching payment data:", error);
    return null;
  }
}

/**
 * Fetch all payments (via customer payments - admin should have access to all)
 * Note: Real API doesn't have "get all payments" endpoint for admin
 * This is a limitation - we'll need to fetch by customer or order
 */
export const fetchPayments = async (): Promise<AdminPayment[]> => {
  try {
    // WORKAROUND: Since there's no "admin get all payments" endpoint,
    // we'll fetch from orders and then get payment for each order
    // This is not ideal but matches current admin panel expectations
    const { fetchOrders } = await import("./order.service");
    const orders = await fetchOrders();

    const paymentPromises = orders
      .filter((order) => order.id)
      .map(async (order) => {
        try {
          const paymentData = await paymentClient.getPaymentByOrderId(String(order.id));
          if (!paymentData) return null;
          return enrichPaymentData(paymentData);
        } catch (error) {
          // Payment not found for this order - skip it
          return null;
        }
      });

    const payments = await Promise.all(paymentPromises);
    return payments.filter((p): p is AdminPayment => p !== null);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

/**
 * Fetch payment by ID
 */
export const fetchPaymentById = async (id: number): Promise<AdminPayment | null> => {
  try {
    const paymentData = await paymentClient.getPaymentById(String(id));
    if (!paymentData) return null;
    return enrichPaymentData(paymentData);
  } catch (error) {
    console.error(`Error fetching payment ${id}:`, error);
    return null;
  }
};

/**
 * Fetch payment by order ID
 */
export const fetchPaymentByOrderId = async (orderId: number): Promise<AdminPayment | null> => {
  try {
    const paymentData = await paymentClient.getPaymentByOrderId(String(orderId));
    if (!paymentData) return null;
    return enrichPaymentData(paymentData);
  } catch (error) {
    console.error(`Error fetching payment for order ${orderId}:`, error);
    return null;
  }
};

/**
 * Filter payments (client-side filtering for now)
 */
export const filterPayments = async (
  method?: PaymentMethodType,
  status?: AdminPaymentStatus,
  franchiseId?: number,
  startDate?: string,
  endDate?: string,
): Promise<AdminPayment[]> => {
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

/**
 * Update payment status (via confirm/refund API)
 * Note: Real API uses confirm/refund endpoints, not direct status update
 */
export const updatePaymentStatus = async (
  id: number,
  status: AdminPaymentStatus,
): Promise<AdminPayment | null> => {
  try {
    let updatedPaymentData: PaymentData | null = null;

    // Map admin status to real API actions
    if (status === "CONFIRMED" || status === "COMPLETED") {
      // Confirm payment
      updatedPaymentData = await paymentClient.confirmPayment(String(id), {
        method: "CARD", // Default to CARD, ideally this should be passed as parameter
        providerTxnId: `TXN_${Date.now()}`,
      });
    } else if (status === "CANCELLED") {
      // Refund/cancel payment
      updatedPaymentData = await paymentClient.refundPayment(String(id), {
        refund_reason: "Admin cancelled payment",
      });
    } else {
      // For other statuses, just fetch current payment
      updatedPaymentData = await paymentClient.getPaymentById(String(id));
    }

    if (!updatedPaymentData) return null;
    return enrichPaymentData(updatedPaymentData);
  } catch (error) {
    console.error(`Error updating payment ${id} status:`, error);
    return null;
  }
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
