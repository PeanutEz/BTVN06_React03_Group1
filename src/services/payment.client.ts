/**
 * Payment API client — real API.
 * GET payment by OrderId, CustomerId, Code, Id.
 * PUT confirm, PUT refund.
 */
import apiClient from "@/services/api.client";

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface PaymentData {
  _id?: string;
  id?: string;
  order_id?: string;
  method?: string;
  status?: string;
  amount?: number;
  provider_txn_id?: string;
  providerTxnId?: string;
  refund_reason?: string;
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
    const response = await apiClient.get(`/payments/order/${orderId}`);
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },

  getPaymentsByCustomerId: async (customerId: string): Promise<PaymentData[]> => {
    const response = await apiClient.get(`/payments/customer/${customerId}`);
    return unwrapList<PaymentData>(response.data).map((item) => normalizePayment(item)).filter(Boolean) as PaymentData[];
  },

  getPaymentByCode: async (code: string): Promise<PaymentData | null> => {
    const response = await apiClient.get("/payments/code", { params: { code } });
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },

  getPaymentById: async (id: string): Promise<PaymentData | null> => {
    const response = await apiClient.get(`/payments/${id}`);
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },

  confirmPayment: async (
    paymentId: string,
    body: { method: string; providerTxnId?: string }
  ): Promise<PaymentData | null> => {
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
    const response = await apiClient.put(`/payments/${paymentId}/refund`, body);
    return normalizePayment(unwrapSingle<PaymentData>(response.data));
  },
};
