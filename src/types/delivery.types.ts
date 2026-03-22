// ─── Delivery / Branch ordering types ───────────────────────────────────────

export type OrderMode = "DELIVERY" | "PICKUP";

// Order Status - Aligned with API Spec
// API Spec: PENDING → PREPARING → READY_FOR_PICKUP → DELIVERING → COMPLETED (+ CANCELLED)
// CONFIRMED kept for backward compatibility with existing flows
export type DeliveryOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"  // Changed from "READY" to match API spec
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

// Legacy alias for backward compatibility
export type OrderStatusLegacy = DeliveryOrderStatus | "READY";

export type PaymentMethod = "CASH" | "BANK" | "MOMO" | "ZALOPAY" | "SHOPEEPAY";
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface BranchOpeningHours {
  open: string;
  close: string;
  days: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  coord: GeoCoord;
  deliveryRadiusKm: number;
  baseDeliveryFee: number;
  extraFeePerKm: number;
  freeShippingThreshold: number;
  prepTimeMins: number;
  deliveryTimeMins: number;
  openingHours: BranchOpeningHours;
  imageUrl: string;
  isActive: boolean;
}

export interface AddressValidationResult {
  isValid: boolean;
  nearestBranch: Branch | null;
  distanceKm: number | null;
  estimatedDeliveryFee: number | null;
  message?: string;
}

export interface DeliveryAddress {
  rawAddress: string;
  coord: GeoCoord | null;
}

export interface AppliedPromo {
  code: string;
  label: string;
  discountAmount: number;
}

export interface PaymentTransaction {
  transactionId: string;
  provider: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  createdAt: string;
  paidAt?: string;
  bankName?: string;
  qrCodeUrl?: string;
  deeplink?: string;
  paymentUrl?: string;
  note?: string;
}

export interface PlacedOrder {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  mode: OrderMode;
  status: DeliveryOrderStatus;

  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  bankName?: string;
  transaction?: PaymentTransaction;

  promo?: AppliedPromo;
  vatAmount: number;
  items: OrderLineItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  note?: string;
  prepTimeMins: number;
  deliveryTimeMins: number;
  createdAt: string;
  statusUpdatedAt: string;
}

export interface OrderLineItem {
  cartKey: string;
  productId: number;
  name: string;
  image: string;
  options: {
    size: string;
    sugar: string;
    ice: string;
    toppings: { id: string; name: string; price: number }[];
    note?: string;
  };
  quantity: number;
  unitPrice: number;
}

export const ORDER_STATUS_CONFIG: Record<
  DeliveryOrderStatus,
  { label: string; color: string; bg: string; icon: string; description: string }
> = {
  PENDING:          { label: "Chờ xác nhận", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: "⏳", description: "Đơn hàng đang chờ cửa hàng xác nhận" },
  CONFIRMED:        { label: "Đã xác nhận", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "✅", description: "Cửa hàng đã nhận đơn, chuẩn bị pha chế" },
  PREPARING:        { label: "Đang pha chế", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: "☕", description: "Đồ uống đang được pha chế" },
  READY_FOR_PICKUP: { label: "Sẵn sàng lấy", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "🛍️", description: "Đơn hàng đã sẵn sàng, bạn có thể đến lấy" },
  DELIVERING:       { label: "Đang giao", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: "🛵", description: "Đơn hàng đang trên đường giao đến bạn" },
  COMPLETED:        { label: "Hoàn thành", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: "🎉", description: "Đơn hàng đã giao thành công!" },
  CANCELLED:        { label: "Đã huỷ", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "❌", description: "Đơn hàng đã bị huỷ" },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bg: string }
> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
  PENDING: { label: "Đang chờ thanh toán", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  PAID: { label: "Đã thanh toán", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  FAILED: { label: "Thanh toán thất bại", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  CANCELLED: { label: "Đã huỷ thanh toán", color: "text-gray-700", bg: "bg-gray-100 border-gray-200" },
};

// Status flow for delivery orders (API Spec aligned)
export const DELIVERY_STATUS_STEPS: DeliveryOrderStatus[] = [
  "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "DELIVERING", "COMPLETED",
];

// Status flow for pickup orders (API Spec aligned)
export const PICKUP_STATUS_STEPS: DeliveryOrderStatus[] = [
  "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED",
];

// Helper to normalize legacy "READY" status to "READY_FOR_PICKUP"
export function normalizeOrderStatus(status: string): DeliveryOrderStatus {
  if (status === "READY") return "READY_FOR_PICKUP";
  return status as DeliveryOrderStatus;
}
