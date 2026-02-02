import { create } from "zustand";
import type { Product, Category, Banner, Voucher } from "@/modules/product/types/product.type";
import { productService } from "@/modules/product/services/product.service";

interface ProductState {
    // State
    products: Product[];
    categories: Category[];
    banners: Banner[];
    vouchers: Voucher[];
    featuredProducts: Product[];
    selectedProduct: Product | null;
    selectedCategory: Category | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchProducts: (categoryId?: number) => Promise<void>;
    fetchCategories: () => Promise<void>;
    fetchBanners: () => Promise<void>;
    fetchVouchers: () => Promise<void>;
    fetchFeaturedProducts: () => Promise<void>;
    fetchProductById: (id: number) => Promise<void>;
    fetchCategoryByCode: (code: string) => Promise<void>;
    searchProducts: (query: string) => Promise<void>;
    clearSelectedProduct: () => void;
    clearError: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
    // Initial state
    products: [],
    categories: [],
    banners: [],
    vouchers: [],
    featuredProducts: [],
    selectedProduct: null,
    selectedCategory: null,
    isLoading: false,
    error: null,

    // Actions
    fetchProducts: async (categoryId?: number) => {
        set({ isLoading: true, error: null });
        try {
            const data = await productService.getProducts(categoryId);
            set({ products: data, isLoading: false });
        } catch (error) {
            set({ error: "Không thể tải danh sách sản phẩm", isLoading: false });
        }
    },

    fetchCategories: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await productService.getCategories();
            set({ categories: data, isLoading: false });
        } catch (error) {
            set({ error: "Không thể tải danh mục", isLoading: false });
        }
    },

    fetchBanners: async () => {
        try {
            const data = await productService.getBanners();
            set({ banners: data });
        } catch (error) {
            console.error("Failed to fetch banners:", error);
        }
    },

    fetchVouchers: async () => {
        try {
            const data = await productService.getVouchers();
            set({ vouchers: data });
        } catch (error) {
            console.error("Failed to fetch vouchers:", error);
        }
    },

    fetchFeaturedProducts: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await productService.getFeaturedProducts();
            set({ featuredProducts: data, isLoading: false });
        } catch (error) {
            set({ error: "Không thể tải sản phẩm nổi bật", isLoading: false });
        }
    },

    fetchProductById: async (id: number) => {
        set({ isLoading: true, error: null, selectedProduct: null });
        try {
            const data = await productService.getProductById(id);
            if (data) {
                set({ selectedProduct: data, isLoading: false });
            } else {
                set({ error: "Không tìm thấy sản phẩm", isLoading: false });
            }
        } catch (error) {
            set({ error: "Không thể tải thông tin sản phẩm", isLoading: false });
        }
    },

    fetchCategoryByCode: async (code: string) => {
        try {
            const data = await productService.getCategoryByCode(code);
            set({ selectedCategory: data || null });
        } catch (error) {
            console.error("Failed to fetch category:", error);
        }
    },

    searchProducts: async (query: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await productService.searchProducts(query);
            set({ products: data, isLoading: false });
        } catch (error) {
            set({ error: "Không thể tìm kiếm sản phẩm", isLoading: false });
        }
    },

    clearSelectedProduct: () => {
        set({ selectedProduct: null });
    },

    clearError: () => {
        set({ error: null });
    },
}));
