import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { UserProfile } from "../services/auth.service";

type AuthState = {
	user: UserProfile | null;
	isLoggedIn: boolean;
	isInitialized: boolean;
	login: (user: UserProfile) => void;
	logout: () => void;
	setUser: (user: UserProfile) => void;
	hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoggedIn: false,
	isInitialized: false,

	login: (user) => {
		localStorage.setItem(LOCAL_STORAGE_KEY.AUTH_USER, JSON.stringify(user));
		set({ user, isLoggedIn: true });
	},

	setUser: (user) => {
		localStorage.setItem(LOCAL_STORAGE_KEY.AUTH_USER, JSON.stringify(user));
		set({ user });
	},

	logout: () => {
		localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
		set({ user: null, isLoggedIn: false });
	},

	hydrate: () => {
		const userRaw = localStorage.getItem(LOCAL_STORAGE_KEY.AUTH_USER);
		let user: UserProfile | null = null;
		if (userRaw) {
			try {
				user = JSON.parse(userRaw);
			} catch {
				user = null;
			}
		}
		set({ user, isLoggedIn: !!user, isInitialized: true });
	},
}));
