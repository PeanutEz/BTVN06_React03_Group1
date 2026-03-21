/**
 * Order API client — real API trên trang (customer + staff).
 * Get Order by CartId, by CustomerId, by Code, by Id;
 * Get Orders for Staff by FranchiseID; Change status Preparing / Ready-for-pickup.
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
    const raw = response.data as unknown;
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)
        ? (raw as { data: OrderDisplay[] }).data
        : [];
    return list;
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
    const envelope = response.data as { data?: unknown };
    const raw = envelope?.data ?? null;
    if (Array.isArray(raw)) {
      const rows = raw as OrderDisplay[];
      const target = String(orderId);
      const matched =
        rows.find((o) => String((o as { _id?: string | number })._id ?? o.id) === target) ?? rows[0];
      return matched ?? null;
    }

    return (raw as OrderDisplay | null) ?? null;
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
};
