export interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

// DTO for creating a new category (CATEGORY-01)
export interface CreateCategoryDto {
  code: string;         // required
  name: string;         // required
  description?: string; // optional, default ""
  parent_id?: string;   // optional, default ""
}

// API response shape returned by POST /api/categories
export interface CategoryApiResponse {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  code: string;
  name: string;
  description: string;
  parent_id: string;
  parent_name?: string; // present in search results
}

// DTO for CATEGORY-02 — Search Items by Conditions
// POST /api/categories/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
export interface SearchCategoryDto {
  searchCondition: {
    keyword?: string;             // optional, default ""
    parent_id?: string;           // optional, default ""
    is_active?: string | boolean; // optional, default ""
    is_deleted?: boolean;         // optional, default false
  };
  pageInfo: {
    pageNum: number;  // required, default 1
    pageSize: number; // required, default 10
  };
}

// Paginated response from POST /api/categories/search
export interface CategorySearchResponse {
  data: CategoryApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// DTO for CATEGORY-FRANCHISE-01 — Create Item
// POST /api/category-franchises  |  Role: ADMIN, MANAGER  |  Token: required
export interface CreateCategoryFranchiseDto {
  franchise_id: string;   // required
  category_id: string;    // required
  display_order?: number; // optional, default 1
  parent_id?: string;     // optional, default ""
}

// API response shape returned by POST /api/category-franchises
export interface CategoryFranchiseApiResponse {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  category_id: string;
  category_name?: string; // present in search/list results
  category_code?: string; // present in list by franchise results
  franchise_id: string;
  franchise_name?: string; // present in search/list results
  franchise_code?: string; // present in list by franchise results
  display_order: number;
}

// DTO for CATEGORY-FRANCHISE-02 — Search Items by Conditions
// POST /api/category-franchises/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
export interface SearchCategoryFranchiseDto {
  searchCondition: {
    franchise_id?: string;             // optional, default ""
    category_id?: string;              // optional, default ""
    is_active?: string | boolean;      // optional, default ""
    is_deleted?: string | boolean;     // optional, default false
  };
  pageInfo: {
    pageNum: number;  // required, default 1
    pageSize: number; // required, default 10
  };
}

// Paginated response from POST /api/category-franchises/search
export interface CategoryFranchiseSearchResponse {
  data: CategoryFranchiseApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// DTO for CATEGORY-FRANCHISE-06 — Change Status Item
// PATCH /api/category-franchises/status  |  Role: ADMIN, MANAGER  |  Token: required
export interface ChangeCategoryFranchiseStatusDto {
  id: string;        // required
  is_active: boolean; // required
}

// DTO for CATEGORY-FRANCHISE-07 — Change Display Order Item
// PATCH /api/category-franchises/display-order  |  Role: ADMIN, MANAGER  |  Token: required
export interface ChangeDisplayOrderCategoryFranchiseDto {
  id: string;           // required — id of the category-franchise item
  display_order: number; // required
}

// Response item from GET /api/categories/select (CATEGORY-07)
export interface CategorySelectItem {
  value: string; // category id
  code: string;
  name: string;
}

// DTO for PRODUCT-01 — Create Item
// POST /api/products  |  Role: ADMIN, MANAGER  |  Token: required
export interface CreateProductDto {
  SKU: string;          // required
  name: string;         // required
  description: string;  // required
  content: string;      // required
  image_url: string;    // required
  images_url?: string[]; // optional, default []
  min_price: number;    // required
  max_price: number;    // required
}

// API response shape returned by /api/products
export interface ProductApiResponse {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  SKU: string;
  name: string;
  description: string;
  image_url: string;
  images_url: string[];
  content: string;
  min_price: number;
  max_price: number;
  is_have_topping: boolean;
}

// DTO for PRODUCT-02 — Search Items by Conditions
// POST /api/products/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
export interface SearchProductDto {
  searchCondition: {
    keyword?: string;                  // optional, default ""
    franchise_id?: string;             // optional, default ""
    min_price?: string | number;       // optional, default ""
    max_price?: string | number;       // optional, default ""
    is_active?: string | boolean;      // optional, default ""
    is_deleted?: string | boolean;     // optional, default false
  };
  pageInfo: {
    pageNum: number;  // required, default 1
    pageSize: number; // required, default 10
  };
}

// Paginated response from POST /api/products/search
export interface ProductSearchResponse {
  data: ProductApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Global Product (HQ Master)
export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  content: string;
  min_price: number; // Minimum allowed price for franchises
  max_price: number; // Maximum allowed price for franchises
  image_url: string;
  images?: string[];
  categoryId: number;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Legacy fields for backward compatibility
  price?: number; // Will be deprecated
  originalPrice?: number;
  image?: string;
  stock?: number;
  isFeatured?: boolean;
  rating?: number;
  reviewCount?: number;
}

// Product list query params
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string; // Search by SKU or Name
  categoryId?: number;
  isActive?: boolean;
}

// Product list response
export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

// Create/Update Product DTO
export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  content: string;
  min_price: number;
  max_price: number;
  image_url: string;
  categoryId: number;
  isActive: boolean;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export interface Voucher {
  id: number;
  code: string;
  description: string;
  discountAmount: number; // số tiền giảm hoặc %
  discountType: "PERCENT" | "FIXED";
  minOrderValue?: number;
  expiryDate: string;
}
// ─── CLIENT APIs ────────────────────────────────────────────────────────────

// Response item for CLIENT-04 — Get Products by Franchise and Category
// GET /api/clients/products?franchiseId=&categoryId=  (franchiseId required)
export interface ClientProductListItem {
  product_id: string;
  category_id: string;
  category_name: string;
  category_display_order: number;
  product_display_order: number;
  SKU: string;
  name: string;
  description: string;
  image_url: string;
  is_have_topping: boolean | null;
  sizes: {
    product_franchise_id: string;
    size: string;
    price: number;
    is_available: boolean;
  }[];
}

// Response for CLIENT-05 — Get Product Detail (GET /api/clients/products/:productFranchiseId)
export interface ClientProductDetailResponse {
  product_id: string;
  category_id: string;
  category_name: string;
  SKU: string;
  name: string;
  description: string;
  content: string;
  image_url: string;
  images_url: string[];
  is_have_topping: boolean | null;
  sizes: {
    product_franchise_id: string;
    size: string;
    price: number;
    is_available: boolean;
  }[];
}
// ─── PRODUCT-FRANCHISE ────────────────────────────────────────────────────────

// DTO for PRODUCT-FRANCHISE-01 — Create Item (POST /api/product-franchises)
// NOTE: size can be set "DEFAULT" if no size applies
export interface CreateProductFranchiseDto {
  franchise_id: string;  // required
  product_id: string;    // required
  size: string;          // required — use "DEFAULT" when no size
  price_base: number;    // required
}

// API response shape returned by POST /api/product-franchises
export interface ProductFranchiseApiResponse {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  product_id: string;
  franchise_id: string;
  size: string;
  price_base: number;
}

// DTO for PRODUCT-FRANCHISE-02 — Search Items by Conditions (POST /api/product-franchises/search)
export interface SearchProductFranchiseDto {
  searchCondition: {
    franchise_id?: string;
    product_id?: string;
    size?: string;
    price_from?: string | number;
    price_to?: string | number;
    is_active?: string | boolean;
    is_deleted?: string | boolean; // default FALSE
  };
  pageInfo: {
    pageNum: number;  // default 1
    pageSize: number; // default 10
  };
}

export interface ProductFranchiseSearchResponse {
  data: ProductFranchiseApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
