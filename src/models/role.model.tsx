export const ROLE = {
	ADMIN: "Admin",
	USER: "User",
	SYSTEM: "System",
	MANAGER: "Manager",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const isAdminRole = (role?: string | null) => {
	if (!role) return false;
	const normalized = role.toLowerCase();
	return normalized === "admin" || normalized === "system";
};