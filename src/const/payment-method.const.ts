/**
 * Payment method constants
 * Single source of truth for payment method values
 */
export const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK: "BANK",
} as const;

export const PAYMENT_METHOD_OPTIONS = [PAYMENT_METHODS.CASH, PAYMENT_METHODS.BANK] as const;

export type PaymentMethodType = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

/**
 * Helper function to check if a value is a valid payment method
 */
export function isValidPaymentMethod(value: unknown): value is PaymentMethodType {
  return Object.values(PAYMENT_METHODS).includes(value as PaymentMethodType);
}
