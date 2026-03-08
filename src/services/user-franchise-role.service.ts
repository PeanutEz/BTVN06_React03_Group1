import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";

// ==================== Types ====================

/** User-Franchise-Role item trả về từ API */
export interface UserFranchiseRole {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	franchise_id: string;
	franchise_code: string;
	franchise_name: string;
	role_id: string;
	role_code: string;
	role_name: string;
	user_id: string;
	user_name: string;
	user_email: string;
	note: string;
}

// ==================== USER-FRANCHISE-ROLE-02: Search Items by Conditions ====================
// POST /api/user-franchise-roles/search — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { searchCondition: { user_id, franchise_id, role_id, is_deleted }, pageInfo: { pageNum, pageSize } }
// Output: { success, data: UserFranchiseRole[], pageInfo }

export interface SearchUserFranchiseRolePayload {
	searchCondition: {
		user_id?: string;
		franchise_id?: string;
		role_id?: string;
		is_deleted?: boolean;
	};
	pageInfo: {
		pageNum: number;
		pageSize: number;
	};
}

export interface SearchUserFranchiseRoleResponse {
	success: boolean;
	data: UserFranchiseRole[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
}

export async function searchUserFranchiseRoles(
	payload: SearchUserFranchiseRolePayload,
): Promise<SearchUserFranchiseRoleResponse> {
	const response = await apiClient.post<SearchUserFranchiseRoleResponse>(
		"/user-franchise-roles/search",
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Tìm kiếm user-franchise-role thất bại");
	}
	return result;
}

// ==================== USER-FRANCHISE-ROLE-03: Get Item ====================
// GET /api/user-franchise-roles/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: UserFranchiseRole }

export async function getUserFranchiseRoleById(id: string): Promise<UserFranchiseRole> {
	const response = await apiClient.get<ApiResponse<UserFranchiseRole>>(
		`/user-franchise-roles/${id}`,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy thông tin user-franchise-role thất bại");
	}
	return (result as { data: UserFranchiseRole }).data;
}

// ==================== USER-FRANCHISE-ROLE-04: Update Item ====================
// PUT /api/user-franchise-roles/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { role_id: string (required), note?: string (default: "") }
// Output: { success: true, data: UserFranchiseRole }

export interface UpdateUserFranchiseRolePayload {
	role_id: string;
	note?: string;
}

export interface UpdateUserFranchiseRoleResponse {
	success: boolean;
	data: {
		id: string;
		is_active: boolean;
		is_deleted: boolean;
		created_at: string;
		updated_at: string;
		franchise_id: string;
		role_id: string;
		user_id: string;
		note: string;
	};
}

export async function updateUserFranchiseRole(
	id: string,
	payload: UpdateUserFranchiseRolePayload,
): Promise<UpdateUserFranchiseRoleResponse["data"]> {
	const response = await apiClient.put<UpdateUserFranchiseRoleResponse>(
		`/user-franchise-roles/${id}`,
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Cập nhật user-franchise-role thất bại");
	}
	return result.data;
}

// ==================== USER-FRANCHISE-ROLE-01: Create Item ====================
// POST /api/user-franchise-roles — Token: YES — Role: ADMIN
// Input: { user_id, role_id, franchise_id, note }
// Output: { success: true, data: UserFranchiseRole }

export interface CreateUserFranchiseRolePayload {
	user_id: string;
	role_id: string;
	franchise_id: string | null;
	note: string;
}

export async function createUserFranchiseRole(
	payload: CreateUserFranchiseRolePayload,
): Promise<UserFranchiseRole> {
	const response = await apiClient.post<ApiResponse<UserFranchiseRole>>(
		"/user-franchise-roles",
		payload,
	);
	const result = response.data;
	if (!result.success) {
		const msg = (result as { message?: string }).message || "Set role cho user thất bại";
		throw new Error(msg);
	}
	return (result as { data: UserFranchiseRole }).data;
}
