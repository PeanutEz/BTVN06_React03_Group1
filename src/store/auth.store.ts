import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { User } from "../models";
import { getCurrentUser, removeItem, setItem } from "../utils/localstorage.util";

type AuthState = {
	user: User | null;
	isLoggedIn: boolean;
	isInitialized: boolean;
	login: (user: User) => void;
	logout: () => void;
	hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoggedIn: false,
	isInitialized: false,

	login: (user) => {
		setItem(LOCAL_STORAGE_KEY.AUTH_USER, user);
		set({ user, isLoggedIn: true });
	},

	logout: () => {
		removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
		set({ user: null, isLoggedIn: false });
	},

	hydrate: () => {
		const user = getCurrentUser();
		set({ user, isLoggedIn: !!user, isInitialized: true });
	},
}));
