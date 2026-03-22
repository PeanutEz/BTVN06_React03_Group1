import type { Role } from "./role.model";

export type User = {
	id: string;
	name: string;
	email: string;
	password: string;
	role: Role;
	avatar: string;
	createDate: string;
	updateDate: string;
};

export type AuthCredentials = {
	email: string;
	password: string;
};
