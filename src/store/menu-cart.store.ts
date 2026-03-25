import { create } from "zustand";
import type { MenuCartItem, MenuItemOptions, MenuProduct } from "@/types/menu.types";
import { getItem, setItem } from "@/utils/localstorage.util";

// Branch id bound to this cart session (cleared when branch changes)
let _boundBranchId: string | null = null;
export function getCartBranchId() { return _boundBranchId; }
export function setCartBranchId(id: string | null) { _boundBranchId = id; }

const STORAGE_KEY = "hylux_menu_cart";
const CART_ID_KEY = "hylux_cart_id";
const CART_IDS_KEY = "hylux_cart_ids";

function buildCartKey(productId: number, options: MenuItemOptions): string {
  const toppingIds = [...options.toppings].sort((a, b) => a.id.localeCompare(b.id)).map((t) => t.id).join(",");
  return `${productId}__${options.franchiseId ?? ""}__${options.productFranchiseId ?? ""}__${options.size}__${options.sugar}__${options.ice}__${toppingIds}`;
}

function calcUnitPrice(basePrice: number, options: MenuItemOptions): number {
  const toppingTotal = options.toppings.reduce((s, t) => s + t.price, 0);
  return basePrice + toppingTotal;
}

/** One cart per franchise; used for multi-franchise checkout. */
export type CartEntry = { cartId: string; franchise_id?: string; franchise_name?: string };

type MenuCartState = {
  items: MenuCartItem[];
  isInitialized: boolean;
  cartId: string | null;
  cartIds: string[];
  carts: CartEntry[];
  hydrate: () => void;
  clearItemsOnly: () => void;
  addItem: (product: MenuProduct, options: MenuItemOptions, quantity: number) => void;
  replaceItemAt: (replaceCartKey: string, product: MenuProduct, options: MenuItemOptions, quantity: number) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  removeItem: (cartKey: string) => void;
  clearCart: () => void;
  setCartId: (id: string | null) => void;
  setCarts: (entries: CartEntry[]) => void;
  removeCartId: (cartId: string) => void;
  /** Xóa 1 item local trùng với item API (để đồng bộ khi xóa ở checkout). */
  removeLocalItemByApiMatch: (apiFranchiseId: string, productFranchiseId: string, size?: string) => void;
};

function toCartEntry(raw: { _id?: string; id?: string; franchise_id?: string; franchise_name?: string }): CartEntry {
  const cartId = String(raw._id ?? raw.id ?? "");
  return { cartId, franchise_id: raw.franchise_id, franchise_name: raw.franchise_name };
}

