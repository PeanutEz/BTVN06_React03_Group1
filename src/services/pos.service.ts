/**
 * POS Service - Tổng hợp tất cả APIs cần thiết cho POS System
 * Sử dụng các service có sẵn và bổ sung APIs còn thiếu
 */

import apiClient from "./api.client";
import { cartClient } from "./cart.client";
import type { CartApiData, AddToCartStaffBody, UpdateCartBody } from "./cart.client";
import type { ApiCustomer } from "./customer.service";
import type { OrderDisplay as ApiOrder } from "../models/order.model";
import type { PaymentData as ApiPayment } from "./payment.client";

// ==================== Type Definitions ====================

export interface POSCustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
  is_active: boolean;
}

export interface POSProductFranchise {
  id: string;
  product_id: string;
  franchise_id: string;
  product_name: string;
  product_description?: string;
  product_image_url?: string;
  size: string;
  price_base: number;
  is_have_topping?: boolean;
  category_name?: string;
  is_active: boolean;
}

export interface POSPromotion {
  id: string;
  name: string;
  franchise_id: string;
  type: "PERCENT" | "FIXED";
  value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface POSAddProductBody {
  customer_id: string;
  franchise_id: string;
  product_franchise_id: string;
  quantity: number;
  note?: string;
  options?: Array<{
    product_franchise_id: string;
    quantity: number;
  }>;
}

export interface POSBulkAddProductsBody {
  customer_id: string;
  franchise_id: string;
  items: Array<{
    product_franchise_id: string;
    quantity: number;
    note?: string;
    options?: Array<{
      product_franchise_id: string;
      quantity: number;
    }>;
  }>;
}

export interface POSCheckoutBody {
  address?: string;
  phone?: string;
  message?: string;
}

export interface POSConfirmPaymentBody {
  method: "CASH" | "CARD" | "QR";
  providerTxnId?: string;
}

export interface POSOrderStatusBody {
  staff_id?: string;
}

// ==================== POS Service ====================

export const posService = {
  // ============ STEP 1: Customer Management ============

  /**
   * Search customer by phone or name
   * API: GET /api/customers/find?keyword=xxx
   */
  searchCustomer: async (keyword: string): Promise<POSCustomerSearchResult[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiCustomer[];
    }>(`/customers/find`, {
      params: { keyword },
    });

    return (response.data.data || []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      avatar_url: c.avatar_url,
      loyalty_points: (c as any).loyalty_points,
      loyalty_tier: (c as any).loyalty_tier,
      is_active: c.is_active,
    }));
  },

  /**
   * Create new customer quickly
   * API: POST /api/customers
   */
  createCustomer: async (data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    address?: string;
  }): Promise<ApiCustomer> => {
    const response = await apiClient.post<{
      success: boolean;
      data: ApiCustomer;
    }>("/customers", {
      name: data.name,
      phone: data.phone,
      email: data.email || `${data.phone}@temp.local`,
      password: data.password || "123456",
      address: data.address || "",
    });

    return response.data.data;
  },

  /**
   * Get customer detail
   * API: GET /api/customers/:id
   */
  getCustomerDetail: async (customerId: string): Promise<ApiCustomer> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiCustomer;
    }>(`/customers/${customerId}`);

    return response.data.data;
  },

  // ============ STEP 2: Product Menu ============

  /**
   * Get products by franchise
   * API: GET /api/product-franchises/franchise/:franchiseId?onlyActive=true
   */
  getProductsByFranchise: async (
    franchiseId: string,
    onlyActive = true
  ): Promise<POSProductFranchise[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
    }>(`/product-franchises/franchise/${franchiseId}`, {
      params: onlyActive ? { onlyActive: "true" } : {},
    });

    return (response.data.data || []).map((pf: any) => ({
      id: pf.id || pf._id,
      product_id: pf.product_id || pf.product?._id || pf.product?.id,
      franchise_id: pf.franchise_id,
      product_name: pf.product_name || pf.product?.name || "Unknown Product",
      product_description: pf.product?.description || pf.product_description,
      product_image_url: pf.product?.image_url || pf.product_image_url,
      size: pf.size || "DEFAULT",
      price_base: pf.price_base || 0,
      is_have_topping: pf.product?.is_have_topping || pf.is_have_topping,
      category_name: pf.category?.name || pf.category_name,
      is_active: pf.is_active !== false,
    }));
  },

  /**
   * Get product detail
   * API: GET /api/products/:id
   */
  getProductDetail: async (productId: string): Promise<any> => {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
    }>(`/products/${productId}`);

    return response.data.data;
  },

  // ============ STEP 3: Add to Cart ============

  /**
   * Add single product to cart (Staff mode)
   * API: POST /api/carts/items/staff
   */
  addProductToCart: async (body: POSAddProductBody): Promise<CartApiData> => {
    return cartClient.addProductStaff(body as AddToCartStaffBody);
  },

  /**
   * Add multiple products to cart (Bulk)
   * API: POST /api/carts/items/staff-bulk
   */
  addBulkProductsToCart: async (
    body: POSBulkAddProductsBody
  ): Promise<CartApiData> => {
    const response = await apiClient.post<{
      success: boolean;
      data: CartApiData;
    }>("/carts/items/staff-bulk", body);

    return response.data.data;
  },

  // ============ STEP 4: Review Cart ============

  /**
   * Get active cart by customer ID
   * API: GET /api/carts/customer/:customerId?status=ACTIVE
   */
  getActiveCart: async (customerId: string): Promise<CartApiData | null> => {
    const carts = await cartClient.getCartsByCustomerId(customerId, {
      status: "ACTIVE",
    });
    return carts && carts.length > 0 ? carts[0] : null;
  },

  /**
   * Get cart detail
   * API: GET /api/carts/:cartId
   */
  getCartDetail: async (cartId: string): Promise<CartApiData | null> => {
    return cartClient.getCartDetail(cartId);
  },

  /**
   * Count cart items
   * API: GET /api/carts/:cartId/count-cart-item
   */
  countCartItems: async (cartId: string): Promise<number> => {
    return cartClient.countCartItemByCartId(cartId);
  },

  /**
   * Update cart item quantity
   * API: PATCH /api/carts/items/update-cart-item
   */
  updateCartItemQuantity: async (
    cartItemId: string,
    quantity: number
  ): Promise<void> => {
    await cartClient.updateCartItemQuantity({ cart_item_id: cartItemId, quantity });
  },

  /**
   * Delete cart item
   * API: DELETE /api/carts/items/:cartItemId
   */
  deleteCartItem: async (cartItemId: string): Promise<void> => {
    await cartClient.deleteCartItem(cartItemId);
  },

  /**
   * Update cart item options
   * API: PUT /api/carts/items/update-options-cart-item
   */
  updateCartItemOptions: async (
    cartItemId: string,
    options: Array<{ product_franchise_id: string; quantity: number }>
  ): Promise<void> => {
    await cartClient.updateOptionsCartItem({ cart_item_id: cartItemId, options });
  },

  // ============ STEP 5: Promotions ============

  /**
   * Get active promotions by franchise
   * API: GET /api/promotions/franchise/:franchiseId
   */
  getPromotionsByFranchise: async (
    franchiseId: string
  ): Promise<POSPromotion[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
    }>(`/promotions/franchise/${franchiseId}`);

    return (response.data.data || [])
      .filter((p: any) => p.is_active && !p.is_deleted)
      .map((p: any) => ({
        id: p.id || p._id,
        name: p.name,
        franchise_id: p.franchise_id,
        type: p.type,
        value: p.value,
        start_date: p.start_date,
        end_date: p.end_date,
        is_active: p.is_active,
      }));
  },

  // ============ STEP 6: Checkout ============

  /**
   * Update cart info before checkout
   * API: PUT /api/carts/:cartId
   */
  updateCartInfo: async (
    cartId: string,
    body: UpdateCartBody
  ): Promise<void> => {
    await cartClient.updateCart(cartId, body);
  },

  /**
   * Checkout cart
   * API: PUT /api/carts/:cartId/checkout
   */
  checkoutCart: async (
    cartId: string,
    body: POSCheckoutBody
  ): Promise<any> => {
    return cartClient.checkoutCart(cartId, body);
  },

  /**
   * Get order by cart ID
   * API: GET /api/orders/cart/:cartId
   */
  getOrderByCartId: async (cartId: string): Promise<ApiOrder | null> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiOrder;
    }>(`/orders/cart/${cartId}`);

    return response.data.data || null;
  },

  // ============ STEP 7: Payment ============

  /**
   * Get payment by order ID
   * API: GET /api/payments/order/:orderId
   */
  getPaymentByOrderId: async (orderId: string): Promise<ApiPayment | null> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiPayment;
    }>(`/payments/order/${orderId}`);

    return response.data.data || null;
  },

  /**
   * Confirm payment
   * API: PUT /api/payments/:paymentId/confirm
   */
  confirmPayment: async (
    paymentId: string,
    body: POSConfirmPaymentBody
  ): Promise<any> => {
    const response = await apiClient.put<{
      success: boolean;
      data: any;
    }>(`/payments/${paymentId}/confirm`, body);

    return response.data.data;
  },

  // ============ STEP 8: Order Processing ============

  /**
   * Get order detail
   * API: GET /api/orders/:orderId
   */
  getOrderDetail: async (orderId: string): Promise<ApiOrder | null> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiOrder;
    }>(`/orders/${orderId}`);

    return response.data.data || null;
  },

  /**
   * Change order status to PREPARING
   * API: PUT /api/orders/:orderId/preparing
   */
  setOrderPreparing: async (orderId: string): Promise<any> => {
    const response = await apiClient.put<{
      success: boolean;
      data: any;
    }>(`/orders/${orderId}/preparing`);

    return response.data.data;
  },

  /**
   * Change order status to READY_FOR_PICKUP
   * API: PUT /api/orders/:orderId/ready-for-pickup
   */
  setOrderReady: async (
    orderId: string,
    staffId?: string
  ): Promise<any> => {
    const response = await apiClient.put<{
      success: boolean;
      data: any;
    }>(`/orders/${orderId}/ready-for-pickup`, {
      staff_id: staffId,
    });

    return response.data.data;
  },

  /**
   * Get all orders by franchise
   * API: GET /api/orders/franchise/:franchiseId?status=xxx
   */
  getOrdersByFranchise: async (
    franchiseId: string,
    status?: string
  ): Promise<ApiOrder[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: ApiOrder[];
    }>(`/orders/franchise/${franchiseId}`, {
      params: status ? { status } : {},
    });

    return response.data.data || [];
  },

  // ============ BONUS: Cancel/Refund ============

  /**
   * Refund payment (Cancel order)
   * API: PUT /api/payments/:paymentId/refund
   */
  refundPayment: async (
    paymentId: string,
    reason: string
  ): Promise<any> => {
    const response = await apiClient.put<{
      success: boolean;
      data: any;
    }>(`/payments/${paymentId}/refund`, {
      refund_reason: reason,
    });

    return response.data.data;
  },
};
