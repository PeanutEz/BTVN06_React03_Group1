import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import { getItem, removeItem, setItem } from "../utils/localstorage.util";
import type { Product } from "@/modules/product/types/product.type";

export type CartItem = {
  product: Pick<Product, "id" | "name" | "price" | "image" | "stock">;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isInitialized: boolean;

  // derived
  totalItems: () => number;
  totalPrice: () => number;

  // actions
  hydrate: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

function clampQuantity(qty: number, stock: number) {
  const safeQty = Number.isFinite(qty) ? qty : 1;
  return Math.max(1, Math.min(stock, safeQty));
}

function save(items: CartItem[]) {
  setItem(LOCAL_STORAGE_KEY.CART, items);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isInitialized: false,

  totalItems: () => get().items.reduce((sum, it) => sum + it.quantity, 0),
  totalPrice: () => get().items.reduce((sum, it) => sum + it.quantity * it.product.price, 0),

  hydrate: () => {
    const stored = getItem<CartItem[]>(LOCAL_STORAGE_KEY.CART) ?? [];
    set({ items: stored, isInitialized: true });
  },

  addToCart: (product, quantity = 1) => {
    const stock = Math.max(0, product.stock ?? 0);
    if (stock <= 0) return;

    const items = [...get().items];
    const idx = items.findIndex((it) => it.product.id === product.id);

    const snapshot: CartItem["product"] = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
    };

    if (idx >= 0) {
      const nextQty = clampQuantity(items[idx].quantity + quantity, snapshot.stock);
      items[idx] = { ...items[idx], product: snapshot, quantity: nextQty };
    } else {
      items.push({ product: snapshot, quantity: clampQuantity(quantity, snapshot.stock) });
    }

    save(items);
    set({ items });
  },

  removeFromCart: (productId) => {
    const items = get().items.filter((it) => it.product.id !== productId);
    save(items);
    set({ items });
  },

  setQuantity: (productId, quantity) => {
    const items = get().items.map((it) => {
      if (it.product.id !== productId) return it;
      return { ...it, quantity: clampQuantity(quantity, it.product.stock) };
    });
    save(items);
    set({ items });
  },

  clearCart: () => {
    removeItem(LOCAL_STORAGE_KEY.CART);
    set({ items: [] });
  },
}));
