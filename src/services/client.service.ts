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
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  franchise_id: string;
  franchise_code: string;
  franchise_name: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  loyalty_points: number;
  total_earned_points: number;
  first_order_date: string;
  last_order_date: string;
}

export interface ClientFranchiseDetail extends ClientFranchiseItem {
  address?: string;
  hotline?: string;
  phone?: string;
  logo_url?: string;
  opened_at?: string;
  closed_at?: string;
  map_script?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(source: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickBoolean(source: Record<string, unknown> | null, keys: string[]): boolean | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

type ClientProductSizeItem = ClientProductListItem["sizes"][number];

function normalizeClientProductSizes(
  ...sources: Array<Record<string, unknown> | null>
): ClientProductSizeItem[] {
  for (const source of sources) {
    if (!source) continue;

    const candidateKeys = [
      "sizes",
      "product_sizes",
      "product_franchises",
      "variants",
      "items",
    ];

    for (const key of candidateKeys) {
      const rawList = source[key];
      if (!Array.isArray(rawList)) continue;

      return rawList
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;

          const rawPrice = Number(item.price ?? item.price_base ?? 0);
          const normalized: ClientProductSizeItem = {
            product_franchise_id: String(
              item.product_franchise_id ?? item.id ?? item._id ?? "",
            ).trim(),
            size: String(item.size ?? item.name ?? item.label ?? "").trim(),
            price: Number.isFinite(rawPrice) ? rawPrice : 0,
            is_available:
              typeof item.is_available === "boolean"
                ? item.is_available
                : typeof item.isAvailable === "boolean"
                  ? item.isAvailable
                  : typeof item.available === "boolean"
                    ? item.available
                    : true,
          };

          return normalized;
        })
        .filter((entry): entry is ClientProductSizeItem => !!entry);
    }
  }

  return [];
}

function normalizeClientProductListItem(payload: unknown): ClientProductListItem | null {
  const root = asRecord(payload);
  if (!root) return null;

  const product = asRecord(root.product);
  const category = asRecord(root.category);
  const sizes = normalizeClientProductSizes(root, product);

  return {
    product_id: String(
      root.product_id ?? product?.id ?? product?._id ?? root.id ?? root._id ?? "",
    ).trim(),
    category_id: String(
      root.category_id ?? category?.id ?? category?._id ?? "",
    ).trim(),
    category_name: String(
      root.category_name ?? category?.name ?? "",
    ).trim(),
    category_display_order: Number(root.category_display_order ?? 0) || 0,
    product_display_order: Number(root.product_display_order ?? 0) || 0,
    SKU: String(root.SKU ?? product?.SKU ?? product?.sku ?? "").trim(),
    name: String(root.name ?? product?.name ?? "").trim(),
    description: String(root.description ?? product?.description ?? "").trim(),
    image_url: String(
      root.image_url ?? product?.image_url ?? product?.image ?? "",
    ).trim(),
    is_have_topping:
      typeof root.is_have_topping === "boolean"
        ? root.is_have_topping
        : typeof product?.is_have_topping === "boolean"
          ? (product.is_have_topping as boolean | null)
          : null,
    sizes,
  };
}

function normalizeClientProductDetail(
  payload: unknown,
): ClientProductDetailResponse {
  const root = asRecord(payload);
  const product = asRecord(root?.product);
  const category = asRecord(root?.category);

  return {
    product_id: String(
      root?.product_id ?? product?.id ?? product?._id ?? root?.id ?? root?._id ?? "",
    ).trim(),
    category_id: String(
      root?.category_id ?? category?.id ?? category?._id ?? "",
    ).trim(),
    category_name: String(root?.category_name ?? category?.name ?? "").trim(),
    SKU: String(root?.SKU ?? product?.SKU ?? product?.sku ?? "").trim(),
    name: String(root?.name ?? product?.name ?? "").trim(),
    description: String(root?.description ?? product?.description ?? "").trim(),
    content: String(root?.content ?? product?.content ?? "").trim(),
    image_url: String(
      root?.image_url ?? product?.image_url ?? product?.image ?? "",
    ).trim(),
    images_url: Array.isArray(root?.images_url)
      ? root.images_url.map((image) => String(image ?? "").trim()).filter(Boolean)
      : Array.isArray(product?.images_url)
        ? product.images_url
            .map((image) => String(image ?? "").trim())
            .filter(Boolean)
        : [],
    is_have_topping:
      typeof root?.is_have_topping === "boolean"
        ? root.is_have_topping
        : typeof product?.is_have_topping === "boolean"
          ? (product.is_have_topping as boolean | null)
          : null,
    sizes: normalizeClientProductSizes(root, product),
  };
}

