import type { User } from "../models";
import api from "./api";
import { requestWithUserResource } from "./user.resource";

export async function fetchUsers(): Promise<User[]> {
	return requestWithUserResource(async (resource) => {
		const response = await api.get<User[]>(resource);
		return response.data ?? [];
	});
}

export async function deleteUser(id: string): Promise<void> {
	await requestWithUserResource(async (resource) => {
		await api.delete(`${resource}/${id}`);
		return true;
	});
}

export async function updateUserProfile(
	id: string,
	data: Partial<User>
): Promise<User> {
	return requestWithUserResource(async (resource) => {
		const response = await api.put<User>(`${resource}/${id}`, data);
		return response.data ?? {};
	});
}
