import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "@/const/data.const";
import type { Product } from "@/models/product.model";
import { getItem, removeItem, setItem } from "@/utils/localstorage.util";

export type CartItem = {
  productId: number;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isInitialized: boolean;

  hydrate: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
};

function getProductPrice(product: Product) {
  // Client side currently uses legacy `price`. Fallback to min_price if needed.
  const p = product.price ?? product.min_price ?? 0;
  return Number.isFinite(p) ? p : 0;
}

function getProductImage(product: Product) {
  return product.image || product.image_url || "";
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isInitialized: false,

  hydrate: () => {
    const saved = getItem<CartItem[]>(LOCAL_STORAGE_KEY.CART) || [];
    set({ items: saved, isInitialized: true });
  },

  addToCart: (product, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    const { items } = get();
    const existing = items.find((x) => x.productId === product.id);

    const nextItems = existing
      ? items.map((x) =>
          x.productId === product.id
            ? { ...x, quantity: x.quantity + qty }
            : x,
        )
      : [
          ...items,
          {
            productId: product.id,
            name: product.name,
            image: getProductImage(product),
            price: getProductPrice(product),
            originalPrice: product.originalPrice,
            quantity: qty,
          },
        ];

    setItem(LOCAL_STORAGE_KEY.CART, nextItems);
    set({ items: nextItems });
  },

  updateQuantity: (productId, quantity) => {
    const qty = Math.max(1, Math.floor(quantity));
    const nextItems = get().items.map((x) =>
      x.productId === productId ? { ...x, quantity: qty } : x,
    );
    setItem(LOCAL_STORAGE_KEY.CART, nextItems);
    set({ items: nextItems });
  },

  removeFromCart: (productId) => {
    const nextItems = get().items.filter((x) => x.productId !== productId);
    setItem(LOCAL_STORAGE_KEY.CART, nextItems);
    set({ items: nextItems });
  },

  clearCart: () => {
    removeItem(LOCAL_STORAGE_KEY.CART);
    set({ items: [] });
  },
}));
