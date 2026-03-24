/**
 * Customer Franchise Service — Admin Panel
 * POST /api/customer-franchises/search
 * GET  /api/customer-franchises/:id
 */
import apiClient from "./api.client";
import type { CustomerFranchise } from "./client.service";

export interface CustomerFranchiseSearchCondition {
  franchise_id?: string;
  customer_id?: string;
  loyalty_points?: string | number;
  is_active?: boolean | "";
  is_deleted?: boolean;
}

export interface CustomerFranchiseSearchPayload {
  searchCondition: CustomerFranchiseSearchCondition;
  pageInfo: { pageNum: number; pageSize: number };
}

export interface CustomerFranchiseSearchResponse {
  success: boolean;
  data: CustomerFranchise[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const customerFranchiseService = {
  /** POST /api/customer-franchises/search */
  search: async (
    payload: CustomerFranchiseSearchPayload
  ): Promise<CustomerFranchiseSearchResponse> => {
    const response = await apiClient.post<CustomerFranchiseSearchResponse>(
      "/customer-franchises/search",
      payload
    );
    return response.data;
  },

  /** GET /api/customer-franchises/:id */
  getById: async (id: string): Promise<CustomerFranchise> => {
    const response = await apiClient.get<{ success: boolean; data: CustomerFranchise }>(
      `/customer-franchises/${id}`
    );
    return response.data.data;
  },
};
