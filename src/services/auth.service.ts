import type { AuthCredentials, User } from "../models";
import api from "./api";

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

export async function loginUser(credentials: AuthCredentials): Promise<User | null> {
	const users = await fetchUsersWithFallback();
	const match = users.find(
		(user) => user.email.toLowerCase() === credentials.email.toLowerCase() && user.password === credentials.password,
	);

	return match ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const users = await fetchUsersWithFallback();
	const match = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
	return match ?? null;
}

export async function registerUser(payload: Pick<User, "name" | "email" | "password">): Promise<User> {
	const existing = await findUserByEmail(payload.email);
	if (existing) {
		throw new Error("EMAIL_EXISTS");
	}

	const now = new Date().toISOString();
	try {
		const response = await api.post<User>("/users", {
			name: payload.name,
			email: payload.email,
			password: payload.password,
			role: "User",
			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=random`,
			createDate: now,
			updateDate: now,
		});
		return response.data;
	} catch (error) {
		if (getErrorStatus(error) === 404) {
			const response = await api.post<User>("/user", {
				name: payload.name,
				email: payload.email,
				password: payload.password,
				role: "User",
				avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=random`,
				createDate: now,
				updateDate: now,
			});
			return response.data;
		}
		throw error;
	}
}

export async function requestPasswordReset(email: string): Promise<boolean> {
	const existing = await findUserByEmail(email);
	return !!existing;
}

export async function resetPasswordByEmail(email: string, newPassword: string): Promise<boolean> {
	const existing = await findUserByEmail(email);
	if (!existing) {
		return false;
	}

	const now = new Date().toISOString();
	try {
		await api.put(`/users/${existing.id}`, {
			...existing,
			password: newPassword,
			updateDate: now,
		});
	} catch (error) {
		if (getErrorStatus(error) === 404) {
			await api.put(`/user/${existing.id}`, {
				...existing,
				password: newPassword,
				updateDate: now,
			});
		} else {
			throw error;
		}
	}

	return true;
}
