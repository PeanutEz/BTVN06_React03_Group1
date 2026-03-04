import apiClient from "@/services/api.client";
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
  searchProductFranchises: async (
    dto: SearchProductFranchiseDto,
  ): Promise<ProductFranchiseSearchResponse> => {
    const response = await apiClient.post<{
      success: boolean;
      data: ProductFranchiseSearchResponse;
    }>("/product-franchises/search", dto);
    return response.data.data;
  },
};
