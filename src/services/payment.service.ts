import type { Payment, PaymentStatus, PaymentMethodType, PaymentLog } from "../models/payment.model";
import { fetchOrders } from "./order.service";

// Payment mapping từ Order
export const fetchPayments = async (): Promise<Payment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const orders = await fetchOrders();
  
  const payments = orders.map(order => ({
    id: order.id,
    order_id: order.id,
    order_code: order.code,
    franchise_id: order.franchise_id,
    franchise_name: order.franchise?.name,
    franchise_code: order.franchise?.code,
    customer_id: order.customer_id,
    customer_name: order.customer?.name,
    customer_phone: order.customer?.phone,
    method: order.type, // POS/ONLINE
    status: order.status,
    amount: order.total_amount,
    created_at: order.created_at,
    updated_at: order.updated_at,
    confirmed_at: order.confirmed_at,
    completed_at: order.completed_at,
    cancelled_at: order.cancelled_at,
  }));
  
  // Debug log
  console.log('[Payment Service] Fetched payments with franchise data:', 
    payments.map(p => ({ 
      id: p.id, 
      franchise_code: p.franchise_code, 
      franchise_name: p.franchise_name 
    }))
  );
  
  return payments;
};

export const fetchPaymentById = async (id: number): Promise<Payment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();
  return payments.find((payment) => payment.id === id) || null;
};

export const fetchPaymentByOrderId = async (orderId: number): Promise<Payment | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();
  return payments.find((payment) => payment.order_id === orderId) || null;
};

export const filterPayments = async (
  method?: PaymentMethodType,
  status?: PaymentStatus,
  franchiseId?: number,
  startDate?: string,
  endDate?: string
): Promise<Payment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payments = await fetchPayments();
  return payments.filter((payment) => {
    if (method && payment.method !== method) return false;
    if (status && payment.status !== status) return false;
    if (franchiseId && payment.franchise_id !== franchiseId) return false;
    if (startDate && new Date(payment.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(payment.created_at) > new Date(endDate)) return false;
    return true;
  });
};

export const updatePaymentStatus = async (
  id: number,
  status: PaymentStatus
): Promise<Payment | null> => {
  // Note: Payment status được quản lý thông qua Order status
  // Để cập nhật, cần cập nhật Order status thông qua order.service
  await new Promise((resolve) => setTimeout(resolve, 500));
  const payments = await fetchPayments();
  const payment = payments.find(p => p.id === id);
  if (!payment) return null;
  
  // Return updated payment with new status
  return {
    ...payment,
    status,
    updated_at: new Date().toISOString(),
  };
};
