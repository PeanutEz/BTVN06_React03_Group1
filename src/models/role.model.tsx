export const ROLE = {
	ADMIN: "Admin",
	MANAGER: "Manager",
	STAFF: "Staff",
	SHIPPER: "Shipper",
	USER: "User",
	SYSTEM: "System",
	MANAGER: "Manager",
} as const;

export const ROLE_CODE = {
	ADMIN: "ADMIN",
	MANAGER: "MANAGER",
	STAFF: "STAFF",
	SHIPPER: "SHIPPER",
	USER: "USER",
} as const;

export const ROLE_SCOPE = {
	GLOBAL: "GLOBAL",
	FRANCHISE: "FRANCHISE",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
export type RoleCode = (typeof ROLE_CODE)[keyof typeof ROLE_CODE];
export type RoleScope = (typeof ROLE_SCOPE)[keyof typeof ROLE_SCOPE];

export const isAdminRole = (role?: string | null) => {
	if (!role) return false;
	const normalized = role.toLowerCase();
	return normalized === "admin";
};
