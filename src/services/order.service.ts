/**
 * Order Service for Admin Panel - REAL API Implementation
 * Replaces mock data with actual API calls via orderClient
 */
import type { OrderDisplay, OrderStatus, OrderType } from "../models/order.model";
import { orderClient } from "./order.client";

/**
 * Normalize order data from API to match UI expectations
 */
const normalizeOrder = (order: any): OrderDisplay => {
  // Backend uses order_items instead of items
  const items = order.order_items ?? order.items ?? [];

  // Use final_amount if total_amount is 0
  const totalAmount = order.total_amount || order.final_amount || order.subtotal_amount || 0;

  return {
    ...order,
    total_amount: totalAmount,
    items, // Normalize to items
    customer: {
      ...(order.customer ?? {}),
      name: order.customer?.name || order.customer_name || "N/A",
      phone: order.customer?.phone ?? order.phone,
      email: order.customer?.email ?? order.email,
    },
    franchise: order.franchise ?? {
      name: order.franchise_name ?? "N/A",
      code: order.franchise_code,
    },
  };
};

/**
 * Fetch all orders for a franchise
 * @param franchiseId - The franchise ID to get orders for
 */
export const fetchOrdersByFranchise = async (franchiseId: string): Promise<OrderDisplay[]> => {
  try {
    const orders = await orderClient.getOrdersByFranchiseId(franchiseId);
    return orders.map(normalizeOrder);
  } catch (error) {
    console.error("Error fetching orders by franchise:", error);
    return [];
  }
};

/**
 * Fetch all orders (for backwards compatibility - uses first franchise from user)
 * @deprecated Use fetchOrdersByFranchise with specific franchiseId instead
 */
export const fetchOrders = async (): Promise<OrderDisplay[]> => {
  // Try to get user's franchise ID from localStorage
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      const franchiseId = user?.roles?.[0]?.franchise_id;
      if (franchiseId) {
        return fetchOrdersByFranchise(franchiseId);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }

  // Fallback: return empty array if no franchise ID found
  console.warn("No franchise ID found in user data");
  return [];
};

/**
 * Fetch a single order by ID
 */
export const fetchOrderById = async (id: number | string): Promise<OrderDisplay | null> => {
  try {
    const order = await orderClient.getOrderById(id);
    if (!order) return null;
    console.log("📦 [Admin OrderService] Raw order from API:", order);
    const normalized = normalizeOrder(order);
    console.log("📦 [Admin OrderService] Normalized order:", normalized);
    return normalized;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return null;
  }
};

/**
 * Search orders by code or customer name
 * Note: API might not support text search, so we filter client-side
 */
export const searchOrders = async (query: string, franchiseId?: string): Promise<OrderDisplay[]> => {
  try {
    // First get all orders for the franchise
    let orders: OrderDisplay[] = [];

    if (franchiseId) {
      orders = await fetchOrdersByFranchise(franchiseId);
    } else {
      orders = await fetchOrders();
    }

    // Filter client-side by code or customer name
    const lowerQuery = query.toLowerCase();
    return orders.filter(
      (order) =>
        order.code?.toLowerCase().includes(lowerQuery) ||
        order.customer?.name?.toLowerCase().includes(lowerQuery) ||
        order.customer_name?.toLowerCase().includes(lowerQuery) ||
        order.customer?.phone?.includes(query) ||
        order.phone?.includes(query) ||
        order.customer?.email?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error("Error searching orders:", error);
    return [];
  }
};

/**
 * Filter orders by various criteria
 * Note: API might not support all filters, so we filter client-side
 */
export const filterOrders = async (
  status?: OrderStatus,
  type?: OrderType,
  franchiseId?: number | string,
  startDate?: string,
  endDate?: string
): Promise<OrderDisplay[]> => {
  try {
    // First get all orders
    let orders: OrderDisplay[] = [];

    if (franchiseId) {
      orders = await fetchOrdersByFranchise(String(franchiseId));
    } else {
      orders = await fetchOrders();
    }

    // Filter client-side
    return orders.filter((order) => {
      if (status && order.status !== status) return false;
      if (type && order.type !== type) return false;
      if (startDate && new Date(order.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(order.created_at) > new Date(endDate)) return false;
      return true;
    });
  } catch (error) {
    console.error("Error filtering orders:", error);
    return [];
  }
};

/**
 * Update order status to PREPARING
 */
export const updateOrderToPreparing = async (orderId: number | string): Promise<OrderDisplay | null> => {
  try {
    return await orderClient.setPreparing(orderId);
  } catch (error) {
    console.error("Error updating order to preparing:", error);
    return null;
  }
};

/**
 * Update order status to READY_FOR_PICKUP
 */
export const updateOrderToReadyForPickup = async (
  orderId: number | string,
  staffId?: string
): Promise<OrderDisplay | null> => {  try {
    const result = await orderClient.setReadyForPickup(orderId, staffId ? { staff_id: staffId } : undefined);
    return result.data;
  } catch (error) {
    console.error("Error updating order to ready for pickup:", error);
    return null;
  }
};

/**
 * Generic update order status function — maps every status to the correct PUT endpoint.
 * Throws on failure so the caller can show the API error message.
 */
export const updateOrderStatus = async (
  id: number | string,
  status: OrderStatus,
  changedBy?: number | string,
  _note?: string
): Promise<OrderDisplay | null> => {
  switch (status) {
    case "CONFIRMED":
      return await orderClient.setConfirmed(id);
    case "PREPARING":
      return await orderClient.setPreparing(id);    case "READY_FOR_PICKUP": {
      const result = await orderClient.setReadyForPickup(id, { staff_id: String(changedBy ?? "") });
      return result.data;
    }
    case "DELIVERING":
      return await orderClient.setDelivering(id);
    case "COMPLETED":
      return await orderClient.setCompleted(id);
    case "CANCELLED":
      return await orderClient.setCancelled(
        id,
        changedBy ? { cancelled_by: String(changedBy) } : undefined
      );
    default:
      console.warn(`Status ${status} không có endpoint tương ứng`);
      return await fetchOrderById(id);
  }
};

/**
 * Create a new order
 * Note: This might need to be implemented via cart checkout flow
 */
export const createOrder = async (_data: unknown): Promise<unknown> => {
  try {
    // Orders are typically created via cart checkout
    // This function is kept for backwards compatibility but might not be used
    console.warn("createOrder: Orders should be created via cart checkout flow");
    return null;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};
