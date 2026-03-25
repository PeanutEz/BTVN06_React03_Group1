/**
 * Cart API client — real API, liên kết Order: Checkout Cart tạo đơn → Get Order by CartId.
 */
import apiClient from "@/services/api.client";

type ApiResponse<T> = { success: boolean; data: T };

export type CartStatus = string;

export interface CartItemOption {
  product_franchise_id: string;
  quantity: number;
  // Extra fields API may return
  name?: string;
  product_name?: string;
  product_name_snapshot?: string;
  image_url?: string;
  product_image_url?: string;
  price?: number;
  price_snapshot?: number;
  final_price?: number;
  [key: string]: unknown;
}

export interface AddToCartCustomerBody {
  franchise_id: string;
  product_franchise_id: string;
  quantity: number;
  address?: string;
  phone?: string;
  note?: string;
  message?: string;
  options?: CartItemOption[];
}

export interface AddToCartStaffBody extends AddToCartCustomerBody {
  customer_id: string;
}

export interface UpdateCartBody {
  address?: string;
  phone?: string;
  message?: string;
  payment_method?: string;
  bank_name?: string;
}

export interface UpdateCartItemBody {
  cart_item_id: string;
  quantity: number;
}

export interface UpdateOptionBody {
  cart_item_id: string;
  option_product_franchise_id: string;
  quantity: number;
}

export interface UpdateOptionsCartItemBody {
  cart_item_id: string;
  options: CartItemOption[];
}

export interface RemoveOptionBody {
  cart_item_id: string;
  option_product_franchise_id: string;
}

export interface ApiCartItem {
  _id?: string;
  id?: string;
  cart_item_id?: string;
  product_franchise_id?: string;
  product_id?: string;
  product_name?: string;
  product_name_snapshot?: string;
  name?: string;
  image_url?: string;
  product_image_url?: string;
  product_cart_price?: number;
  price_snapshot?: number;
  price?: number;
  size?: string;
  quantity?: number;
  line_total?: number;
  final_line_total?: number;
  note?: string;
  options?: CartItemOption[];
  [key: string]: unknown;
}

export interface CartApiData {
  _id?: string;
  id?: string;
  franchise_id?: string;
  franchise_name?: string;
  customer_id?: string;
  status?: string;
  items?: ApiCartItem[];
  cart_items?: ApiCartItem[];
  subtotal_amount?: number;
  promotion_discount?: number;
  promotion_type?: string;
  promotion_value?: number;
  promotion_id?: string;
  voucher_discount?: number;
  voucher_type?: string;
  voucher_value?: number;
  voucher_percent?: number;
  voucher_discount_percent?: number;
  loyalty_points_used?: number;
  loyalty_discount?: number;
  final_amount?: number;
  voucher?: string;
  [key: string]: unknown;
}

export type CustomerCartEntry = {
  cartId: string;
  franchise_id?: string;
  franchise_name?: string;
};

export function normalizeCustomerCarts(raw: unknown): CartApiData[] {
  const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const dataList = rawObj?.data;
  const cartsList = rawObj?.carts;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(dataList)
      ? dataList
      : Array.isArray(cartsList)
        ? cartsList
        : [];

  return list.filter((item): item is CartApiData => !!item && typeof item === "object");
}

export function toCustomerCartEntry(cart: CartApiData): CustomerCartEntry | null {
  const cartId = String(cart._id ?? cart.id ?? "");
  if (!cartId) return null;

  const raw = cart as Record<string, unknown>;
  const franchise =
    raw.franchise && typeof raw.franchise === "object"
      ? (raw.franchise as Record<string, unknown>)
      : null;

  return {
    cartId,
    franchise_id: cart.franchise_id,
    franchise_name:
      cart.franchise_name ??
      (typeof franchise?.name === "string" ? franchise.name : undefined),
  };
}

export function getCartItems(cart: CartApiData | null | undefined): ApiCartItem[] {
  if (!cart) return [];
  if (Array.isArray(cart.items) && cart.items.length > 0) return cart.items;
  if (Array.isArray(cart.cart_items) && cart.cart_items.length > 0) return cart.cart_items;
  if (Array.isArray(cart.items)) return cart.items;
  if (Array.isArray(cart.cart_items)) return cart.cart_items;
  return [];
}

export function getCartItemId(item: ApiCartItem): string | undefined {
  const raw = item as Record<string, unknown>;
  const resolved = raw.cart_item_id ?? raw._id ?? raw.id;
  return resolved == null ? undefined : String(resolved);
}

