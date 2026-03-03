import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { FranchiseSelectItem } from "../services/store.service";

type FranchiseState = {
	franchises: FranchiseSelectItem[];
	isLoaded: boolean;
	selectedFranchise: FranchiseSelectItem | null;
	setFranchises: (franchises: FranchiseSelectItem[]) => void;
	setSelectedFranchise: (franchise: FranchiseSelectItem | null) => void;
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
	selectedFranchise: null,

	setFranchises: (franchises) => {
		localStorage.setItem(LOCAL_STORAGE_KEY.FRANCHISES, JSON.stringify(franchises));
		set({ franchises, isLoaded: true });
	},

	setSelectedFranchise: (franchise) => {
		if (franchise) {
			localStorage.setItem(LOCAL_STORAGE_KEY.SELECTED_FRANCHISE, JSON.stringify(franchise));
		} else {
			localStorage.removeItem(LOCAL_STORAGE_KEY.SELECTED_FRANCHISE);
		}
		set({ selectedFranchise: franchise });
	},

	clear: () => {
		localStorage.removeItem(LOCAL_STORAGE_KEY.FRANCHISES);
		localStorage.removeItem(LOCAL_STORAGE_KEY.SELECTED_FRANCHISE);
		set({ franchises: [], isLoaded: false, selectedFranchise: null });
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
		const selectedRaw = localStorage.getItem(LOCAL_STORAGE_KEY.SELECTED_FRANCHISE);
		let selectedFranchise: FranchiseSelectItem | null = null;
		if (selectedRaw) {
			try {
				selectedFranchise = JSON.parse(selectedRaw);
			} catch {
				selectedFranchise = null;
			}
		}
		set({ franchises, isLoaded: franchises.length > 0, selectedFranchise });
	},

	getById: (id: string) => {
		return get().franchises.find((f) => f.value === id);
	},

	getByCode: (code: string) => {
		return get().franchises.find((f) => f.code === code);
	},
}));
