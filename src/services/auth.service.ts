import type { AuthCredentials, User } from "../models";
import api from "./api";
import { requestWithUserResource } from "./user.resource";

export async function loginUser(credentials: AuthCredentials): Promise<User | null> {
	const users = await requestWithUserResource(async (resource) => {
		const response = await api.get<User[]>(resource);
		return response.data;
	});
	const match = users.find(
		(user) => user.email.toLowerCase() === credentials.email.toLowerCase() && user.password === credentials.password,
	);

	return match ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const users = await requestWithUserResource(async (resource) => {
		const response = await api.get<User[]>(resource);
		return response.data;
	});
	const match = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
	return match ?? null;
}

export async function registerUser(payload: Pick<User, "name" | "email" | "password">): Promise<User> {
	const existing = await findUserByEmail(payload.email);
	if (existing) {
		throw new Error("EMAIL_EXISTS");
	}

	const now = new Date().toISOString();
	return requestWithUserResource(async (resource) => {
		const response = await api.post<User>(resource, {
			name: payload.name,
			email: payload.email,
			password: payload.password,
			role: "User",
			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=random`,
			createDate: now,
			updateDate: now,
		});
		return response.data;
	});
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
	await requestWithUserResource(async (resource) => {
		await api.put(`${resource}/${existing.id}`, {
			...existing,
			password: newPassword,
			updateDate: now,
		});
		return true;
	});

	return true;
}
