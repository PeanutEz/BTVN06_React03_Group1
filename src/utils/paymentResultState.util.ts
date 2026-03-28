export type PaymentResultReason = "failed" | "cancelled" | "refunded";

function normalizeStatus(value?: string): string {
  return String(value ?? "").trim().toUpperCase();
}

export function resolvePaymentResultReason(
  orderStatus?: string,
  paymentStatus?: string,
  preferredReason?: string,
): PaymentResultReason | null {
  if (
    preferredReason === "failed" ||
    preferredReason === "cancelled" ||
    preferredReason === "refunded"
  ) {
    return preferredReason;
  }

  const normalizedOrderStatus = normalizeStatus(orderStatus);
  const normalizedPaymentStatus = normalizeStatus(paymentStatus);

  if (normalizedPaymentStatus.includes("REFUND")) {
    return "refunded";
  }

  if (
    normalizedOrderStatus === "CANCELLED" ||
    normalizedOrderStatus.includes("CANCEL") ||
    normalizedPaymentStatus === "CANCELLED"
  ) {
    return "cancelled";
  }

  if (normalizedPaymentStatus === "FAILED") {
    return "failed";
  }

  return null;
}

export function getPaymentResultActionLabel(reason: PaymentResultReason | null): string {
  switch (reason) {
    case "refunded":
      return "Đã hủy và hoàn tiền";
    case "cancelled":
      return "Đơn đã hủy";
    case "failed":
      return "Thanh toán thất bại";
    default:
      return "Thanh toán thành công";
  }
}
