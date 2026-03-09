import apiClient from "@/services/api.client";
import type {
  CreateProductFranchiseDto,
  ProductFranchiseApiResponse,
  SearchProductFranchiseDto,
  ProductFranchiseSearchResponse,
  UpdateProductFranchiseDto,
  ChangeProductFranchiseStatusDto,
  GetProductsByFranchiseQuery,
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
    dto: UpdateProductFranchiseDto,
  ): Promise<ProductFranchiseApiResponse> => {
    const payload: UpdateProductFranchiseDto = {
      franchise_id: dto.franchise_id,
      product_id: dto.product_id,
      size: dto.size,
      price_base: dto.price_base,
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
    await apiClient.delete<{ success: boolean; data: null }>(`/product-franchises/${id}`);
  },

  // PRODUCT-FRANCHISE-06 — Restore Item
  // PATCH /api/product-franchises/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreProductFranchise: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(
      `/product-franchises/restore`,
      { id },
    );
  },

  // PRODUCT-FRANCHISE-07 — Change Status Item
  // PATCH /api/product-franchises/status  |  Role: ADMIN, MANAGER  |  Token: required
  changeProductFranchiseStatus: async (
    dto: ChangeProductFranchiseStatusDto,
  ): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(
      `/product-franchises/status`,
      { id: dto.id, is_active: dto.is_active },
    );
  },

  // PRODUCT-FRANCHISE-08 — Get Products by Franchise
  // GET /api/product-franchises/franchise/:franchiseId?onlyActive=true&productId=
  getProductsByFranchise: async (
    params: GetProductsByFranchiseQuery,
  ): Promise<ProductFranchiseApiResponse[]> => {
    const searchParams = new URLSearchParams();
    if (params.onlyActive !== undefined) {
      searchParams.set("onlyActive", String(params.onlyActive));
    }
    if (params.productId) {
      searchParams.set("productId", params.productId);
    }
    const queryString = searchParams.toString();
    const url = queryString
      ? `/product-franchises/franchise/${params.franchiseId}?${queryString}`
      : `/product-franchises/franchise/${params.franchiseId}`;

    const response = await apiClient.get<{
      success: boolean;
      data: ProductFranchiseApiResponse[];
    }>(url);
    return response.data.data;
  },
};