export const useMenuCartStore = create<MenuCartState>((set, get) => ({
  items: [],
  isInitialized: false,
  cartId: null,
  cartIds: [],
  carts: [],

  setCartId: (id) => {
    setItem(CART_ID_KEY, id);
    const carts = id ? [toCartEntry({ _id: id, id })] : [];
    set({ cartId: id, cartIds: id ? [id] : [], carts });
  },

  setCarts: (entries) => {
    const cartIds = entries.map((e) => e.cartId).filter(Boolean);
    const first = cartIds[0] ?? null;
    setItem(CART_ID_KEY, first);
    setItem(CART_IDS_KEY, cartIds);
    set({ carts: entries, cartIds, cartId: first });
  },

  removeCartId: (cartIdToRemove) => {
    const { carts, cartIds } = get();
    const nextCarts = carts.filter((c) => c.cartId !== cartIdToRemove);
    const nextIds = cartIds.filter((id) => id !== cartIdToRemove);
    const nextFirst = nextIds[0] ?? null;
    setItem(CART_ID_KEY, nextFirst);
    setItem(CART_IDS_KEY, nextIds);
    set({ carts: nextCarts, cartIds: nextIds, cartId: nextFirst });
  },

  hydrate: () => {
    const saved = getItem<MenuCartItem[]>(STORAGE_KEY) || [];
    const savedCartId = getItem<string>(CART_ID_KEY) || null;
    const savedIds = getItem<string[]>(CART_IDS_KEY) || (savedCartId ? [savedCartId] : []);
    set({ items: saved, cartId: savedCartId, cartIds: savedIds, carts: savedIds.map((id) => ({ cartId: id })), isInitialized: true });
  },

  clearItemsOnly: () => {
    setItem(STORAGE_KEY, []);
    set({ items: [] });
  },

  addItem: (product, options, quantity) => {
    const cartKey = buildCartKey(product.id, options);
    const unitPrice = calcUnitPrice(product.price, options);
    const { items } = get();
    const existing = items.find((i) => i.cartKey === cartKey);
    const nextItems = existing
      ? items.map((i) => (i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i))
      : [
          ...items,
          {
            cartKey,
            productId: product.id,
            name: product.name,
            image: product.image,
            basePrice: product.price,
            apiFranchiseId: (product as any)._apiFranchiseId,
            apiProductId: (product as any)._apiProductId,
            apiCategoryName: (product as any)._apiCategoryName,
            apiSizes: (product as any)._apiSizes,
            options,
            quantity,
            unitPrice,
            note: options.note,
          } satisfies MenuCartItem,
        ];
    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  replaceItemAt: (replaceCartKey, product, options, quantity) => {
    const nextCartKey = buildCartKey(product.id, options);
    const unitPrice = calcUnitPrice(product.price, options);
    const { items } = get();
    const oldIndex = items.findIndex((i) => i.cartKey === replaceCartKey);
    if (oldIndex < 0) {
      const cartKey = nextCartKey;
      const existing = items.find((i) => i.cartKey === cartKey);
      const nextItems = existing
        ? items.map((i) => (i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i))
        : [
            ...items,
            {
              cartKey,
              productId: product.id,
              name: product.name,
              image: product.image,
              basePrice: product.price,
              apiFranchiseId: (product as any)._apiFranchiseId,
              apiProductId: (product as any)._apiProductId,
              apiCategoryName: (product as any)._apiCategoryName,
              apiSizes: (product as any)._apiSizes,
              options,
              quantity,
              unitPrice,
              note: options.note,
            } satisfies MenuCartItem,
          ];
      setItem(STORAGE_KEY, nextItems);
      set({ items: nextItems });
      return;
    }
    const nextItems = [...items];
    const newItem: MenuCartItem = {
      cartKey: nextCartKey,
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      apiFranchiseId: (product as any)._apiFranchiseId,
      apiProductId: (product as any)._apiProductId,
      apiCategoryName: (product as any)._apiCategoryName,
      apiSizes: (product as any)._apiSizes,
      options,
      quantity,
      unitPrice,
      note: options.note,
    } satisfies MenuCartItem;
    const existingIndex = nextItems.findIndex((i, idx) => i.cartKey === nextCartKey && idx !== oldIndex);
    if (existingIndex >= 0) {
      nextItems[existingIndex] = { ...nextItems[existingIndex], quantity: nextItems[existingIndex].quantity + quantity };
      nextItems.splice(oldIndex, 1);
    } else {
      nextItems[oldIndex] = newItem;
    }
    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  updateQuantity: (cartKey, quantity) => {
    const qty = Math.max(1, Math.floor(quantity));
    const nextItems = get().items.map((i) => (i.cartKey === cartKey ? { ...i, quantity: qty } : i));
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
    setItem(CART_ID_KEY, null);
    setItem(CART_IDS_KEY, []);
    set({ items: [], cartId: null, cartIds: [], carts: [] });
  },

  removeLocalItemByApiMatch: (apiFranchiseId, productFranchiseId, size) => {
    const { items } = get();
    const idx = items.findIndex(
      (i) =>
        (i as any).apiFranchiseId === apiFranchiseId &&
        (i.options as any)?.productFranchiseId === productFranchiseId &&
        (!size || String((i.options as any)?.size ?? "").trim().toUpperCase() === String(size).trim().toUpperCase()),
    );
    if (idx < 0) return;
    const nextItems = items.filter((_, i) => i !== idx);
    setItem(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },
}));

export function useMenuCartTotals(deliveryFeeOverride?: number) {
  const items = useMenuCartStore((s) => s.items);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const deliveryFee =
    deliveryFeeOverride !== undefined
      ? deliveryFeeOverride
      : subtotal > 0 && subtotal < 150000
      ? 25000
      : 0;
  const total = subtotal + deliveryFee;
  return { itemCount, subtotal, deliveryFee, total };
}
