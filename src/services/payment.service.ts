import type {
  Payment,
} from "../models/payment.model";

import { mapPayment } from "../models/payment.model";
import { paymentClient } from "./payment.client";

/**
 * =============================
 * PAYMENT-01: Get Payment by OrderId
 * GET /api/payments/order/:orderId
 * =============================
 */
export const fetchPaymentByOrderId = async (
  orderId: string
): Promise<Payment | null> => {
  try {
    const res = await paymentClient.getPaymentByOrderId(orderId);
    return res ? mapPayment(res) : null;
  } catch (error) {
    console.error("Error fetchPaymentByOrderId:", error);
    return null;
  }
};


/**
 * =============================
 * PAYMENT-02: Get Payments by CustomerId
 * GET /api/payments/customer/:customerId
 * =============================
 */
export const fetchPaymentsByCustomer = async (
  customerId: string
): Promise<Payment[]> => {
  try {
    const res = await paymentClient.getPaymentsByCustomerId(customerId);
    return res.map(mapPayment);
  } catch (error) {
    console.error("Error fetchPaymentsByCustomer:", error);
    return [];
  }
};


/**
 * =============================
 * PAYMENT-03: Get Payment by Code
 * GET /api/payments/code?code=
 * =============================
 */
export const fetchPaymentByCode = async (
  code: string
): Promise<Payment | null> => {
  try {
    const res = await paymentClient.getPaymentByCode(code);
    return res ? mapPayment(res) : null;
  } catch (error) {
    console.error("Error fetchPaymentByCode:", error);
    return null;
  }
};


/**
 * =============================
 * PAYMENT-04: Get Payment by Id
 * GET /api/payments/:id
 * =============================
 */
export const fetchPaymentById = async (
  id: string
): Promise<Payment | null> => {
  try {
    const res = await paymentClient.getPaymentById(id);
    return res ? mapPayment(res) : null;
  } catch (error) {
    console.error("Error fetchPaymentById:", error);
    return null;
  }
};


/**
 * =============================
 * PAYMENT-05: Confirm Payment
 * PUT /api/payments/:id/confirm
 * =============================
 */
export const confirmPayment = async (
  id: string,
  method: string
): Promise<Payment | null> => {
  try {
    const res = await paymentClient.confirmPayment(id, {
      method,
    });
    return res ? mapPayment(res) : null;
  } catch (error) {
    console.error("Error confirmPayment:", error);
    return null;
  }
};


/**
 * =============================
 * PAYMENT-06: Refund Payment
 * PUT /api/payments/:id/refund
 * =============================
 */
export const refundPayment = async (
  id: string,
  reason: string
): Promise<Payment | null> => {
  try {
    const res = await paymentClient.refundPayment(id, {
      refund_reason: reason,
    });
    return res ? mapPayment(res) : null;
  } catch (error) {
    console.error("Error refundPayment:", error);
    return null;
  }
};