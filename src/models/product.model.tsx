export interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
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
