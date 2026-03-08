import apiClient from "@/services/api.client";
import type { ClientFranchiseItem, ClientCategoryByFranchiseItem } from "@/models/store.model";
import type {
  ClientProductListItem,
  ClientProductDetailResponse,
} from "@/models/product.model.tsx";

export const clientService = {
  // CLIENT-01 — Get All Franchises
  // GET /api/clients/franchises  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getAllFranchises: async (): Promise<ClientFranchiseItem[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ClientFranchiseItem[];
    }>("/clients/franchises");
    return response.data.data;
  },

  // CLIENT-02 — Get All Categories By Franchise
  // GET /api/clients/franchises/:franchiseId/categories  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getCategoriesByFranchise: async (franchiseId: string): Promise<ClientCategoryByFranchiseItem[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ClientCategoryByFranchiseItem[];
    }>(`/clients/franchises/${franchiseId}/categories`);
    return response.data.data;
  },

  // CLIENT-04 — Get Products by Franchise and Category
  // GET /api/clients/products?franchiseId=&categoryId=  |  Role: CUSTOMER PUBLIC  |  Token: NO
  // NOTE: franchiseId is required, categoryId is optional
  getProductsByFranchiseAndCategory: async (
    franchiseId: string,
    categoryId?: string,
  ): Promise<ClientProductListItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: ClientProductListItem[] }>(
      "/clients/products",
      { params: { franchiseId, ...(categoryId ? { categoryId } : {}) } },
    );
    return response.data.data;
  },

  // CLIENT-05 — Get Product Detail
  // GET /api/clients/franchises/:franchiseId/products/:productId  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getProductDetail: async (franchiseId: string, productId: string): Promise<ClientProductDetailResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ClientProductDetailResponse }>(
      `/clients/franchises/${franchiseId}/products/${productId}`,
    );
    return response.data.data;
  },
};
