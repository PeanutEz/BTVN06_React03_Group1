import type { AuthCredentials, User } from "../models";
import api from "./api";

export async function loginUser(credentials: AuthCredentials): Promise<User | null> {
	const response = await api.get<User[]>("/users");
	const match = response.data.find(
		(user) => user.email.toLowerCase() === credentials.email.toLowerCase() && user.password === credentials.password,
	);

	return match ?? null;
}
