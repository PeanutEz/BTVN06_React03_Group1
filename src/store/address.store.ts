import { create } from "zustand";
import { getItem, setItem } from "@/utils/localstorage.util";

const STORAGE_KEY = "hylux_address_book";

export interface SavedAddress {
  id: number;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface AddressState {
  addresses: SavedAddress[];
  add: (data: { name: string; phone: string; address: string }) => void;
  update: (id: number, data: { name: string; phone: string; address: string }) => void;
  remove: (id: number) => void;
  setDefault: (id: number) => void;
}

function persist(addresses: SavedAddress[]) {
  setItem(STORAGE_KEY, addresses);
}

function load(): SavedAddress[] {
  return getItem<SavedAddress[]>(STORAGE_KEY) ?? [];
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: load(),

  add(data) {
    const next: SavedAddress[] = [
      ...get().addresses,
      { id: Date.now(), ...data, isDefault: get().addresses.length === 0 },
    ];
    persist(next);
    set({ addresses: next });
  },

  update(id, data) {
    const next = get().addresses.map((a) => (a.id === id ? { ...a, ...data } : a));
    persist(next);
    set({ addresses: next });
  },

  remove(id) {
    const rest = get().addresses.filter((a) => a.id !== id);
    if (rest.length > 0 && !rest.some((a) => a.isDefault)) rest[0].isDefault = true;
    persist(rest);
    set({ addresses: rest });
  },

  setDefault(id) {
    const next = get().addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    persist(next);
    set({ addresses: next });
  },
}));
