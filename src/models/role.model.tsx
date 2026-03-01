export const ROLE = {
	ADMIN: "Admin",
	USER: "User",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const isAdminRole = (role?: string | null) => role?.toLowerCase() === ROLE.ADMIN.toLowerCase();
