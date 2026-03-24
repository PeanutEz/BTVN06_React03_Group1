/**
 * Delivery API client — real API.
 * GET by OrderId, by Id; POST search; PUT pickup, PUT complete.
 *
 * Uses robust response extraction pattern (similar to payment.client.ts)
 * to handle various API response formats consistently.
 */
import apiClient from "@/services/api.client";

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface DeliveryData {
  _id?: string;
  id?: string;
  order_id?: string;
  order_code?: string;
  franchise_id?: string;
  franchise_name?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  order_address?: string;
  order_phone?: string;
  order_message?: string;
  status?: string;
  picked_up_at?: string;
  delivered_at?: string;
  assigned_at?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DeliverySearchParams {
  franchise_id?: string;
  staff_id?: string;
  customer_id?: string;
  status?: string;
}

/**
 * ✅ Safely extract single item from API response
 * Handles various response formats:
 * - { data: T }
 * - { success: true, data: T }
 * - T (direct)
 * - [T] (array with single item)
 */
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

/**
 * ✅ Safely extract array from API response
 * Handles various response formats:
 * - { data: T[] }
 * - { success: true, data: T[] }
 * - T[] (direct)
 */
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

export const deliveryClient = {
  /**
   * Get delivery record by order ID
   * GET /api/deliveries/order/{orderId}
   */
  getDeliveryByOrderId: async (orderId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.get(`/deliveries/order/${orderId}`);
    return unwrapSingle<DeliveryData>(response.data);
  },

  /**
   * Get delivery record by delivery ID
   * GET /api/deliveries/{deliveryId}
   */
  getDeliveryById: async (deliveryId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.get(`/deliveries/${deliveryId}`);
    return unwrapSingle<DeliveryData>(response.data);
  },

  /**
   * Search deliveries with filters
   * POST /api/deliveries/search
   */
  searchDeliveries: async (params: DeliverySearchParams): Promise<DeliveryData[]> => {
    const response = await apiClient.post("/deliveries/search", params);
    return unwrapList<DeliveryData>(response.data);
  },
  /**
   * Update delivery status to "picked up"
   * PUT /api/deliveries/{deliveryId}/pickup
   */
  changeStatusPickup: async (deliveryId: string, staffId?: string): Promise<DeliveryData | null> => {
    const body = staffId ? { staff_id: staffId } : {};
    const response = await apiClient.put(`/deliveries/${deliveryId}/pickup`, body);
    return unwrapSingle<DeliveryData>(response.data);
  },

  /**
   * Update delivery status to "completed"
   * PUT /api/deliveries/{deliveryId}/complete
   */
  changeStatusComplete: async (deliveryId: string, staffId?: string): Promise<DeliveryData | null> => {
    const body = staffId ? { staff_id: staffId } : {};
    const response = await apiClient.put(`/deliveries/${deliveryId}/complete`, body);
    return unwrapSingle<DeliveryData>(response.data);
  },
};
