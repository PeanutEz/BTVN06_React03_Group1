import type { OrderDisplay, OrderStatus } from "@/models/order.model";
import type { PaymentData } from "@/services/payment.client";

const STORAGE_KEY = "menu_checkout_fallback_v1";
const MOCK_ORDER_PREFIX = "mock_order_";
const MOCK_PAYMENT_PREFIX = "mock_payment_";

type CheckoutPaymentMethod = "COD" | "CARD";

interface MockCheckoutItemInput {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface CreateMockCheckoutParams {
  cartId: string;
  franchiseName: string;
  customerName?: string;
  customerPhone?: string;
  subtotalAmount: number;
  finalAmount: number;
  paymentMethod: CheckoutPaymentMethod;
  items: MockCheckoutItemInput[];
}

interface MockCheckoutStorage {
  orders: OrderDisplay[];
  payments: PaymentData[];
}

interface MockCheckoutResult {
  order: OrderDisplay;
  payment: PaymentData;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStorage(): MockCheckoutStorage {
  if (!isBrowser()) return { orders: [], payments: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { orders: [], payments: [] };
    const parsed = JSON.parse(raw) as Partial<MockCheckoutStorage>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    return { orders: [], payments: [] };
  }
}

function writeStorage(data: MockCheckoutStorage): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeOrderCode(): string {
  const ts = Date.now().toString();
  return `MOCK${ts.slice(-8)}`;
}

function isMockOrderId(id?: string): boolean {
  return String(id ?? "").startsWith(MOCK_ORDER_PREFIX);
}

function isMockPaymentId(id?: string): boolean {
  return String(id ?? "").startsWith(MOCK_PAYMENT_PREFIX);
}

export function createMockCheckout(params: CreateMockCheckoutParams): MockCheckoutResult {
  const store = readStorage();
  const createdAt = nowIso();

  const orderId = makeId(MOCK_ORDER_PREFIX);
  const paymentId = makeId(MOCK_PAYMENT_PREFIX);

  const orderStatus: OrderStatus = "PENDING";
  const paymentStatus = params.paymentMethod === "COD" ? "UNPAID" : "PENDING";

  const order: OrderDisplay = {
    _id: orderId,
    id: orderId,
    code: makeOrderCode(),
    type: "ONLINE",
    status: orderStatus,
    customer_name: params.customerName,
    phone: params.customerPhone,
    franchise_name: params.franchiseName,
    total_amount: params.finalAmount,
    subtotal_amount: params.subtotalAmount,
    final_amount: params.finalAmount,
    created_at: createdAt,
    updated_at: createdAt,
    cart_id: params.cartId,
    order_items: params.items.map((item, index) => ({
      id: `${orderId}_item_${index + 1}`,
      order_id: orderId,
      product_name_snapshot: item.name,
      price_snapshot: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
  };

  const payment: PaymentData = {
    _id: paymentId,
    id: paymentId,
    order_id: orderId,
    method: params.paymentMethod,
    status: paymentStatus,
    amount: params.finalAmount,
    created_at: createdAt,
    updated_at: createdAt,
  };

  store.orders.unshift(order);
  store.payments.unshift(payment);
  writeStorage(store);

  return { order, payment };
}

export function getMockOrderById(orderId: string): OrderDisplay | null {
  const store = readStorage();
  return (
    store.orders.find((order) => String(order._id ?? order.id) === String(orderId)) ?? null
  );
}

export function getMockOrderByCartId(cartId: string): OrderDisplay | null {
  const store = readStorage();
  return (
    store.orders.find((order) => String((order as any).cart_id ?? "") === String(cartId)) ?? null
  );
}

export function getMockPaymentByOrderId(orderId: string): PaymentData | null {
  const store = readStorage();
  return (
    store.payments.find((payment) => String(payment.order_id ?? "") === String(orderId)) ?? null
  );
}

export function getMockPaymentById(paymentId: string): PaymentData | null {
  const store = readStorage();
  return (
    store.payments.find((payment) => String(payment._id ?? payment.id) === String(paymentId)) ?? null
  );
}

export function confirmMockPayment(
  paymentId: string,
  body: { method: string; providerTxnId?: string }
): PaymentData | null {
  const store = readStorage();
  const index = store.payments.findIndex(
    (payment) => String(payment._id ?? payment.id) === String(paymentId)
  );
  if (index === -1) return null;

  const current = store.payments[index];
  const next: PaymentData = {
    ...current,
    method: body.method || current.method,
    status: "PAID",
    provider_txn_id: body.providerTxnId || current.provider_txn_id,
    updated_at: nowIso(),
  };

  store.payments[index] = next;

  const orderIndex = store.orders.findIndex(
    (order) => String(order._id ?? order.id) === String(next.order_id ?? "")
  );
  if (orderIndex !== -1) {
    store.orders[orderIndex] = {
      ...store.orders[orderIndex],
      status: "CONFIRMED",
      updated_at: nowIso(),
    };
  }

  writeStorage(store);
  return next;
}

export function refundMockPayment(
  paymentId: string,
  body: { refund_reason: string }
): PaymentData | null {
  const store = readStorage();
  const index = store.payments.findIndex(
    (payment) => String(payment._id ?? payment.id) === String(paymentId)
  );
  if (index === -1) return null;

  const current = store.payments[index];
  const next: PaymentData = {
    ...current,
    status: "REFUNDED",
    refund_reason: body.refund_reason,
    updated_at: nowIso(),
  };

  store.payments[index] = next;

  const orderIndex = store.orders.findIndex(
    (order) => String(order._id ?? order.id) === String(next.order_id ?? "")
  );
  if (orderIndex !== -1) {
    store.orders[orderIndex] = {
      ...store.orders[orderIndex],
      status: "CANCELLED",
      cancelled_at: nowIso(),
      updated_at: nowIso(),
    };
  }

  writeStorage(store);
  return next;
}

export function shouldUseMockPaymentId(paymentId: string): boolean {
  return isMockPaymentId(paymentId);
}

export function shouldUseMockOrderId(orderId: string): boolean {
  return isMockOrderId(orderId);
}