function extractClientList(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const directCandidates = [
    payload,
    root?.data,
    root?.items,
    root?.results,
    root?.rows,
    root?.products,
    root?.categories,
    root?.franchises,
    root?.menu,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeClientFranchiseItem(
  payload: unknown,
): ClientFranchiseItem | null {
  const root = asRecord(payload);
  if (!root) return null;

  const id = String(root.id ?? root._id ?? "").trim();
  if (!id) return null;

  return {
    id,
    code: String(root.code ?? root.franchise_code ?? "").trim(),
    name: String(root.name ?? root.franchise_name ?? "").trim(),
  };
}

function normalizeClientCategoryItem(
  payload: unknown,
): ClientCategoryByFranchiseItem | null {
  const root = asRecord(payload);
  if (!root) return null;

  const categoryId = String(root.category_id ?? root.id ?? root._id ?? "").trim();
  if (!categoryId) return null;

  return {
    category_id: categoryId,
    category_name: String(root.category_name ?? root.name ?? "").trim(),
    category_code: String(root.category_code ?? root.code ?? "").trim(),
    franchise_id: String(root.franchise_id ?? "").trim(),
    franchise_name: String(root.franchise_name ?? "").trim(),
    franchise_code: String(root.franchise_code ?? "").trim(),
    display_order: Number(root.display_order ?? 0) || 0,
  };
}

function normalizeClientFranchiseDetail(payload: unknown): ClientFranchiseDetail {
  const root = asRecord(payload);
  const nested =
    asRecord(root?.franchise) ??
    asRecord(root?.item) ??
    asRecord(root?.data) ??
    root;

  return {
    id: String(
      nested?.id ??
      nested?._id ??
      root?.id ??
      root?._id ??
      "",
    ),
    code:
      pickString(nested, ["code", "franchise_code"]) ??
      pickString(root, ["code", "franchise_code"]) ??
      "",
    name:
      pickString(nested, ["name", "franchise_name", "title"]) ??
      pickString(root, ["name", "franchise_name", "title"]) ??
      "",
    address:
      pickString(nested, ["address", "full_address", "location"]) ??
      pickString(root, ["address", "full_address", "location"]),
    hotline:
      pickString(nested, ["hotline", "phone", "contact_phone"]) ??
      pickString(root, ["hotline", "phone", "contact_phone"]),
    phone:
      pickString(nested, ["phone", "hotline", "contact_phone"]) ??
      pickString(root, ["phone", "hotline", "contact_phone"]),
    logo_url:
      pickString(nested, ["logo_url", "logo", "image_url", "image"]) ??
      pickString(root, ["logo_url", "logo", "image_url", "image"]),
    opened_at:
      pickString(nested, ["opened_at", "open_at", "opening_time", "open_time"]) ??
      pickString(root, ["opened_at", "open_at", "opening_time", "open_time"]),
    closed_at:
      pickString(nested, ["closed_at", "close_at", "closing_time", "close_time"]) ??
      pickString(root, ["closed_at", "close_at", "closing_time", "close_time"]),
    map_script:
      pickString(nested, ["map_script", "map_embed", "map_url"]) ??
      pickString(root, ["map_script", "map_embed", "map_url"]),
    is_active:
      pickBoolean(nested, ["is_active", "active"]) ??
      pickBoolean(root, ["is_active", "active"]),
    is_deleted:
      pickBoolean(nested, ["is_deleted", "deleted"]) ??
      pickBoolean(root, ["is_deleted", "deleted"]),
    created_at:
      pickString(nested, ["created_at", "createdAt"]) ??
      pickString(root, ["created_at", "createdAt"]),
    updated_at:
      pickString(nested, ["updated_at", "updatedAt"]) ??
      pickString(root, ["updated_at", "updatedAt"]),
  };
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
      data: unknown;
    }>("/clients/franchises");
    return extractClientList(response.data.data)
      .map(normalizeClientFranchiseItem)
      .filter((item): item is ClientFranchiseItem => !!item);
  },

  // CLIENT-02 — Get All Categories By Franchise
  // GET /api/clients/franchises/:franchiseId/categories  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getCategoriesByFranchise: async (franchiseId: string): Promise<ClientCategoryByFranchiseItem[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: unknown;
    }>(`/clients/franchises/${franchiseId}/categories`);
    return extractClientList(response.data.data)
      .map(normalizeClientCategoryItem)
      .filter((item): item is ClientCategoryByFranchiseItem => !!item);
  },

  // CLIENT-03 - Get Franchise Detail
  // GET /api/clients/franchises/:franchiseId  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getFranchiseDetail: async (franchiseId: string): Promise<ClientFranchiseDetail> => {
    const response = await apiClient.get<{
      success: boolean;
      data: unknown;
    }>(`/clients/franchises/${franchiseId}`);
    return normalizeClientFranchiseDetail(response.data.data);
  },

  // CLIENT-04 — Get Menu by Franchise and Category
  // GET /api/clients/menu?franchiseId=&categoryId=  |  Role: CUSTOMER PUBLIC  |  Token: NO
  // NOTE: franchiseId is required, categoryId is optional
  getProductsByFranchiseAndCategory: async (
    franchiseId: string,
    categoryId?: string,
  ): Promise<ClientProductListItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: unknown }>(
      "/clients/products",
      { params: { franchiseId, ...(categoryId ? { categoryId } : {}) } },
    );

    const data = response.data.data;
    const list = Array.isArray(data)
      ? data
      : Array.isArray(asRecord(data)?.items)
        ? (asRecord(data)?.items as unknown[])
        : Array.isArray(asRecord(data)?.data)
          ? (asRecord(data)?.data as unknown[])
          : [];

    return list
      .map(normalizeClientProductListItem)
      .filter((item): item is ClientProductListItem => !!item);
  },

  // CLIENT-05 — Get Product Detail
  // GET /api/clients/franchises/:franchiseId/products/:productId  |  Role: CUSTOMER PUBLIC  |  Token: NO
  getProductDetail: async (franchiseId: string, productFranchiseId: string): Promise<ClientProductDetailResponse> => {
    const response = await apiClient.get<{ success: boolean; data: unknown }>(
      `/clients/franchises/${franchiseId}/products/${productFranchiseId}`,
    );
    return normalizeClientProductDetail(response.data.data);
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
