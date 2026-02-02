import type { User } from "../models";
import api from "./api";

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status;
};

export async function fetchUsers(): Promise<User[]> {
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
}

export async function deleteUser(id: string): Promise<void> {
	try {
		await api.delete(`/users/${id}`);
	} catch (error) {
		if (getErrorStatus(error) === 404) {
			await api.delete(`/user/${id}`);
			return;
		}
		throw error;
	}
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
