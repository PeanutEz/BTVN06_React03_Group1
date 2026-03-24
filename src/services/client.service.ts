import apiClient from "@/services/api.client";
import type { ClientFranchiseItem, ClientCategoryByFranchiseItem } from "@/models/store.model";
import type {
  ClientProductListItem,
  ClientProductDetailResponse,
} from "@/models/product.model.tsx";

// ==================== Loyalty Types ====================

export interface LoyaltyRule {
  id: string;
  franchise_id: string;
  tier_name: string; // BRONZE, SILVER, GOLD, PLATINUM
  min_points: number;
  max_points: number;
  discount_percentage: number;
  earn_multiplier: number;
  free_shipping: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyalty {
  customer_id: string;
  franchise_id: string;
  loyalty_points: number;
  current_tier: string; // BRONZE, SILVER, GOLD, PLATINUM
  total_spent: number;
  total_orders: number;
  membership_since: string;
  last_earned_at?: string;
}

export interface CustomerFranchise {
  id: string;
  customer_id: string;
  franchise_id: string;
  loyalty_points: number;
  tier: string;
  total_spent: number;
  total_orders: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchCustomerFranchisesPayload {
  searchCondition: {
    franchise_id?: string;
    customer_id?: string;
  };
  pageInfo: {
    pageNum: number;
    pageSize: number;
  };
}

export interface SearchCustomerFranchisesResponse {
  success: boolean;
  data: CustomerFranchise[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const clientService = {
  // CLIENT-01 — Get All Franchises
  // GET /api/clients/franchises  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getAllFranchises: async (): Promise<ClientFranchiseItem[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ClientFranchiseItem[];
    }>("/clients/franchises");
    return response.data.data;
  },

  // CLIENT-02 — Get All Categories By Franchise
  // GET /api/clients/franchises/:franchiseId/categories  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getCategoriesByFranchise: async (franchiseId: string): Promise<ClientCategoryByFranchiseItem[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ClientCategoryByFranchiseItem[];
    }>(`/clients/franchises/${franchiseId}/categories`);
    return response.data.data;
  },

  // CLIENT-04 — Get Products by Franchise and Category
  // GET /api/clients/products?franchiseId=&categoryId=  |  Role: CUSTOMER PUBLIC  |  Token: NO
  // NOTE: franchiseId is required, categoryId is optional
  getProductsByFranchiseAndCategory: async (
    franchiseId: string,
    categoryId?: string,
  ): Promise<ClientProductListItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: ClientProductListItem[] }>(
      "/clients/products",
      { params: { franchiseId, ...(categoryId ? { categoryId } : {}) } },
    );
    return response.data.data;
  },

  // CLIENT-05 — Get Product Detail
  // GET /api/clients/franchises/:franchiseId/products/:productId  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getProductDetail: async (franchiseId: string, productId: string): Promise<ClientProductDetailResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ClientProductDetailResponse }>(
      `/clients/franchises/${franchiseId}/products/${productId}`,
    );
    return response.data.data;
  },

  // Get Topping Products by Franchise
  // Fetch products from "Topping" category for a specific franchise
  getToppingsByFranchise: async (franchiseId: string): Promise<ClientProductListItem[]> => {
    try {
      // First, get all categories to find "Topping" category ID
      const categories = await clientService.getCategoriesByFranchise(franchiseId);
      const norm = (s: string) =>
        s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      const toppingCategory = categories.find((cat) => norm(cat.category_name).includes("topping"));

      if (!toppingCategory) {
        console.warn("Topping category not found for franchise:", franchiseId);
        return [];
      }

      // Then fetch products from that category
      const products = await clientService.getProductsByFranchiseAndCategory(
        franchiseId,
        toppingCategory.category_id
      );

      return products;
    } catch (error) {
      console.error("Failed to fetch toppings:", error);
      return [];
    }
  },

  // ==================== LOYALTY APIs ====================

  // Get Loyalty Rule by Franchise
  // GET /api/clients/franchises/:franchiseId/loyalty-rule  |  Role: CUSTOMER PUBLIC  |  Token: NO
  // Returns loyalty tier rules for a specific franchise
  getLoyaltyRuleByFranchise: async (franchiseId: string): Promise<LoyaltyRule[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: unknown }>(
        `/clients/franchises/${franchiseId}/loyalty-rule`
      );
      const payload = response.data?.data as unknown;

      if (Array.isArray(payload)) {
        return payload as LoyaltyRule[];
      }

      if (payload && typeof payload === "object") {
        const boxed = payload as Record<string, unknown>;

        if (Array.isArray(boxed.data)) {
          return boxed.data as LoyaltyRule[];
        }

        if (Array.isArray(boxed.items)) {
          return boxed.items as LoyaltyRule[];
        }

        if (Array.isArray(boxed.rules)) {
          return boxed.rules as LoyaltyRule[];
        }

        if ("tier_name" in boxed || "min_points" in boxed) {
          return [boxed as unknown as LoyaltyRule];
        }
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch loyalty rules:", error);
      return [];
    }
  },

  // Get Customer Loyalty by Franchise
  // GET /api/clients/franchises/:franchiseId/customer-loyalty  |  Role: CUSTOMER  |  Token: YES
  // Returns customer's loyalty points, tier, and membership info
  getCustomerLoyaltyByFranchise: async (franchiseId: string): Promise<CustomerLoyalty | null> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: CustomerLoyalty }>(
        `/clients/franchises/${franchiseId}/customer-loyalty`
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch customer loyalty:", error);
      return null;
    }
  },

  // Search Customer-Franchise Relationships
  // POST /api/customer-franchises/search  |  Role: CUSTOMER/ADMIN  |  Token: YES
  // Search customer-franchise relationships with pagination
  searchCustomerFranchises: async (
    payload: SearchCustomerFranchisesPayload
  ): Promise<SearchCustomerFranchisesResponse> => {
    try {
      const response = await apiClient.post<SearchCustomerFranchisesResponse>(
        "/customer-franchises/search",
        payload
      );
      return response.data;
    } catch (error) {
      console.error("Failed to search customer franchises:", error);
      return {
        success: false,
        data: [],
        pageInfo: {
          pageNum: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }
  },

  // Get Customer-Franchise by ID
  // GET /api/customer-franchises/:id  |  Role: CUSTOMER/ADMIN  |  Token: YES
  getCustomerFranchiseById: async (id: string): Promise<CustomerFranchise | null> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: CustomerFranchise }>(
        `/customer-franchises/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch customer franchise:", error);
      return null;
    }
  },
};
