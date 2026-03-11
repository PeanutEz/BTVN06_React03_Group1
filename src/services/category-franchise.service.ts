import apiClient from "@/services/api.client";
import type {
  CreateCategoryFranchiseDto,
  CategoryFranchiseApiResponse,
  SearchCategoryFranchiseDto,
  CategoryFranchiseSearchResponse,
} from "@/models/product.model";


// ─── Category Franchise Service ───────────────────────────────────────────────
// CATEGORY-FRANCHISE-01 — Create Item
// POST /api/category-franchises  |  Role: ADMIN, MANAGER  |  Token: required
export const categoryFranchiseService = {
  createCategoryFranchise: async (
    dto: CreateCategoryFranchiseDto,
  ): Promise<CategoryFranchiseApiResponse> => {
    const payload: CreateCategoryFranchiseDto = {
      franchise_id: dto.franchise_id,
      category_id: dto.category_id,
      display_order: dto.display_order ?? 1,
      parent_id: dto.parent_id ?? "",
    };
    const response = await apiClient.post<{
      success: boolean;
      data: CategoryFranchiseApiResponse;
    }>("/category-franchises", payload);
    return response.data.data;
  },

  // CATEGORY-FRANCHISE-02 — Search Items by Conditions
  // POST /api/category-franchises/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  searchCategoryFranchises: async (
    dto: SearchCategoryFranchiseDto,
  ): Promise<CategoryFranchiseSearchResponse> => {
    const payload: SearchCategoryFranchiseDto = {
      searchCondition: {
        franchise_id: dto.searchCondition.franchise_id ?? "",
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
      data: CategoryFranchiseApiResponse[];
      pageInfo: CategoryFranchiseSearchResponse["pageInfo"];
    }>("/category-franchises/search", payload);
    return {
      data: response.data.data,
      pageInfo: response.data.pageInfo,
    };
  },

  // CATEGORY-FRANCHISE-03 — Get Item
  // GET /api/category-franchises/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getCategoryFranchiseById: async (id: string): Promise<CategoryFranchiseApiResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data: CategoryFranchiseApiResponse;
    }>(`/category-franchises/${id}`);
    return response.data.data;
  },

  // CATEGORY-FRANCHISE-04 — Delete Item
  // DELETE /api/category-franchises/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteCategoryFranchise: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(`/category-franchises/${id}`);
  },

  // CATEGORY-FRANCHISE-05 — Restore Item
  // PATCH /api/category-franchises/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreCategoryFranchise: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(`/category-franchises/${id}/restore`);
  },

  // CATEGORY-FRANCHISE-06 — Change Status Item
  // PATCH /api/category-franchises/status  |  Role: ADMIN, MANAGER  |  Token: required
  changeCategoryFranchiseStatus: async (
    id: string,
    is_active: boolean
  ): Promise<void> => {

    const body = {
      is_active: is_active
    };

    console.log("Request URL:", `/category-franchises/${id}/status`);
    console.log("Request Body:", body);

    await apiClient.patch(
      `/category-franchises/${id}/status`,
      body
    );

  },

  // CATEGORY-FRANCHISE-07 — Change Display Order Item
  // PATCH /api/category-franchises/display-order  |  Role: ADMIN, MANAGER  |  Token: required
  changeCategoryDisplayOrder: async (
    id: string,
    display_order: number
  ): Promise<void> => {

    await apiClient.patch<{ success: boolean; data: null }>(
      `/category-franchises/${id}/display-order`,
      {
        display_order: display_order
      }
    );

  },

  // CATEGORY-FRANCHISE-08 — Get Categories by Franchise
  // GET /api/category-franchises/franchise/:franchiseId  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getCategoriesByFranchise: async (franchiseId: string): Promise<CategoryFranchiseApiResponse[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: CategoryFranchiseApiResponse[];
    }>(`/category-franchises/franchise/${franchiseId}`);
    return response.data.data;
  },
};
