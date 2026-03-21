import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { FranchiseSelectItem } from "../services/store.service";

type FranchiseState = {
	franchises: FranchiseSelectItem[];
	isLoaded: boolean;
	setFranchises: (franchises: FranchiseSelectItem[]) => void;
	clear: () => void;
	hydrate: () => void;
	/** Tìm franchise theo value (id) */
	getById: (id: string) => FranchiseSelectItem | undefined;
	/** Tìm franchise theo code */
	getByCode: (code: string) => FranchiseSelectItem | undefined;
};

export const useFranchiseStore = create<FranchiseState>((set, get) => ({
	franchises: [],
	isLoaded: false,

	setFranchises: (franchises) => {
		localStorage.setItem(LOCAL_STORAGE_KEY.FRANCHISES, JSON.stringify(franchises));
		set({ franchises, isLoaded: true });
	},

	clear: () => {
		localStorage.removeItem(LOCAL_STORAGE_KEY.FRANCHISES);
		set({ franchises: [], isLoaded: false });
	},

	hydrate: () => {
		const raw = localStorage.getItem(LOCAL_STORAGE_KEY.FRANCHISES);
		let franchises: FranchiseSelectItem[] = [];
		if (raw) {
			try {
				franchises = JSON.parse(raw);
			} catch {
				franchises = [];
			}
		}
		set({ franchises, isLoaded: franchises.length > 0 });
	},

	getById: (id: string) => {
		return get().franchises.find((f) => f.value === id);
	},

	getByCode: (code: string) => {
		return get().franchises.find((f) => f.code === code);
	},
}));
