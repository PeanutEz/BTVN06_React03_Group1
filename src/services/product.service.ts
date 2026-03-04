import apiClient from "@/services/api.client";
import type {
  Product,
  Category,
  Banner,
  Voucher,
  ProductQueryParams,
  ProductListResponse,
  CreateProductDto,
  ProductApiResponse,
  SearchProductDto,
  ProductSearchResponse,
  ClientProductDetailResponse,
} from "@/models/product.model";

// Legacy static export â€” used by admin UI for category filter dropdowns
// For real category data, use categoryService
export const categories: Category[] = [];

// â”€â”€â”€ Product Service (Client-facing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const productService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<{ success: boolean; data: Category[] }>(
      "/categories/select",
    );
    return response.data.data;
  },

  getCategoryById: async (id: number): Promise<Category | undefined> => {
    const response = await apiClient.get<{ success: boolean; data: Category }>(
      `/categories/${id}`,
    );
    return response.data.data;
  },

  getCategoryByCode: async (code: string): Promise<Category | undefined> => {
    const response = await apiClient.get<{ success: boolean; data: Category }>(
      `/categories/code/${code}`,
    );
    return response.data.data;
  },

  getProducts: async (categoryId?: number): Promise<Product[]> => {
    const response = await apiClient.get<{ success: boolean; data: Product[] }>(
      "/products",
      { params: categoryId ? { category_id: categoryId } : undefined },
    );
    return response.data.data;
  },

  getProductById: async (id: number): Promise<Product | null> => {
    const response = await apiClient.get<{ success: boolean; data: Product }>(
      `/products/${id}`,
    );
    return response.data.data ?? null;
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<{ success: boolean; data: Product[] }>(
      "/products/featured",
    );
    return response.data.data;
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    const response = await apiClient.get<{ success: boolean; data: Product[] }>(
      "/products/search",
      { params: { keyword: query } },
    );
    return response.data.data;
  },

  getBanners: async (): Promise<Banner[]> => {
    const response = await apiClient.get<{ success: boolean; data: Banner[] }>(
      "/banners",
    );
    return response.data.data;
  },

  getVouchers: async (): Promise<Voucher[]> => {
    const response = await apiClient.get<{ success: boolean; data: Voucher[] }>(
      "/vouchers",
    );
    return response.data.data;
  },

  // CLIENT-05 — Get Product Detail
  // GET /api/clients/products/:productFranchiseId  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getProductDetail: async (productFranchiseId: string): Promise<ClientProductDetailResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ClientProductDetailResponse }>(
      `/clients/products/${productFranchiseId}`,
    );
    return response.data.data;
  },
};

// â”€â”€â”€ Admin Product Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const adminProductService = {
  // Get products with pagination and filters (for admin list)
  getProducts: async (params?: ProductQueryParams): Promise<ProductListResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data: Product[];
      total: number;
      page: number;
      limit: number;
    }>("/products", { params });
    return {
      data: response.data.data,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
    };
  },


  // PRODUCT-01 â€” Create Item
  // POST /api/products  |  Role: ADMIN, MANAGER  |  Token: required
  createProduct: async (dto: CreateProductDto): Promise<ProductApiResponse> => {
    const payload: CreateProductDto = {
      SKU: dto.SKU,
      name: dto.name,
      description: dto.description,
      content: dto.content,
      image_url: dto.image_url,
      images_url: dto.images_url ?? [],
      min_price: dto.min_price,
      max_price: dto.max_price,
    };
    const response = await apiClient.post<{ success: boolean; data: ProductApiResponse }>(
      "/products",
      payload,
    );
    return response.data.data;
  },

  // PRODUCT-02 — Search Items by Conditions
  // POST /api/products/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  searchProducts: async (dto: SearchProductDto): Promise<ProductSearchResponse> => {
    const payload: SearchProductDto = {
      searchCondition: {
        keyword: dto.searchCondition.keyword ?? "",
        franchise_id: dto.searchCondition.franchise_id ?? "",
        min_price: dto.searchCondition.min_price ?? "",
        max_price: dto.searchCondition.max_price ?? "",
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
      data: ProductApiResponse[];
      pageInfo: ProductSearchResponse["pageInfo"];
    }>("/products/search", payload);
    return {
      data: response.data.data,
      pageInfo: response.data.pageInfo,
    };
  },

  // PRODUCT-03 — Get Item
  // GET /api/products/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getProductById: async (id: string): Promise<ProductApiResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ProductApiResponse }>(
      `/products/${id}`,
    );
    return response.data.data;
  },

  // PRODUCT-04 — Update Item
  // PUT /api/products/:id  |  Role: ADMIN, MANAGER  |  Token: required
  updateProduct: async (id: string, dto: CreateProductDto): Promise<ProductApiResponse> => {
    const payload: CreateProductDto = {
      SKU: dto.SKU,
      name: dto.name,
      description: dto.description,
      content: dto.content,
      image_url: dto.image_url,
      images_url: dto.images_url ?? [],
      min_price: dto.min_price,
      max_price: dto.max_price,
    };
    const response = await apiClient.put<{ success: boolean; data: ProductApiResponse }>(
      `/products/${id}`,
      payload,
    );
    return response.data.data;
  },

  // PRODUCT-05 — Delete Item
  // DELETE /api/products/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(`/products/${id}`);
  },

  // PRODUCT-06 — Restore Item
  // PATCH /api/products/:id/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreProduct: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(`/products/${id}/restore`);
  },

  // PRODUCT-07 — Toggle Active Status
  // PATCH /api/products/status  |  Role: ADMIN, MANAGER  |  Token: required
  toggleProductStatus: async (id: string): Promise<{ isActive: boolean }> => {
    const current = await adminProductService.getProductById(id);
    const newStatus = !current.is_active;
    await apiClient.patch<{ success: boolean; data: null }>("/products/status", {
      id,
      is_active: newStatus,
    });
    return { isActive: newStatus };
  },
};
