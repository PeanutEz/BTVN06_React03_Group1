/**
 * Order API client — real API trên trang (customer + staff).
 * Get Order by CartId, by CustomerId, by Code, by Id;
 * Get Orders for Staff by FranchiseID; Change status Preparing / Ready-for-pickup / Delivering / Complete / Cancel.
 */
import apiClient from "@/services/api.client";
import type { OrderDisplay, OrderStatus } from "@/models/order.model";

type ApiResponse<T> = { success: boolean; data: T };

export const orderClient = {
  getOrderByCartId: async (cartId: string): Promise<OrderDisplay | null> => {
    const response = await apiClient.get<ApiResponse<OrderDisplay | null>>(
      `/orders/cart/${cartId}`
    );
    return response.data.data ?? null;
  },

  getOrdersByCustomerId: async (
    customerId: string,
    params?: { status?: OrderStatus }
  ): Promise<OrderDisplay[]> => {
    const response = await apiClient.get<ApiResponse<OrderDisplay[]>>(
      `/orders/customer/${customerId}`,
      { params: params?.status ? { status: params.status } : {} }
    );
    const raw = response.data;
    // API might return { success, data: [...] } or directly [...]
    const result = (raw as any)?.data ?? raw;
    return Array.isArray(result) ? result : [];
  },

  getOrderByCode: async (orderCode: string): Promise<OrderDisplay | null> => {
    const response = await apiClient.get<ApiResponse<OrderDisplay | null>>(
      "/orders/code",
      { params: { code: orderCode } }
    );
    return response.data.data ?? null;
  },

  getOrderById: async (orderId: number | string): Promise<OrderDisplay | null> => {
    const response = await apiClient.get<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}`
    );

    // Some backend implementations return `data` as an array (e.g. when using /orders/:id).
    // Normalize so UI always receives a single matching order.
    const raw = (response.data as any)?.data ?? null;
    if (Array.isArray(raw)) {
      const target = String(orderId);
      const matched =
        raw.find((o: any) => String(o?._id ?? o?.id) === target) ?? raw[0];
      return matched ?? null;
    }

    return raw ?? null;
  },

  getOrdersByFranchiseId: async (franchiseId: string): Promise<OrderDisplay[]> => {
    const response = await apiClient.get<ApiResponse<OrderDisplay[]>>(
      `/orders/franchise/${franchiseId}`
    );
    return response.data.data ?? [];
  },

  setPreparing: async (orderId: number | string): Promise<OrderDisplay | null> => {
    const response = await apiClient.put<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}/preparing`
    );
    return response.data.data ?? null;
  },

  setReadyForPickup: async (
    orderId: number | string,
    body?: { staff_id?: string }
  ): Promise<OrderDisplay | null> => {
    const response = await apiClient.put<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}/ready-for-pickup`,
      body ?? {}
    );
    return response.data.data ?? null;
  },

  // ==================== Order Transition Endpoints ====================

  setDelivering: async (
    orderId: number | string,
    body?: { shipper_id?: string; estimated_delivery_time?: string }
  ): Promise<OrderDisplay | null> => {
    const response = await apiClient.put<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}/delivering`,
      body ?? {}
    );
    return response.data.data ?? null;
  },

  setCompleted: async (
    orderId: number | string,
    body?: { completed_note?: string }
  ): Promise<OrderDisplay | null> => {
    const response = await apiClient.put<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}/complete`,
      body ?? {}
    );
    return response.data.data ?? null;
  },

  setCancelled: async (
    orderId: number | string,
    body?: { cancel_reason?: string; cancelled_by?: string }
  ): Promise<OrderDisplay | null> => {
    const response = await apiClient.put<ApiResponse<OrderDisplay | null>>(
      `/orders/${orderId}/cancel`,
      body ?? {}
    );
    return response.data.data ?? null;
  },
};
