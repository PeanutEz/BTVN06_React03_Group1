import { create } from "zustand";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { User } from "../models";
import { getCurrentUser, removeItem, setItem } from "../utils/localstorage.util";
import { logoutUser } from "../services/auth.service";

const AUTH_STORAGE_KEY = "auth-storage";

type AuthState = {
	user: User | null;
	token: string | null;
	isLoggedIn: boolean;
	isInitialized: boolean;
	login: (user: User) => void;
	loginWithTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
	logout: () => Promise<void>;
	hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	token: null,
	isLoggedIn: false,
	isInitialized: false,

	login: (user) => {
		setItem(LOCAL_STORAGE_KEY.AUTH_USER, user);
		set({ user, isLoggedIn: true });
	},

	loginWithTokens: ({ accessToken, refreshToken }) => {
		// Lưu theo format mà api.client.ts đọc: { state: { token: "..." } }
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { token: accessToken, refreshToken } }));
		set({ token: accessToken, isLoggedIn: true });
	},

	// [OLD] logout chỉ xóa localStorage, không gọi API
	// logout: () => {
	// 	removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
	// 	localStorage.removeItem(AUTH_STORAGE_KEY);
	// 	set({ user: null, token: null, isLoggedIn: false });
	// },

	logout: async () => {
		try {
			await logoutUser();
		} catch {
			// ignore lỗi API, vẫn clear local state
		}
		removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
		localStorage.removeItem(AUTH_STORAGE_KEY);
		set({ user: null, token: null, isLoggedIn: false });
	},

	hydrate: () => {
		const user = getCurrentUser();
		const raw = localStorage.getItem(AUTH_STORAGE_KEY);
		let token: string | null = null;
		if (raw) {
			try { token = JSON.parse(raw)?.state?.token ?? null; } catch { /* ignore */ }
		}
		set({ user, token, isLoggedIn: !!user || !!token, isInitialized: true });
	},
}));
