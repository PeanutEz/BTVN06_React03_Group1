/**
 * Delivery API client — real API.
 * GET by OrderId, by Id; POST search; PUT pickup, PUT complete.
 */
import apiClient from "@/services/api.client";

type ApiResponse<T> = { success: boolean; data: T };

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

export const deliveryClient = {
  getDeliveryByOrderId: async (orderId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.get<ApiResponse<DeliveryData | null>>(
      `/deliveries/order/${orderId}`
    );
    return response.data.data ?? null;
  },

  getDeliveryById: async (deliveryId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.get<ApiResponse<DeliveryData | null>>(
      `/deliveries/${deliveryId}`
    );
    return response.data.data ?? null;
  },

  searchDeliveries: async (params: DeliverySearchParams): Promise<DeliveryData[]> => {
    const response = await apiClient.post<ApiResponse<DeliveryData[]>>(
      "/deliveries/search",
      params
    );
    return response.data.data ?? [];
  },

  changeStatusPickup: async (deliveryId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.put<ApiResponse<DeliveryData | null>>(
      `/deliveries/${deliveryId}/pickup`
    );
    return response.data.data ?? null;
  },

  changeStatusComplete: async (deliveryId: string): Promise<DeliveryData | null> => {
    const response = await apiClient.put<ApiResponse<DeliveryData | null>>(
      `/deliveries/${deliveryId}/complete`
    );
    return response.data.data ?? null;
  },
};
