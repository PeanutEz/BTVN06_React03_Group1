import apiClient from "@/services/api.client";
import type {
  CreateCategoryDto,
  CategoryApiResponse,
  SearchCategoryDto,
  CategorySearchResponse,
  CategorySelectItem,
} from "@/models/product.model";

// ─── Category Service ────────────────────────────────────────────────────────
// CATEGORY-01 — Create Item
// POST /api/categories  |  Role: ADMIN, MANAGER  |  Token: required
export const categoryService = {
  createCategory: async (dto: CreateCategoryDto): Promise<CategoryApiResponse> => {
    const payload: CreateCategoryDto = {
      code: dto.code,
      name: dto.name,
      description: dto.description ?? "",
      parent_id: dto.parent_id ?? "",
    };
    const response = await apiClient.post<{ success: boolean; data: CategoryApiResponse }>(
      "/categories",
      payload,
    );
    return response.data.data;
  },

  // CATEGORY-02 — Search Items by Conditions
  // POST /api/categories/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  searchCategories: async (dto: SearchCategoryDto): Promise<CategorySearchResponse> => {
    const payload: SearchCategoryDto = {
      searchCondition: {
        keyword: dto.searchCondition.keyword ?? "",
        parent_id: dto.searchCondition.parent_id ?? "",
        is_active: dto.searchCondition.is_active ?? "",
        is_deleted: dto.searchCondition.is_deleted ?? false,
      },
      pageInfo: {
        pageNum: dto.pageInfo.pageNum ?? 1,
        pageSize: dto.pageInfo.pageSize ?? 10,
      },
    };
    const response = await apiClient.post<{ success: boolean; data: CategoryApiResponse[]; pageInfo: CategorySearchResponse["pageInfo"] }>(
      "/categories/search",
      payload,
    );
    return {
      data: response.data.data,
      pageInfo: response.data.pageInfo,
    };
  },

  // CATEGORY-03 — Get Item
  // GET /api/categories/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getCategoryById: async (id: string): Promise<CategoryApiResponse> => {
    const response = await apiClient.get<{ success: boolean; data: CategoryApiResponse }>(
      `/categories/${id}`,
    );
    return response.data.data;
  },

  // CATEGORY-04 — Update Item
  // PUT /api/categories/:id  |  Role: ADMIN, MANAGER  |  Token: required
  updateCategory: async (id: string, dto: CreateCategoryDto): Promise<CategoryApiResponse> => {
    const payload: CreateCategoryDto = {
      code: dto.code,
      name: dto.name,
      description: dto.description ?? "",
      parent_id: dto.parent_id ?? "",
    };
    const response = await apiClient.put<{ success: boolean; data: CategoryApiResponse }>(
      `/categories/${id}`,
      payload,
    );
    return response.data.data;
  },

  // CATEGORY-05 — Delete Item
  // DELETE /api/categories/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(`/categories/${id}`);
  },

  // CATEGORY-06 — Restore Item
  // PATCH /api/categories/:id/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreCategory: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(`/categories/${id}/restore`);
  },

  // CATEGORY-07 — Get Select Items
  // GET /api/categories/select  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getSelectCategories: async (): Promise<CategorySelectItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: CategorySelectItem[] }>(
      "/categories/select",
    );
    return response.data.data;
  },
};
