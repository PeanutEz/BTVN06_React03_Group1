/**
 * Payment API client — real API.
 * GET payment by OrderId, CustomerId, Code, Id.
 * PUT confirm, PUT refund.
 */
import apiClient from "@/services/api.client";
import {
  getMockPaymentById,
  getMockPaymentByOrderId,
  shouldUseMockPaymentId,
} from "@/services/checkout-fallback.mock";

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface PaymentData {
  _id?: string;
  id?: string;

  code?: string;

  order_id?: string;
  franchise_id?: string;
  customer_id?: string;

  method?: string;
  status?: string;

  amount?: number;

  provider_txn_id?: string;
  providerTxnId?: string;

  paid_at?: string;

  refund_reason?: string;

  is_active?: boolean;
  is_deleted?: boolean;

  created_at?: string;
  updated_at?: string;

  [key: string]: unknown;
}

function normalizePayment(raw: unknown): PaymentData | null {
  if (!raw || typeof raw !== "object") return null;
  const payment = raw as PaymentData;
  return {
    ...payment,
    provider_txn_id:
      typeof payment.provider_txn_id === "string"
        ? payment.provider_txn_id
        : typeof payment.providerTxnId === "string"
          ? payment.providerTxnId
          : undefined,
  };
}

function flattenPaymentRelations(payment: PaymentData): PaymentData {
  return {
    ...payment,

    // convert object → string id
    franchise_id:
      typeof payment.franchise_id === "object"
        ? (payment.franchise_id as any)?._id
        : payment.franchise_id,

    customer_id:
      typeof payment.customer_id === "object"
        ? (payment.customer_id as any)?._id
        : payment.customer_id,

    order_id:
      typeof payment.order_id === "object"
        ? (payment.order_id as any)?._id
        : payment.order_id,

    // thêm field tiện dùng
    franchise_name:
      typeof payment.franchise_id === "object"
        ? (payment.franchise_id as any)?.name
        : undefined,

    customer_name:
      typeof payment.customer_id === "object"
        ? (payment.customer_id as any)?.name
        : undefined,

    order_code:
      typeof payment.order_id === "object"
        ? (payment.order_id as any)?.code
        : undefined,
  };
}

function unwrapSingle<T>(payload: unknown): T | null {
  if (Array.isArray(payload)) {
    return (payload[0] as T) ?? null;
  }
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiResponse<T> & Record<string, unknown>;
    if ("data" in wrapped) {
      return unwrapSingle<T>(wrapped.data ?? null);
    }
  }
  return (payload as T) ?? null;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiResponse<T[]> & Record<string, unknown>;
    if ("data" in wrapped) {
      return unwrapList<T>(wrapped.data ?? []);
    }
  }
  return [];
}

export const paymentClient = {
  getPaymentByOrderId: async (orderId: string): Promise<PaymentData | null> => {
    try {
      const response = await apiClient.get(`/payments/order/${orderId}`);
      const payment = normalizePayment(unwrapSingle<PaymentData>(response.data));
      return payment ? flattenPaymentRelations(payment) : null;
    } catch {
      const payment = normalizePayment(getMockPaymentByOrderId(orderId));
      return payment ? flattenPaymentRelations(payment) : null;
    }
  },

  getPaymentsByCustomerId: async (customerId: string): Promise<PaymentData[]> => {
    const response = await apiClient.get(`/payments/customer/${customerId}`);
    return unwrapList<PaymentData>(response.data)
      .map((item) => normalizePayment(item))
      .filter(Boolean)
      .map((item) => flattenPaymentRelations(item as PaymentData));
  },

  getPaymentByCode: async (code: string): Promise<PaymentData | null> => {
    const response = await apiClient.get("/payments/code", { params: { code } });
    const payment = normalizePayment(unwrapSingle<PaymentData>(response.data));
    return payment ? flattenPaymentRelations(payment) : null;
  },

  getPaymentById: async (id: string): Promise<PaymentData | null> => {
    if (shouldUseMockPaymentId(id)) {
      const payment = normalizePayment(getMockPaymentById(id));
      return payment ? flattenPaymentRelations(payment) : null;
    }

    try {
      const response = await apiClient.get(`/payments/${id}`);
      const payment = normalizePayment(unwrapSingle<PaymentData>(response.data));
      return payment ? flattenPaymentRelations(payment) : null;
    } catch {
      const payment = normalizePayment(getMockPaymentById(id));
      return payment ? flattenPaymentRelations(payment) : null;
    }
  },

  getPaymentsByFranchiseId: async (
    franchiseId: string
  ): Promise<PaymentData[]> => {
    const response = await apiClient.get(
      `/payments/franchise/${franchiseId}`
    );

    return unwrapList<PaymentData>(response.data)
      .map((item) => normalizePayment(item))
      .filter(Boolean)
      .map((item) => flattenPaymentRelations(item as PaymentData));
  },

  confirmPayment: async (
    paymentId: string,
    body: { method: string; providerTxnId?: string }
  ): Promise<PaymentData | null> => {
    if (shouldUseMockPaymentId(paymentId)) return null;

    const payload: Record<string, unknown> = { method: body.method };
    if (body.providerTxnId) {
      payload.providerTxnId = body.providerTxnId;
    }
    const response = await apiClient.put(`/payments/${paymentId}/confirm`, payload);
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },

  refundPayment: async (
    paymentId: string,
    body: { refund_reason: string }
  ): Promise<PaymentData | null> => {
    if (shouldUseMockPaymentId(paymentId)) return null;

    const response = await apiClient.put(`/payments/${paymentId}/refund`, body);
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },
};
