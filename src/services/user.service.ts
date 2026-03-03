import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";

// ==================== Types ====================

/** User trả về từ API */
export interface ApiUser {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	email: string;
	name: string;
	phone: string;
	avatar_url: string;
	is_verified: boolean;
	role?: string;
	[key: string]: unknown;
}

/** Role item từ API ROLE-01: GET /api/roles/select */
export interface RoleSelectItem {
	value: string;
	code: string;
	name: string;
	scope: string;
}

/** Payload update user — USER-04: PUT /api/users/:id */
export interface UpdateUserPayload {
	name?: string;
	email?: string;
	phone?: string;
	avatar_url?: string;
	is_active?: boolean;
}

// ==================== ROLE-01: Get Select Items ====================
export async function fetchRoles(): Promise<RoleSelectItem[]> {
	const response = await apiClient.get<ApiResponse<RoleSelectItem[]>>("/roles/select");
	const result = response.data;
	if (!result.success) {
		throw new Error(result.message || "Lấy danh sách role thất bại");
	}
	return (result as { data: RoleSelectItem[] }).data;
}

// ==================== USER-04: Update Item ====================
export async function updateUser(id: string, data: UpdateUserPayload): Promise<ApiUser> {
	const response = await apiClient.put<ApiResponse<ApiUser>>(`/users/${id}`, data);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Cập nhật user thất bại");
	}
	return (result as { data: ApiUser }).data;
}

export const updateUserProfile = updateUser;
