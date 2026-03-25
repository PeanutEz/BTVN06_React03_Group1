type StoredOrderPaymentIntent = {
  paymentMethod?: string;
  bankName?: string;
  updatedAt: string;
};

const ORDER_PAYMENT_INTENT_STORAGE_KEY = "client_order_payment_intent_v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readOrderPaymentIntentMap(): Record<string, StoredOrderPaymentIntent> {
  if (!canUseStorage()) return {};

  const raw = window.localStorage.getItem(ORDER_PAYMENT_INTENT_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, StoredOrderPaymentIntent>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOrderPaymentIntentMap(
  value: Record<string, StoredOrderPaymentIntent>,
): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    ORDER_PAYMENT_INTENT_STORAGE_KEY,
    JSON.stringify(value),
  );
}

export function saveOrderPaymentIntent(
  orderId: string,
  paymentMethod?: string | null,
  bankName?: string | null,
): void {
  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) return;

  const map = readOrderPaymentIntentMap();
  map[normalizedOrderId] = {
    paymentMethod: String(paymentMethod ?? "").trim() || undefined,
    bankName: String(bankName ?? "").trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  writeOrderPaymentIntentMap(map);
}

export function getOrderPaymentIntent(
  orderId: string,
): StoredOrderPaymentIntent | null {
  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) return null;

  const map = readOrderPaymentIntentMap();
  return map[normalizedOrderId] ?? null;
}
