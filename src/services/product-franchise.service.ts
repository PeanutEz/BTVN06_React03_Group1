import apiClient from "@/services/api.client";
import { AxiosError } from "axios";
import type {
  CreateProductFranchiseDto,
  ProductFranchiseApiResponse,
  SearchProductFranchiseDto,
  ProductFranchiseSearchResponse,
} from "@/models/product.model";

export const adminProductFranchiseService = {
  // PRODUCT-FRANCHISE-01 — Create Item
  // POST /api/product-franchises  |  Role: ADMIN, MANAGER  |  Token: required
  // NOTE: size can be set "DEFAULT" if no size applies
  createProductFranchise: async (
    dto: CreateProductFranchiseDto,
  ): Promise<ProductFranchiseApiResponse> => {
    const payload: CreateProductFranchiseDto = {
      franchise_id: dto.franchise_id,
      product_id: dto.product_id,
      size: dto.size,
      price_base: dto.price_base,
    };
    const response = await apiClient.post<{
      success: boolean;
      data: ProductFranchiseApiResponse;
    }>("/product-franchises", payload);
    return response.data.data;
  },

  // PRODUCT-FRANCHISE-02 — Search Items by Conditions
  // POST /api/product-franchises/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  // searchProductFranchises: async (
  //   dto: SearchProductFranchiseDto,
  // ): Promise<ProductFranchiseSearchResponse> => {
  //   const response = await apiClient.post<{
  //     success: boolean;
  //     data: ProductFranchiseSearchResponse;
  //   }>("/product-franchises/search", dto);
  //   return response.data.data;
  // },
  searchProductFranchises: async (
    dto: SearchProductFranchiseDto,
  ): Promise<ProductFranchiseSearchResponse> => {
    const response = await apiClient.post<{
      success: boolean;
      data: ProductFranchiseApiResponse[]; // ← flat — đúng
      pageInfo: ProductFranchiseSearchResponse["pageInfo"];
    }>("/product-franchises/search", dto);
    return {
      data: response.data.data,
      pageInfo: response.data.pageInfo,
    };
  },

  // PRODUCT-FRANCHISE-03 — Get Item
  // GET /api/product-franchises/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getProductFranchiseById: async (id: string): Promise<ProductFranchiseApiResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ProductFranchiseApiResponse;
    }>(`/product-franchises/${id}`);
    return response.data.data;
  },

  // PRODUCT-FRANCHISE-04 — Update Item
  // PUT /api/product-franchises/:id  |  Role: ADMIN, MANAGER  |  Token: required
  updateProductFranchise: async (
    id: string,
    dto: Partial<Pick<CreateProductFranchiseDto, "size" | "price_base">>,
  ): Promise<ProductFranchiseApiResponse> => {
    const payload: Partial<Pick<CreateProductFranchiseDto, "size" | "price_base">> = {
      ...(dto.size !== undefined ? { size: dto.size } : {}),
      ...(dto.price_base !== undefined ? { price_base: dto.price_base } : {}),
    };
    const response = await apiClient.put<{
      success: boolean;
      data: ProductFranchiseApiResponse;
    }>(`/product-franchises/${id}`, payload);
    return response.data.data;
  },

  // PRODUCT-FRANCHISE-05 — Delete Item
  // DELETE /api/product-franchises/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteProductFranchise: async (id: string): Promise<void> => {
    const response = await apiClient.delete<{ success: boolean; data: null }>(
      `/product-franchises/${id}`,
    );
    if (!response.data.success) {
      throw new Error("Xóa product-franchise thất bại");
    }
  },

  // PRODUCT-FRANCHISE-06 — Restore Item
  // PATCH /api/product-franchises/restore  |  Role: ADMIN, MANAGER  |  Token: required
  // payload: { id }
  restoreProductFranchise: async (id: string): Promise<void> => {
    const response = await apiClient.patch<{ success: boolean; data: null }>(
      "/product-franchises/restore",
      { id },
    );
    if (!response.data.success) {
      throw new Error("Khôi phục product-franchise thất bại");
    }
  },

  // PRODUCT-FRANCHISE-07 — Change Status Item
  // PATCH /api/product-franchises/status  |  Role: ADMIN, MANAGER  |  Token: required
  // payload: { id, is_active }
  changeProductFranchiseStatus: async (id: string, isActive: boolean): Promise<void> => {
    try {
      const response = await apiClient.patch<{ success: boolean; data: null }>(
        "/product-franchises/status",
        { id, is_active: isActive },
      );
      if (!response.data.success) {
        throw new Error("Đổi trạng thái product-franchise thất bại");
      }
    } catch (err) {
      // Fallback for backends implementing PATCH /product-franchises/:id/status
      if (err instanceof AxiosError && err.response?.status === 404) {
        const response = await apiClient.patch<{ success: boolean; data: null }>(
          `/product-franchises/${id}/status`,
          { is_active: isActive },
        );
        if (!response.data.success) {
          throw new Error("Đổi trạng thái product-franchise thất bại");
        }
        return;
      }
      throw err;
    }
  },

  // PRODUCT-FRANCHISE-08 — Get Products by Franchise
  // GET /api/product-franchises/franchise/:franchiseId?onlyActive=true
  getProductsByFranchise: async (
    franchiseId: string,
    onlyActive = true,
  ): Promise<ProductFranchiseApiResponse[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ProductFranchiseApiResponse[];
    }>(`/product-franchises/franchise/${franchiseId}`, {
      params: { onlyActive },
    });
    return response.data.data;
  },
};
