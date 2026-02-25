export type MenuSize = "S" | "M" | "L";
export type SugarLevel = "0%" | "25%" | "50%" | "75%" | "100%";
export type IceLevel = "Không đá" | "Ít đá" | "Đá vừa" | "Đá nhiều";

export interface Topping {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

export interface MenuItemOptions {
  size: MenuSize;
  sugar: SugarLevel;
  ice: IceLevel;
  toppings: Topping[];
  note?: string;
}

export interface MenuCartItem {
  cartKey: string;
  productId: number;
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
