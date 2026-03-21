/**
 * Payment API client — real API.
 * GET payment by OrderId, CustomerId, Code, Id.
 * PUT confirm, PUT refund.
 */
import apiClient from "./api.client";

type ApiResponse<T> = { success: boolean; data: T };

export interface PaymentData {
  _id?: string;
  id?: string;
  order_id?: string;
  method?: string;
  status?: string;
  amount?: number;
  provider_txn_id?: string;
  refund_reason?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export const paymentClient = {
  getPaymentByOrderId: async (orderId: string): Promise<PaymentData | null> => {
    const response = await apiClient.get<ApiResponse<PaymentData | null>>(
      `/payments/order/${orderId}`
    );
    return response.data.data ?? null;
  },

  getPaymentsByCustomerId: async (customerId: string): Promise<PaymentData[]> => {
    const response = await apiClient.get<ApiResponse<PaymentData[]>>(
      `/payments/customer/${customerId}`
    );
    return response.data.data ?? [];
  },

  getPaymentByCode: async (code: string): Promise<PaymentData | null> => {
    const response = await apiClient.get<ApiResponse<PaymentData | null>>(
      "/payments/code",
      { params: { code } }
    );
    return response.data.data ?? null;
  },

  getPaymentById: async (id: string): Promise<PaymentData | null> => {
    const response = await apiClient.get<ApiResponse<PaymentData | null>>(
      `/payments/${id}`
    );
    return response.data.data ?? null;
  },

  confirmPayment: async (
    paymentId: string,
    body: { method: string; providerTxnId?: string }
  ): Promise<PaymentData | null> => {
    const response = await apiClient.put<ApiResponse<PaymentData | null>>(
      `/payments/${paymentId}/confirm`,
      { method: body.method, providerTxnId: body.providerTxnId ?? "" }
    );
    return response.data.data ?? null;
  },

  refundPayment: async (
    paymentId: string,
    body: { refund_reason: string }
  ): Promise<PaymentData | null> => {
    const response = await apiClient.put<ApiResponse<PaymentData | null>>(
      `/payments/${paymentId}/refund`,
      body
    );
    return response.data.data ?? null;
  },
};
