import apiClient from "@/services/api.client";
import type {
  CreateProductCategoryFranchiseDto,
  ProductCategoryFranchiseApiResponse,
  SearchProductCategoryFranchiseDto,
  ProductCategoryFranchiseSearchResponse,
  ReorderProductCategoryFranchiseDto,
  ProductWithCategoriesResponse,
} from "@/models/product.model";

export const productCategoryFranchiseService = {
  // PCF-01 — Add Product to Category Franchise
  // POST /api/product-category-franchises  |  Role: ADMIN, MANAGER  |  Token: required
  createProductCategoryFranchise: async (
    dto: CreateProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    const response = await apiClient.post<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse;
    }>("/product-category-franchises", dto);
    return response.data.data;
  },

  // PCF-02 — Search Items by Conditions
  // POST /api/product-category-franchises/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  searchProductCategoryFranchises: async (
    dto: SearchProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseSearchResponse> => {
    const payload: SearchProductCategoryFranchiseDto = {
      searchCondition: {
        franchise_id: dto.searchCondition.franchise_id ?? "",
        product_id: dto.searchCondition.product_id ?? "",
        category_id: dto.searchCondition.category_id ?? "",
        is_active: dto.searchCondition.is_active ?? "",
        is_deleted: dto.searchCondition.is_deleted ?? false,
      },
      pageInfo: {
        pageNum: dto.pageInfo.pageNum ?? 1,
        pageSize: dto.pageInfo.pageSize ?? 10,
      },
    };
    const response = await apiClient.post<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse[];
      pageInfo: ProductCategoryFranchiseSearchResponse["pageInfo"];
    }>("/product-category-franchises/search", payload);
    return {
      data: response.data.data,
      pageInfo: response.data.pageInfo,
    };
  },

  // PCF-03 — Get Item
  // GET /api/product-category-franchises/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getProductCategoryFranchiseById: async (
    id: string,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse;
    }>(`/product-category-franchises/${id}`);
    return response.data.data;
  },

  // PCF-04 — Delete Item
  // DELETE /api/product-category-franchises/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteProductCategoryFranchise: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(
      `/product-category-franchises/${id}`,
    );
  },
  // PCF-05 — Restore Item
  // PATCH /api/product-category-franchises/:id/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreProductCategoryFranchise: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(
      `/product-category-franchises/${id}/restore`,
    );
  },
  // PCF-06 — Change Status Item
  // PATCH /api/product-category-franchises/:id/status  |  Role: ADMIN, MANAGER  |  Token: required
  changeProductCategoryFranchiseStatus: async (
    id: string,
    is_active: boolean,
  ): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(
      `/product-category-franchises/${id}/status`,
      { is_active },
    );
  },

  // PCF-07 — Change Display Order Item
  // PATCH /api/product-category-franchises/reorder  |  Role: ADMIN, MANAGER  |  Token: required
  reorderProductCategoryFranchise: async (
    dto: ReorderProductCategoryFranchiseDto,
  ): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(
      "/product-category-franchises/reorder",
      dto,
    );
  },

  // PCF-08 — Get All Products by FranchiseId with Category
  // GET /api/product-category-franchises/franchise/:franchiseId  |  Token: required
  getProductsByFranchiseWithCategory: async (
    franchiseId: string,
  ): Promise<ProductWithCategoriesResponse[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ProductWithCategoriesResponse[];
    }>(`/product-category-franchises/franchise/${franchiseId}`);
    return response.data.data;
  },
};
