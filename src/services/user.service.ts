import type { User } from "../models";
import api from "./api";

export async function fetchUsers(): Promise<User[]> {
	const response = await api.get<User[]>("/users");
	return response.data ?? [];
}

export async function deleteUser(id: string): Promise<void> {
	await api.delete(`/users/${id}`);
}
