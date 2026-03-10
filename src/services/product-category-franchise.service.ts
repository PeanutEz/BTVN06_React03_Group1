import apiClient from "@/services/api.client";
import type {
  CreateProductCategoryFranchiseDto,
  ProductCategoryFranchiseApiResponse,
  SearchProductCategoryFranchiseDto,
  ProductCategoryFranchiseSearchResponse,
  ReorderProductCategoryFranchiseDto,
} from "@/models/product.model";

export const productCategoryFranchiseService = {
  /**
   * PCF-01 — Add Product to Category Franchise
   * POST /api/product-category-franchises | Role: ADMIN, MANAGER | Token: required
   */
  createProductCategoryFranchise: async (
    dto: CreateProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: ProductCategoryFranchiseApiResponse;
        message?: string;
      }>("/product-category-franchises", dto);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Tạo liên kết sản phẩm - danh mục thất bại");
      }

      return res.data.data;
    } catch (err: any) {
      console.error("[createProductCategoryFranchise] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể tạo liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-02 — Search Items by Conditions
   * POST /api/product-category-franchises/search | Role: SYSTEM & FRANCHISE | Token: required
   */
  searchProductCategoryFranchises: async (
    dto: SearchProductCategoryFranchiseDto,
  ): Promise<ProductCategoryFranchiseSearchResponse> => {
    try {
      const payload: SearchProductCategoryFranchiseDto = {
        searchCondition: {
          franchise_id: dto.searchCondition.franchise_id || undefined,
          product_id: dto.searchCondition.product_id || undefined,
          category_id: dto.searchCondition.category_id || undefined,
          is_active: dto.searchCondition.is_active,
          is_deleted: dto.searchCondition.is_deleted ?? false,
        },
        pageInfo: {
          pageNum: dto.pageInfo?.pageNum ?? 1,
          pageSize: dto.pageInfo?.pageSize ?? 10,
        },
      };

      const res = await apiClient.post<{
        success: boolean;
        data: ProductCategoryFranchiseApiResponse[];
        pageInfo: ProductCategoryFranchiseSearchResponse["pageInfo"];
        message?: string;
      }>("/product-category-franchises/search", payload);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Tìm kiếm thất bại");
      }

      return {
        data: res.data.data,
        pageInfo: res.data.pageInfo,
      };
    } catch (err: any) {
      console.error("[searchProductCategoryFranchises] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể tìm kiếm liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-03 — Get Item
   * GET /api/product-category-franchises/:id | Role: SYSTEM & FRANCHISE | Token: required
   */
  getProductCategoryFranchiseById: async (
    id: string,
  ): Promise<ProductCategoryFranchiseApiResponse> => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: ProductCategoryFranchiseApiResponse;
        message?: string;
      }>(`/product-category-franchises/${id}`);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Lấy chi tiết thất bại");
      }

      return res.data.data;
    } catch (err: any) {
      console.error("[getProductCategoryFranchiseById] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể lấy thông tin liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-04 — Delete Item
   * DELETE /api/product-category-franchises/:id | Role: ADMIN, MANAGER | Token: required
   */
  deleteProductCategoryFranchise: async (id: string): Promise<void> => {
    try {
      const res = await apiClient.delete<{ success: boolean; data: null; message?: string }>(
        `/product-category-franchises/${id}`,
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Xóa thất bại");
      }
    } catch (err: any) {
      console.error("[deleteProductCategoryFranchise] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể xóa liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-05 — Restore Item
   * PATCH /api/product-category-franchises/restore | Role: ADMIN, MANAGER | Token: required
   */
  restoreProductCategoryFranchise: async (id: string): Promise<void> => {
    try {
      const res = await apiClient.patch<{ success: boolean; data: null; message?: string }>(
        "/product-category-franchises/restore",
        { id },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Khôi phục thất bại");
      }
    } catch (err: any) {
      console.error("[restoreProductCategoryFranchise] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể khôi phục liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-06 — Change Status Item
   * PATCH /api/product-category-franchises/status | Role: ADMIN, MANAGER | Token: required
   */
  changeProductCategoryFranchiseStatus: async (
    id: string,
    is_active: boolean,
  ): Promise<void> => {
    try {
      const res = await apiClient.patch<{ success: boolean; data: null; message?: string }>(
        "/product-category-franchises/status",
        { id, is_active },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Đổi trạng thái thất bại");
      }
    } catch (err: any) {
      console.error("[changeProductCategoryFranchiseStatus] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể thay đổi trạng thái liên kết sản phẩm - danh mục"
      );
    }
  },

  /**
   * PCF-07 — Change Display Order Item
   * PATCH /api/product-category-franchises/reorder | Role: ADMIN, MANAGER | Token: required
   */
  reorderProductCategoryFranchise: async (
    dto: ReorderProductCategoryFranchiseDto,
  ): Promise<void> => {
    try {
      const res = await apiClient.patch<{ success: boolean; data: null; message?: string }>(
        "/product-category-franchises/reorder",
        dto,
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Đổi thứ tự thất bại");
      }
    } catch (err: any) {
      console.error("[reorderProductCategoryFranchise] failed:", err);
      throw new Error(
        err.response?.data?.message ||
        err.message ||
        "Không thể thay đổi thứ tự hiển thị"
      );
    }
  },
};