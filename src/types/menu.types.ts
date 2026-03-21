export type MenuSize = "S" | "M" | "L";
export type SugarLevel = "0%" | "25%" | "50%" | "75%" | "100%";
export type IceLevel = "Không đá" | "Ít đá" | "Đá vừa" | "Đá nhiều";

export interface Topping {
  id: string;
  name: string;
  price: number;
  emoji: string;
  product_franchise_id?: string; // Optional: từ API khi fetch topping products
}

export interface MenuItemOptions {
  size: MenuSize;
  sugar: SugarLevel;
  ice: IceLevel;
  toppings: Topping[];
  note?: string;

  // Used to keep track which franchise a cart item belongs to.
  // Important when user switches franchise and adds products again.
  franchiseId?: string;
  franchiseName?: string;

  // API-level product-franchise id (per size) - may be helpful for debugging
  // and for correct cart key separation.
  productFranchiseId?: string;
}

export interface MenuCartItem {
  cartKey: string;
  productId: number;
  /**
   * Metadata required for reusing MenuProductModal to fetch real sizes/toppings from API.
   * These are stored when adding item from menu.
   */
  apiFranchiseId?: string;
  apiProductId?: string;
  apiCategoryName?: string;
  apiSizes?: unknown[];
  name: string;
  image: string;
  basePrice: number;
  options: MenuItemOptions;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface MenuCategory {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string;
}

export interface MenuProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  content: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  categoryId: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

export interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  note: string;
  paymentMethod: "CASH" | "BANK";
}

export const MENU_SIZES: { value: MenuSize; label: string; priceDelta: number }[] = [
  { value: "S", label: "Nhỏ (S)", priceDelta: 0 },
  { value: "M", label: "Vừa (M)", priceDelta: 5000 },
  { value: "L", label: "Lớn (L)", priceDelta: 10000 },
];

export const SUGAR_LEVELS: SugarLevel[] = ["0%", "25%", "50%", "75%", "100%"];
export const ICE_LEVELS: IceLevel[] = ["Không đá", "Ít đá", "Đá vừa", "Đá nhiều"];

export const TOPPINGS: Topping[] = [
  { id: "pearl", name: "Trân châu", price: 8000, emoji: "🫧" },
  { id: "jelly", name: "Thạch", price: 6000, emoji: "🟩" },
  { id: "cheese", name: "Cheese foam", price: 12000, emoji: "🧀" },
  { id: "shot", name: "Extra shot", price: 10000, emoji: "☕" },
  { id: "coconut", name: "Thạch dừa", price: 7000, emoji: "🥥" },
  { id: "pudding", name: "Pudding trứng", price: 9000, emoji: "🍮" },
];