export function getCartItemProductId(item: ApiCartItem): string | undefined {
  const raw = item as Record<string, unknown>;
  const product =
    raw.product && typeof raw.product === "object"
      ? (raw.product as Record<string, unknown>)
      : null;

  const resolved =
    raw.product_id ??
    raw.productId ??
    product?._id ??
    product?.id ??
    product?.product_id;

  return resolved == null ? undefined : String(resolved).trim() || undefined;
}

export function getCartItemName(item: ApiCartItem): string {
  const raw = item as Record<string, unknown>;
  const product =
    raw.product && typeof raw.product === "object"
      ? (raw.product as Record<string, unknown>)
      : null;

  const resolved =
    raw.product_name_snapshot ??
    raw.product_name ??
    raw.name ??
    raw.productName ??
    product?.name ??
    product?.product_name;

  return String(resolved ?? "").trim() || "Sản phẩm";
}

export function getCartItemImage(item: ApiCartItem): string {
  const raw = item as Record<string, unknown>;
  const product =
    raw.product && typeof raw.product === "object"
      ? (raw.product as Record<string, unknown>)
      : null;

  return String(
    raw.product_image_url ??
    raw.image_url ??
    raw.image ??
    product?.image_url ??
    product?.image ??
    "",
  ).trim();
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function normalizeSizeLabel(raw: string) {
  const size = raw.trim();
  if (!size) return "";
  if (/^size\s+/i.test(size)) return size;
  if (/^(s|m|l|xl|xxl)$/i.test(size)) return size.toUpperCase();
  return size;
}

export function getCartItemSize(item: ApiCartItem): string | undefined {
  const raw = item as Record<string, unknown>;
  const product =
    raw.product && typeof raw.product === "object"
      ? (raw.product as Record<string, unknown>)
      : null;
  const options =
    raw.options && typeof raw.options === "object"
      ? (raw.options as Record<string, unknown>)
      : null;

  const direct = firstNonEmptyString(
    raw.size,
    raw.size_snapshot,
    raw.option_size,
    raw.size_name,
    raw.size_label,
    raw.variant_size,
    product?.size,
    product?.size_name,
    product?.size_label,
    options?.size,
    options?.size_name,
    options?.size_label,
  );

  return direct ? normalizeSizeLabel(direct) : undefined;
}

export function getCartItemUnitPrice(item: ApiCartItem): number {
  const raw = item as Record<string, unknown>;
  const qty = Math.max(1, Number(raw.quantity ?? item.quantity ?? 1) || 1);
  const derivedFromLine =
    Number(raw.final_line_total ?? raw.line_total ?? item.final_line_total ?? item.line_total);
  if (Number.isFinite(derivedFromLine) && derivedFromLine > 0) {
    return derivedFromLine / qty;
  }

  const direct =
    Number(
      raw.product_cart_price ??
      raw.price_snapshot ??
      raw.price ??
      item.product_cart_price ??
      item.price_snapshot ??
      item.price,
    );

  return Number.isFinite(direct) && direct > 0 ? direct : 0;
}

export function getCartItemLineTotal(item: ApiCartItem): number {
  const raw = item as Record<string, unknown>;
  const direct = Number(raw.final_line_total ?? raw.line_total ?? item.final_line_total ?? item.line_total);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return getCartItemUnitPrice(item) * Math.max(1, item.quantity ?? 1);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export interface CartPricingSummary {
  subtotalAmount: number;
  promotionDiscount: number;
  promotionType?: string;
  promotionValue?: number;
  voucherDiscount: number;
  voucherType?: string;
  voucherValue?: number;
  voucherPercent?: number;
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  totalDiscount: number;
  finalAmount: number;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export function formatDiscountTypeText(type?: string, value?: number): string {
  const rawType = String(type ?? "").trim().toUpperCase();
  const parsedValue = toFiniteNumber(value) ?? 0;
  if (!rawType) return "";

  if (rawType.includes("PERCENT") || rawType.includes("%")) {
    return parsedValue > 0 ? ` (${parsedValue}%)` : " (%)";
  }

  if (parsedValue > 0) {
    return ` (${currencyFormatter.format(parsedValue)})`;
  }

  return "";
}

export function getCartPricingSummary(
  cart: CartApiData | null | undefined,
  fallbackSubtotal = 0,
): CartPricingSummary {
  const subtotalAmount = toFiniteNumber(cart?.subtotal_amount) ?? Math.max(0, fallbackSubtotal);
  const promotionDiscount = Math.max(0, toFiniteNumber(cart?.promotion_discount) ?? 0);
  const voucherDiscount = Math.max(0, toFiniteNumber(cart?.voucher_discount) ?? 0);
  const loyaltyDiscount = Math.max(0, toFiniteNumber(cart?.loyalty_discount) ?? 0);
  const loyaltyPointsUsed = Math.max(0, toFiniteNumber(cart?.loyalty_points_used) ?? 0);
  const promotionValue = toFiniteNumber(cart?.promotion_value);
  const rawVoucherPercent =
    toFiniteNumber(cart?.voucher_percent) ??
    toFiniteNumber(cart?.voucher_discount_percent);
  const voucherPercent =
    rawVoucherPercent != null && rawVoucherPercent > 0 ? rawVoucherPercent : undefined;
  const totalDiscount = promotionDiscount + voucherDiscount + loyaltyDiscount;
  const finalAmount =
    toFiniteNumber(cart?.final_amount) ?? Math.max(0, subtotalAmount - totalDiscount);

  return {
    subtotalAmount,
    promotionDiscount,
    promotionType:
      typeof cart?.promotion_type === "string" ? cart.promotion_type : undefined,
    promotionValue,
    voucherDiscount,
    voucherType: typeof cart?.voucher_type === "string" ? cart.voucher_type : undefined,
    voucherValue: toFiniteNumber(cart?.voucher_value),
    voucherPercent,
    loyaltyPointsUsed,
    loyaltyDiscount,
    totalDiscount,
    finalAmount,
  };
}

export const cartClient = {
  addProduct: async (body: AddToCartCustomerBody): Promise<CartApiData> => {
    const response = await apiClient.post<ApiResponse<CartApiData>>("/carts/items", body);
    return response.data.data ?? {};
  },

  addProductStaff: async (body: AddToCartStaffBody): Promise<CartApiData> => {
    const response = await apiClient.post<ApiResponse<CartApiData>>(
      "/carts/items/staff",
      body
    );
    return response.data.data ?? {};
  },

  getCartsByCustomerId: async (
    customerId: string,
    params?: { status?: CartStatus }
  ): Promise<CartApiData[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>(
      `/carts/customer/${customerId}`,
      { params: params?.status ? { status: params.status } : {} }
    );
    return normalizeCustomerCarts(response.data.data);
  },

  getCartDetail: async (cartId: string): Promise<CartApiData | null> => {
    const response = await apiClient.get<ApiResponse<CartApiData>>(`/carts/${cartId}`);
    return response.data.data ?? null;
  },

  countCartByCustomerId: async (
    customerId: string,
    params?: { status?: CartStatus }
  ): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>(
      `/carts/customer/${customerId}/count-cart`,
      { params: params?.status ? { status: params.status } : {} }
    );
    return response.data.data ?? 0;
  },

  countCartItemByCartId: async (cartId: string): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>(
      `/carts/${cartId}/count-cart-item`
    );
    return response.data.data ?? 0;
  },

  updateCart: async (cartId: string, body: UpdateCartBody): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(`/carts/${cartId}`, body);
    return response.data.data;
  },

  updateCartItemQuantity: async (body: UpdateCartItemBody): Promise<unknown> => {
    const response = await apiClient.patch<ApiResponse<unknown>>(
      "/carts/items/update-cart-item",
      body
    );
    return response.data.data;
  },

  deleteCartItem: async (cartItemId: string): Promise<void> => {
    await apiClient.delete(`/carts/items/${cartItemId}`);
  },

  updateOption: async (body: UpdateOptionBody): Promise<unknown> => {
    const response = await apiClient.patch<ApiResponse<unknown>>(
      "/carts/items/update-option",
      body
    );
    return response.data.data;
  },

  updateOptionsCartItem: async (body: UpdateOptionsCartItemBody): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(
      "/carts/items/update-options-cart-item",
      body
    );
    return response.data.data;
  },

  removeOption: async (body: RemoveOptionBody): Promise<unknown> => {
    const response = await apiClient.patch<ApiResponse<unknown>>(
      "/carts/items/remove-option",
      body
    );
    return response.data.data;
  },

  applyVoucher: async (cartId: string, voucherCode: string): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(
      `/carts/${cartId}/apply-voucher`,
      { voucher_code: voucherCode }
    );
    return response.data.data;
  },

  removeVoucher: async (cartId: string): Promise<void> => {
    await apiClient.delete(`/carts/${cartId}/remove-voucher`);
  },

  checkoutCart: async (
    cartId: string,
    body?: { payment_method?: string; bank_name?: string }
  ): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(
      `/carts/${cartId}/checkout`,
      body ?? {}
    );
    return response.data.data;
  },

  cancelCart: async (cartId: string): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(
      `/carts/${cartId}/cancel`
    );
    return response.data.data;
  },
};
