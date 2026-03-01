// ─── Delivery / Branch ordering types ───────────────────────────────────────

export type OrderMode = "DELIVERY" | "PICKUP";

export type DeliveryOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface BranchOpeningHours {
  open: string;   // "07:00"
  close: string;  // "22:00"
  days: string;   // "Thứ 2 – Chủ nhật"
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  coord: GeoCoord;
  deliveryRadiusKm: number;   // delivery coverage radius
  baseDeliveryFee: number;    // base fee in VND
  extraFeePerKm: number;      // extra fee per km over 1 km
  freeShippingThreshold: number; // order value for free delivery
  prepTimeMins: number;       // base preparation time (minutes)
  deliveryTimeMins: number;   // estimated delivery time (minutes)
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

export type PaymentMethod = "CASH" | "BANK" | "MOMO" | "ZALOPAY" | "SHOPEEPAY";

export interface AppliedPromo {
  code: string;
  label: string;
  discountAmount: number;
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
  PENDING:    { label: "Chờ xác nhận",   color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200",  icon: "⏳", description: "Đơn hàng đang chờ cửa hàng xác nhận" },
  CONFIRMED:  { label: "Đã xác nhận",    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",      icon: "✅", description: "Cửa hàng đã nhận đơn, chuẩn bị pha chế" },
  PREPARING:  { label: "Đang pha chế",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",  icon: "☕", description: "Đồ uống đang được pha chế" },
  READY:      { label: "Sẵn sàng lấy",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",icon: "🛍️", description: "Đơn hàng đã sẵn sàng, bạn có thể đến lấy" },
  DELIVERING: { label: "Đang giao",      color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",  icon: "🛵", description: "Đơn hàng đang trên đường giao đến bạn" },
  COMPLETED:  { label: "Hoàn thành",     color: "text-green-700",   bg: "bg-green-50 border-green-200",    icon: "🎉", description: "Đơn hàng đã giao thành công!" },
  CANCELLED:  { label: "Đã huỷ",        color: "text-red-700",     bg: "bg-red-50 border-red-200",        icon: "❌", description: "Đơn hàng đã bị huỷ" },
};

export const DELIVERY_STATUS_STEPS: DeliveryOrderStatus[] = [
  "PENDING", "CONFIRMED", "PREPARING", "DELIVERING", "COMPLETED",
];
export const PICKUP_STATUS_STEPS: DeliveryOrderStatus[] = [
  "PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED",
];
