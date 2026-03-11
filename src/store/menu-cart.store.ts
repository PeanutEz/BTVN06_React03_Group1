import { create } from "zustand";
import type { MenuCartItem, MenuItemOptions, MenuProduct } from "@/types/menu.types";
import { MENU_SIZES } from "@/types/menu.types";
import { getItem, setItem } from "@/utils/localstorage.util";

// Branch id bound to this cart session (cleared when branch changes)
let _boundBranchId: string | null = null;
export function getCartBranchId() { return _boundBranchId; }
export function setCartBranchId(id: string | null) { _boundBranchId = id; }

const STORAGE_KEY = "hylux_menu_cart";

function buildCartKey(productId: number, options: MenuItemOptions): string {
  const toppingIds = [...options.toppings].sort((a, b) => a.id.localeCompare(b.id)).map((t) => t.id).join(",");
  return `${productId}__${options.size}__${options.sugar}__${options.ice}__${toppingIds}`;
}

function calcUnitPrice(basePrice: number, options: MenuItemOptions): number {
  const sizeDelta = MENU_SIZES.find((s) => s.value === options.size)?.priceDelta ?? 0;
  const toppingTotal = options.toppings.reduce((s, t) => s + t.price, 0);
  return basePrice + sizeDelta + toppingTotal;
}

type MenuCartState = {
  items: MenuCartItem[];
  isInitialized: boolean;
  hydrate: () => void;
  addItem: (product: MenuProduct, options: MenuItemOptions, quantity: number) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  removeItem: (cartKey: string) => void;
  clearCart: () => void;
};

export const useMenuCartStore = create<MenuCartState>((set, get) => ({
  items: [],
  isInitialized: false,

  hydrate: () => {
    const saved = getItem<MenuCartItem[]>(STORAGE_KEY) || [];
    set({ items: saved, isInitialized: true });
  },

  addItem: (product, options, quantity) => {
    const cartKey = buildCartKey(product.id, options);
    const unitPrice = calcUnitPrice(product.price, options);
    const { items } = get();
    const existing = items.find((i) => i.cartKey === cartKey);

    const nextItems = existing
      ? items.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i,
        )
      : [
          ...items,
          {
            cartKey,
            productId: product.id,
            name: product.name,
            image: product.image,
            basePrice: product.price,
            options,
            quantity,
            unitPrice,
            note: options.note,
          } satisfies MenuCartItem,
        ];

    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  updateQuantity: (cartKey, quantity) => {
    const qty = Math.max(1, Math.floor(quantity));
    const nextItems = get().items.map((i) =>
      i.cartKey === cartKey ? { ...i, quantity: qty } : i,
    );
    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  removeItem: (cartKey) => {
    const nextItems = get().items.filter((i) => i.cartKey !== cartKey);
    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  clearCart: () => {
    setItem(STORAGE_KEY, []);
    set({ items: [] });
  },
}));

export function useMenuCartTotals(deliveryFeeOverride?: number) {
  const items = useMenuCartStore((s) => s.items);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  // deliveryFee is now driven by the delivery store (branch-based)
  // fallback to legacy logic only when no override provided (e.g. cart page without delivery context)
  const deliveryFee =
    deliveryFeeOverride !== undefined
      ? deliveryFeeOverride
      : subtotal > 0 && subtotal < 150000
      ? 25000
      : 0;
  const total = subtotal + deliveryFee;
  return { itemCount, subtotal, deliveryFee, total };
}
