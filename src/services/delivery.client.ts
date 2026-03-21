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
  franchise_id?: string;
  staff_id?: string;
  customer_id?: string;
  status?: string;
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
