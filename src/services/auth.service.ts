import type { AuthCredentials, User } from "../models";
import api from "./api";
import apiClient from "./api.client";

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status;
};

const fetchUsersWithFallback = async (): Promise<User[]> => {
	try {
		const response = await api.get<User[]>("/users");
		return response.data ?? [];
	} catch (error) {
		if (getErrorStatus(error) === 404) {
			const response = await api.get<User[]>("/user");
			return response.data ?? [];
		}
		throw error;
	}
};

// [OLD] loginUser dùng mock API
// export async function loginUser(credentials: AuthCredentials): Promise<User | null> {
// 	const users = await fetchUsersWithFallback();
// 	const match = users.find(
// 		(user) => user.email.toLowerCase() === credentials.email.toLowerCase() && user.password === credentials.password,
// 	);
// 	return match ?? null;
// }

export async function loginUser(credentials: AuthCredentials): Promise<{ accessToken: string; refreshToken: string }> {
	const response = await apiClient.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>("/auth/login-swagger", {
		email: credentials.email,
		password: credentials.password,
	});

	if (!response.data.success) {
		throw new Error("LOGIN_FAILED");
	}

	return response.data.data;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const users = await fetchUsersWithFallback();
	const match = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
	return match ?? null;
}

// [OLD] registerUser dùng mock API
// export async function registerUser(payload: Pick<User, "name" | "email" | "password">): Promise<User> {
// 	const existing = await findUserByEmail(payload.email);
// 	if (existing) {
// 		throw new Error("EMAIL_EXISTS");
// 	}
// 	const now = new Date().toISOString();
// 	try {
// 		const response = await api.post<User>("/users", {
// 			name: payload.name,
// 			email: payload.email,
// 			password: payload.password,
// 			role: "User",
// 			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=random`,
// 			createDate: now,
// 			updateDate: now,
// 		});
// 		return response.data;
// 	} catch (error) {
// 		if (getErrorStatus(error) === 404) {
// 			const response = await api.post<User>("/user", {
// 				name: payload.name,
// 				email: payload.email,
// 				password: payload.password,
// 				role: "User",
// 				avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=random`,
// 				createDate: now,
// 				updateDate: now,
// 			});
// 			return response.data;
// 		}
// 		throw error;
// 	}
// }

export async function registerUser(payload: Pick<User, "name" | "email" | "password">): Promise<{ _id: string; email: string; is_verified: boolean }> {
	const response = await apiClient.post<{ success: boolean; data: { _id: string; email: string; is_verified: boolean; created_at: string; updated_at: string } }>("/auth/register", {
		email: payload.email,
		password: payload.password,
	});

	if (!response.data.success) {
		throw new Error("REGISTER_FAILED");
	}

	return response.data.data;
}

export async function logoutUser(): Promise<void> {
	await apiClient.post("/auth/logout");
}

// [OLD] requestPasswordReset & resetPasswordByEmail dùng mock API
// export async function requestPasswordReset(email: string): Promise<boolean> {
// 	const existing = await findUserByEmail(email);
// 	return !!existing;
// }
//
// export async function resetPasswordByEmail(email: string, newPassword: string): Promise<boolean> {
// 	const existing = await findUserByEmail(email);
// 	if (!existing) return false;
// 	const now = new Date().toISOString();
// 	try {
// 		await api.put(`/users/${existing.id}`, { ...existing, password: newPassword, updateDate: now });
// 	} catch (error) {
// 		if (getErrorStatus(error) === 404) {
// 			await api.put(`/user/${existing.id}`, { ...existing, password: newPassword, updateDate: now });
// 		} else { throw error; }
// 	}
// 	return true;
// }

export async function forgotPassword(email: string): Promise<void> {
	const response = await apiClient.put<{ success: boolean; data: null }>("/auth/forgot-password", { email });
	if (!response.data.success) {
		throw new Error("FORGOT_PASSWORD_FAILED");
	}
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
	const response = await apiClient.put<{ success: boolean; data: null }>("/auth/change-password", {
		old_password: oldPassword,
		new_password: newPassword,
	});
	if (!response.data.success) {
		throw new Error("CHANGE_PASSWORD_FAILED");
	}
}
