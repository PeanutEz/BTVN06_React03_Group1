/**
 * Cart API client — real API, liên kết Order: Checkout Cart tạo đơn → Get Order by CartId.
 */
import apiClient from "@/services/api.client";

type ApiResponse<T> = { success: boolean; data: T };

export type CartStatus = string;

export interface CartItemOption {
  product_franchise_id: string;
  quantity: number;
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

export interface RemoveOptionBody {
  cart_item_id: string;
  option_product_franchise_id: string;
}

export interface ApiCartItem {
  _id?: string;
  id?: string;
  product_franchise_id?: string;
  product_id?: string;
  product_name_snapshot?: string;
  name?: string;
  image_url?: string;
  price_snapshot?: number;
  price?: number;
  size?: string;
  quantity?: number;
  line_total?: number;
  note?: string;
  options?: CartItemOption[];
  [key: string]: unknown;
}

export interface CartApiData {
  _id?: string;
  id?: string;
  franchise_id?: string;
  customer_id?: string;
  status?: string;
  items?: ApiCartItem[];
  total_amount?: number;
  [key: string]: unknown;
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
  ): Promise<unknown[]> => {
    const response = await apiClient.get<ApiResponse<unknown[]>>(
      `/carts/customer/${customerId}`,
      { params: params?.status ? { status: params.status } : {} }
    );
    return response.data.data ?? [];
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

  checkoutCart: async (cartId: string): Promise<unknown> => {
    const response = await apiClient.put<ApiResponse<unknown>>(
      `/carts/${cartId}/checkout`
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
