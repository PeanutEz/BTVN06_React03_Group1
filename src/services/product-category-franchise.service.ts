import apiClient from "@/services/api.client";
import type {
  ChangeProductCategoryFranchiseStatusDto,
  CreateProductCategoryFranchiseDto,
  ProductCategoryFranchiseApiResponse,
  ProductCategoryFranchiseSearchResponse,
  ReorderProductCategoryFranchiseDto,
  RestoreProductCategoryFranchiseDto,
  SearchProductCategoryFranchiseDto,
} from "@/models/product.model";

export const adminProductCategoryFranchiseService = {
  // PRODUCT-CATEGORY-FRANCHISE-01 — Add Product to Category Franchise
  // POST /api/product-category-franchises
  createProductCategoryFranchise: async (
    dto: CreateProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    const payload: CreateProductCategoryFranchiseDto = {
      category_franchise_id: dto.category_franchise_id,
      product_franchise_id: dto.product_franchise_id,
      display_order: dto.display_order,
    };

    const res = await apiClient.post<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse;
    }>("/product-category-franchises", payload);

    return res.data.data;
  },

  // PRODUCT-CATEGORY-FRANCHISE-02 — Search Items by Conditions
  // POST /api/product-category-franchises/search
  searchProductCategoryFranchises: async (
    dto: SearchProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseSearchResponse> => {
    const res = await apiClient.post<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse[];
      pageInfo: ProductCategoryFranchiseSearchResponse["pageInfo"];
    }>("/product-category-franchises/search", dto);

    return {
      data: res.data.data,
      pageInfo: res.data.pageInfo,
    };
  },

  // PRODUCT-CATEGORY-FRANCHISE-03 — Get Item
  // GET /api/product-category-franchises/:id
  getProductCategoryFranchiseById: async (
    id: string,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    const res = await apiClient.get<{
      success: boolean;
      data: ProductCategoryFranchiseApiResponse;
    }>(`/product-category-franchises/${id}`);

    return res.data.data;
  },

  // PRODUCT-CATEGORY-FRANCHISE-04 — Delete Item
  // DELETE /api/product-category-franchises/:id
  deleteProductCategoryFranchise: async (id: string): Promise<void> => {
    const res = await apiClient.delete<{ success: boolean; data: null }>(
      `/product-category-franchises/${id}`,
    );

    if (!res.data.success) {
      throw new Error("Xóa product-category-franchise thất bại");
    }
  },

  // PRODUCT-CATEGORY-FRANCHISE-05 — Restore Item
  // PATCH /api/product-category-franchises/restore
  restoreProductCategoryFranchise: async (id: string): Promise<void> => {
    const payload: RestoreProductCategoryFranchiseDto = { id };

    const res = await apiClient.patch<{ success: boolean; data: null }>(
      "/product-category-franchises/restore",
      payload,
    );

    if (!res.data.success) {
      throw new Error("Khôi phục product-category-franchise thất bại");
    }
  },

  // PRODUCT-CATEGORY-FRANCHISE-06 — Change Status Item
  // PATCH /api/product-category-franchises/status
  changeProductCategoryFranchiseStatus: async (
    id: string,
    isActive: boolean,
  ): Promise<void> => {
    const payload: ChangeProductCategoryFranchiseStatusDto = {
      id,
      is_active: isActive,
    };

    const res = await apiClient.patch<{ success: boolean; data: null }>(
      "/product-category-franchises/status",
      payload,
    );

    if (!res.data.success) {
      throw new Error("Đổi trạng thái product-category-franchise thất bại");
    }
  },

  // PRODUCT-CATEGORY-FRANCHISE-07 — Change Display Order Item
  // PATCH /api/product-category-franchises/reorder
  reorderProductCategoryFranchise: async (
    categoryFranchiseId: string,
    itemId: string,
    newPosition: number,
  ): Promise<void> => {
    const payload: ReorderProductCategoryFranchiseDto = {
      category_franchise_id: categoryFranchiseId,
      item_id: itemId,
      new_position: newPosition,
    };

    const res = await apiClient.patch<{ success: boolean; data: null }>(
      "/product-category-franchises/reorder",
      payload,
    );

    if (!res.data.success) {
      throw new Error("Đổi thứ tự product-category-franchise thất bại");
    }
  },
};

